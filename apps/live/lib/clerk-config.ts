'use client';

// MEASURED, and the reason this file is more careful than it looks: the flags below
// are NOT compile-time constants in practice. Next.js compiles
// `process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` here into a runtime lookup on the
// `process` shim (`n.default.env.…` in the emitted chunk), so no bundler can fold it,
// and a `dynamic()` import gated on such a flag keeps its chunk. A self-hosted build
// still had every page fetch Clerk: 38 kB on /, /new and the auth pages, 81 kB on the
// explorer. `'use client'` was tried and does not change it.
//
// So `clerkBundled` and the runtime self-host probe decide what RENDERS, which is
// correct and worth keeping; removing the library from the bundle is a build-time
// job — a webpack alias for `@clerk/react` in next.config.ts, applied when the
// deployment has no Clerk. Until that lands, a self-hosted deployment downloads
// Clerk and never runs it.

import { clerkPublishableKeyOrNull } from '@livediagram/ui/clerk-key';

// A self-hosted deployment's provider is discovered at RUNTIME
// (lib/self-host-auth.ts asks the deployment's own /api/auth/ok) for anything
// that renders during a session — but a handful of decisions are made at MODULE
// LOAD, where no hook can run: whether a settings category exists at all, which
// component a module-level constant resolves to (`AuthControls`, `SignInPrompt`),
// whether a pure catalogue function is handed `authEnabled`. Those need the
// build to say so, and the self-host build says it here. Written as a literal
// comparison, the form Next does fold (the hosted build's `clerkEnabled` has
// worked this way in production all along).
export const selfHostAuthEnabled = process.env.NEXT_PUBLIC_SELF_HOST_AUTH === '1';

// Single source of truth for "is Clerk enabled on this deployment".
//
// Self-hosters (per docs/specs/002-project-scope/open-source-and-business-model.md + docs/specs/014-identity/auth-and-guest-access.md) can ship livediagram without
// provisioning a Clerk app at all — the canvas runs in pure guest
// mode using the X-Owner-Id header (which is also how a deployed-
// with-Clerk install handles signed-out visitors). This flag flips
// every Clerk-aware module into either real-Clerk-context or
// pure-guest pass-through at module load time.
//
// `NEXT_PUBLIC_*` env vars are baked into the static export at build
// time, so the flag is effectively a compile-time constant — no
// per-render cost, no React state, and the bundle can drop the Clerk
// pages' content entirely on a no-key build via dead-code elimination
// once tree-shaking gets aggressive.

// Whether a key was baked into THIS build, written as a literal comparison on
// purpose: a bundler folds `process.env.NEXT_PUBLIC_X === '…'` at build time, and that
// fold is what lets a Clerk-less deployment drop the library rather than merely never
// render it. `clerkEnabled` below cannot do that job — it is the verdict of a
// validation call, which no bundler can evaluate, so a dynamic import gated on it
// survives into every build and every page fetches Clerk's chunk.
const clerkKeyBaked = (process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY ?? '') !== '';

export const clerkPublishableKey = clerkKeyBaked
  ? clerkPublishableKeyOrNull(process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY)
  : null;

export const clerkEnabled = clerkPublishableKey !== null;

/**
 * The foldable form of `clerkEnabled`: true in a build that carries a key. Gate
 * dynamic imports of Clerk modules on THIS, not on `clerkEnabled`.
 */
export const clerkBundled = clerkKeyBaked;

// Test builds only: the opt-in Google Drive e2e
// (docs/specs/022-drive-mirror/blueprints/drive-mirror.md, "Testing") signs in without
// Clerk, through E2EAuthBridge and a JWT the test mints against its own JWKS.
// A compile-time constant like the rest of this file, so a real build (which
// never sets it) drops the branch and the bridge entirely.
export const e2eAuthEnabled = process.env.NEXT_PUBLIC_E2E_AUTH === '1';

// Whether this BUILD can have a signed-in session on its own: real Clerk, or the
// e2e bridge. A self-hosted deployment (docs/specs/016-platform/self-hosted-runtime.md)
// is deliberately absent: its app process serves its own identity provider at
// /api/auth/*, and whether it does is discovered at RUNTIME
// (lib/self-host-auth.ts) — the NEXT_PUBLIC_SELF_HOST_AUTH flag this used to read
// was measured never to reach the client bundle, so a build that set it still
// behaved like a Clerk-less one and the account menu vanished on a self-hosted
// deployment that was signed in. Only the session plumbing (the deferred
// provider, the api bootstrap, the account menu) reads this; everything
// Clerk-specific keeps reading clerkEnabled, and what renders asks
// `sessionsEnabled || selfHosted`.
export const sessionsEnabled = clerkEnabled || e2eAuthEnabled || selfHostAuthEnabled;

// Whether the sign-in / sign-up pages should show the "Continue with
// Google" OAuth button. Gated by `NEXT_PUBLIC_GOOGLE_OAUTH_ENABLED`
// so dev tenants (which can use Clerk's shared Google credentials)
// can turn it on before prod's own Google Cloud OAuth client exists.
// The connection must be enabled in the Clerk dashboard and, for prod,
// a Google Cloud OAuth client registered against Clerk's redirect URI
// (`https://clerk.<domain>/v1/oauth_callback`) — without that the
// button would surface a `redirect_uri_mismatch` error to the user.
// Requires Clerk itself to be on (no point showing it in guest mode).
// The handlers stay in the code so flipping this flag re-enables the
// button without re-implementing anything.
export const googleOAuthEnabled =
  clerkEnabled && process.env.NEXT_PUBLIC_GOOGLE_OAUTH_ENABLED === 'true';
