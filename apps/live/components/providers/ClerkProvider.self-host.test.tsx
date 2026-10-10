// @vitest-environment jsdom

// A self-hosted deployment's session arrives ASYNCHRONOUSLY — the bridge fetches
// /api/auth/get-session, then /api/auth/token — while the default auth state for a
// Clerk-less build is a SETTLED GUEST (deferred-auth.tsx). Anything that keys a load on
// `authLoaded` therefore has to read "not settled" until that bridge publishes: with it
// reading true, the editor's identity bootstrap mints a guest id, loads the document
// under that id, and a team-library document — whose reads require a VERIFIED identity —
// answers 404, which the document route treats as terminal ("Document not found" until a
// reload). Measured on the self-hosted stack: GET /api/documents/<id> went out with no
// Authorization header before the bridge had even asked for the session.

import { act, cleanup, render } from '@testing-library/react';
import { useEffect } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { DEFERRED_AUTH_DEFAULT, useDeferredAuth, type DeferredAuthState } from './deferred-auth';

const state: { selfHosted: boolean | null; publish: ((s: DeferredAuthState) => void) | null } = {
  selfHosted: true,
  publish: null,
};

vi.mock('next/navigation', () => ({ usePathname: () => '/document/abc' }));
vi.mock('@/lib/clerk-config', () => ({
  clerkEnabled: false,
  clerkPublishableKey: null,
  clerkBundled: false,
  e2eAuthEnabled: false,
}));
vi.mock('@/lib/self-host-auth', () => ({ useSelfHostAuth: () => state.selfHosted }));
vi.mock('next/dynamic', () => ({
  default: () =>
    function FakeBridge({ onState }: { onState: (s: DeferredAuthState) => void }) {
      useEffect(() => {
        state.publish = onState;
      }, [onState]);
      return null;
    },
}));

const { ClerkProvider } = await import('./ClerkProvider');

afterEach(() => {
  cleanup();
  state.publish = null;
});

function renderAuth(): DeferredAuthState[] {
  const seen: DeferredAuthState[] = [];
  function Probe() {
    seen.push(useDeferredAuth());
    return null;
  }
  render(
    <ClerkProvider>
      <Probe />
    </ClerkProvider>,
  );
  return seen;
}

describe('ClerkProvider on a self-hosted deployment', () => {
  it('reads "not settled" while the self-host probe is in flight', () => {
    state.selfHosted = null;
    const seen = renderAuth();
    expect(seen.at(-1)?.authLoaded).toBe(false);
  });

  it('reads "not settled" until the session bridge publishes', () => {
    state.selfHosted = true;
    const seen = renderAuth();
    expect(seen.at(-1)?.authLoaded).toBe(false);

    act(() =>
      state.publish?.({
        ...DEFERRED_AUTH_DEFAULT,
        authLoaded: true,
        isSignedIn: true,
        userId: 'user_1',
      }),
    );
    expect(seen.at(-1)?.authLoaded).toBe(true);
    expect(seen.at(-1)?.userId).toBe('user_1');
  });

  it('settles as a guest once the probe says the deployment has no provider', () => {
    state.selfHosted = false;
    const seen = renderAuth();
    expect(seen.at(-1)?.authLoaded).toBe(true);
    expect(seen.at(-1)?.isSignedIn).toBe(false);
  });
});
