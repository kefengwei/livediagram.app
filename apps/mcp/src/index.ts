// livediagram MCP server (docs/specs/015-api/mcp-server.md) — a standalone Cloudflare Worker fronted by
// Hono. POST /mcp carries the Streamable-HTTP MCP transport (stateless, JSON
// responses), Bearer-gated; tools reach the api worker over the API service
// binding, forwarding the caller's `Authorization: Bearer lvd_…`. OAuth 2.1
// endpoints mount alongside (added in the OAuth step).
import { bearerTokenOf } from '@livediagram/api-schema';
import { WebStandardStreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js';
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import type { Env } from './env';
import { buildServer } from './server';
import { MCP_BASE_PATH, registerOauthRoutes } from './oauth';
import { runInRequest } from './request-scope';

export type { Env };

const app = new Hono<{ Bindings: Env }>();

// A deployment can mount the MCP under a path on the site's own host (the
// self-hosted default: http://127.0.0.1:8099/mcp) instead of giving it a whole
// origin (the hosted one: mcp.livediagram.app). Every route below is registered
// ONCE, at the root — this rewrite makes the prefix an alias rather than a second
// implementation, so a client that learned either URL keeps working and the two
// cannot drift. `/mcp` itself is the transport endpoint and is left untouched.
app.use('*', async (c, next) => {
  const url = new URL(c.req.url);
  if (!url.pathname.startsWith(`${MCP_BASE_PATH}/`)) return next();
  url.pathname = url.pathname.slice(MCP_BASE_PATH.length);
  const rewritten = new Request(url, c.req.raw);
  // Hono's `executionCtx` getter throws when the runtime supplied none (a unit
  // test calling app.fetch directly), so read it defensively — and never wrap the
  // dispatch itself in the try, or a handler's own throw would be retried.
  const ctx = (() => {
    try {
      return c.executionCtx;
    } catch {
      return undefined;
    }
  })();
  return app.fetch(rewritten, c.env, ctx);
});

// MCP clients call from arbitrary origins; the Bearer token is the
// authorization, not the origin, so CORS is permissive.
app.use(
  '*',
  cors({
    origin: '*',
    allowHeaders: ['Authorization', 'Content-Type', 'Mcp-Session-Id', 'Mcp-Protocol-Version'],
    exposeHeaders: ['Mcp-Session-Id'],
  }),
);

app.get('/health', (c) => c.json({ status: 'ok' }));

// OAuth 2.1 discovery / register / authorize / complete / token (docs/specs/015-api/mcp-server.md §3).
registerOauthRoutes(app);

// The MCP Streamable-HTTP transport. Stateless (no session id) with JSON
// responses, which suits a per-request Worker: build a fresh server + transport,
// connect, and let the transport turn the request into a response.
app.all('/mcp', async (c) => {
  const token = bearerTokenOf(c.req.header('Authorization'));
  if (!token) {
    // Point MCP clients at the OAuth resource metadata so they can start the
    // connect flow (the metadata endpoint lands with the OAuth step). The
    // origin comes from the request, like every endpoint in oauth.ts, so a
    // self-hosted worker sends clients to ITS metadata, not livediagram.app's.
    // RFC 9728 §3: the metadata for a resource WITH a path is served at the
    // well-known URI with that path appended. Handing the client the exact URL
    // means it never has to probe or guess, whichever way this deployment mounts
    // the MCP.
    const origin = new URL(c.req.url).origin;
    return c.json({ error: 'unauthorized' }, 401, {
      'WWW-Authenticate': `Bearer resource_metadata="${origin}/.well-known/oauth-protected-resource/mcp"`,
    });
  }
  const server = buildServer(c.env);
  const transport = new WebStandardStreamableHTTPServerTransport({
    sessionIdGenerator: undefined,
    enableJsonResponse: true,
  });
  await server.connect(transport);
  // Tools post telemetry fire-and-forget; the request's waitUntil keeps those
  // posts alive past the response (request-scope.ts).
  return runInRequest(requestWaitUntil(c), () =>
    transport.handleRequest(c.req.raw, {
      authInfo: { token, clientId: 'mcp', scopes: [] },
    }),
  );
});

// Hono's `executionCtx` throws when the runtime supplied none (a unit test
// calling app.fetch without one), so read it defensively.
function requestWaitUntil(c: {
  readonly executionCtx: { waitUntil(promise: Promise<unknown>): void };
}): ((promise: Promise<unknown>) => void) | null {
  try {
    const ctx = c.executionCtx;
    return (promise) => ctx.waitUntil(promise);
  } catch {
    return null;
  }
}

export default app;
