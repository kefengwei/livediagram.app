import { readFileSync, statSync } from 'node:fs';
import { extname, normalize, resolve, sep } from 'node:path';

// The five static apps, served by the app process
// (docs/specs/016-platform/blueprints/self-hosted-runtime.md, "Static apps and
// routing").
//
// This is the router worker's job in the hosted deployment, and it lives here for
// the same reason the room's HTTP contract does: the rules — strip \`/live\`, send
// every \`/document/<id>\` to the one statically-built placeholder page, fall back to
// an app's index.html — are the application's, not the proxy's. Caddy terminates
// TLS and forwards; it does not restate a routing table that lives in code.

/** Where each app's \`out/\` directory sits under the static root. */
const APPS = ['marketing', 'live', 'telemetry', 'help', 'community'] as const;

/** The first path segment that belongs to the editor rather than to marketing. */
const EDITOR_PREFIXES = [
  'document',
  'explorer',
  'new',
  'join',
  'sign-in',
  'get-started',
  'drive',
  'embed',
  'oauth',
  'sso-callback',
  'workbench',
] as const;

/** Mounted under a path rather than at the root. */
const MOUNTED: Record<string, string> = {
  telemetry: 'telemetry',
  help: 'help',
  community: 'community',
};

const CONTENT_TYPES: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
  '.txt': 'text/plain; charset=utf-8',
  '.xml': 'application/xml',
  '.wasm': 'application/wasm',
};

export type StaticSiteOptions = { root: string };

/**
 * Answer a request from the built sites, or return null when nothing matches —
 * the api's own 404 is a better answer than an empty page.
 */
export function createStaticSite(options: StaticSiteOptions) {
  const root = resolve(options.root);
  const exists = (path: string): boolean => {
    try {
      return statSync(path).isFile();
    } catch {
      return false;
    }
  };
  /**
   * One file, if it exists. Next.js' static export writes \`sign-in.html\`, not
   * \`sign-in/index.html\`, so \`page()\` below tries both — and a bare directory is
   * never a page.
   */
  const read = (app: string, path: string): Response | null => {
    const full = resolve(root, app, `.${normalize(path)}`);
    // A path is a file here, so it is checked rather than trusted.
    if (full !== root && !full.startsWith(root + sep)) return null;
    if (!exists(full)) return null;
    const type = CONTENT_TYPES[extname(full).toLowerCase()] ?? 'application/octet-stream';
    const immutable = full.includes(`${sep}_next${sep}`) || full.includes(`${sep}assets${sep}`);
    return new Response(readFileSync(full), {
      headers: {
        'Content-Type': type,
        // Hashed assets are immutable; everything else revalidates, so a deploy
        // is picked up without a hard refresh (docs/specs/016-platform/stale-builds.md).
        'Cache-Control': immutable ? 'public, max-age=31536000, immutable' : 'no-cache',
      },
    });
  };

  /**
   * The two layouts an export can use for one route, in order of likelihood.
   *
   * This deliberately does NOT fall back to the app's own `index.html`. It used to,
   * and that made every unknown path a hit: `/oauth/consent` was looked up in
   * marketing first (the editor's routes are enumerated in EDITOR_PREFIXES, and
   * anything unrecognised is marketing's), the lookup "succeeded" with marketing's
   * home page, and the live-app branch below never ran. The consent page and the
   * device page rendered the landing page instead of themselves. A miss has to be a
   * miss for the callers to try the next app.
   */
  const page = (app: string, route: string): Response | null =>
    read(app, route.endsWith('.html') ? route : `${route}.html`) ??
    read(app, route === '/' ? '/index.html' : `${route}/index.html`);

  return async function serveStatic(request: Request): Promise<Response | null> {
    if (request.method !== 'GET' && request.method !== 'HEAD') return null;
    let path = new URL(request.url).pathname.replace(/\/+/g, '/');
    // Next's static export writes a route's RSC payload as a DIRECTORY —
    // `get-started/__next.get-started/__PAGE__.txt` — while the client prefetches the
    // dotted form, `get-started/__next.get-started.__PAGE__.txt`. Without this rewrite
    // every in-app prefetch is a 404 on a self-hosted deployment, which is the only
    // place this layout is served (the hosted deployment answers from a Worker, and a
    // Worker was never given these files). Rewritten before the path is split, so
    // everything below looks up what the export actually wrote.
    const rscPage = /^(.*\/__next\.[^/]+)\.(__PAGE__\.txt)$/.exec(path);
    if (rscPage) path = `${rscPage[1]}/${rscPage[2]}`;
    // The api owns /api; a static site must never answer for it, not even with
    // its index page.
    if (path.startsWith('/api/')) return null;
    // Paths that a SERVICE answers on, not a page. A miss here has to be a 404: the
    // SPA fallback below turns an unknown path into 200 text/html, which is how a
    // probe for /mcp (or the OAuth discovery documents an MCP client asks for first)
    // came back looking like a working endpoint on a deployment that has no MCP at all.
    if (path === '/mcp' || path.startsWith('/.well-known/')) return null;
    const segments = path.split('/').filter(Boolean);
    const first = segments[0] ?? '';

    const rest = `/${segments.slice(1).join('/')}`;

    // Which app owns this path, and where it sits inside that app. The /live prefix is
    // the editor's ASSET PREFIX (next.config.ts), so stripping it has to happen before
    // anything is looked up — a chunk really is at live/_next/…, never at
    // live/live/_next/…. Getting this wrong served every chunk as the index page, which
    // the browser reports as a JSON syntax error on manifest.json and as an endless
    // reload of scripts that never arrive.
    const target =
      first === 'live'
        ? { app: 'live', route: rest }
        : first in MOUNTED
          ? { app: MOUNTED[first]!, route: rest }
          : (EDITOR_PREFIXES as readonly string[]).includes(first)
            ? // One document id per URL, one HTML file: the client reads the id from the
              // pathname (docs/specs/007-editor/new-document-route.md).
              { app: 'live', route: first === 'document' ? '/document/placeholder' : path }
            : { app: 'marketing', route: path };

    // A real file — a chunk under /_next, a font, a favicon — served as it is. Both apps
    // are tried, because the root of one holds assets the other's pages reference.
    const asset =
      read(target.app, target.route) ??
      read('live', target.route) ??
      read('marketing', target.route);
    if (asset) return asset;

    // A path that names a file IS a file: if it is missing, say so. Falling back to a
    // page here turns a 404 into HTML with the wrong content type, which is how a
    // missing chunk becomes a reload loop instead of an honest error.
    if (/\.[a-z0-9]+$/i.test(target.route)) return null;

    const own = page(target.app, target.route);
    if (own) return own;
    // Not in the app the table guessed. The editor's routes are enumerated, so a
    // route it added since (or one nobody listed) lands here: try the editor, then
    // fall back to the marketing home page, which is what every unknown path gets.
    if (target.app === 'marketing') {
      return page('live', target.route) ?? page('marketing', '/');
    }
    return null;
  };
}

export { APPS };
