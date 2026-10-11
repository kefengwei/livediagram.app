'use client';

// /drive/connected: where Google sends the user back after consent
// (docs/specs/022-drive-mirror/drive-mirror.md, "Connecting"). The code and
// the state go to the api, which checks the state, redeems the code and
// stores the sealed refresh token; then the user goes back to where they
// connected from, and the mirror starts on that page.

import { useTranslation } from '@/lib/i18n';
import { useEffect, useState, useSyncExternalStore } from 'react';
import { apiDriveConnect } from '@/lib/api-client';
import { useClerkApiBootstrap } from '@/hooks/persistence/useClerkApiBootstrap';
import { markConnectCancelled, markConnectConnected, takeConsent } from '@/lib/drive/consent';
import { driveLog, driveWarn } from '@/lib/drive/log';
import { track } from '@/lib/telemetry';
import { Body, Heading, LandingCard, PrimaryLink } from '@/components/chrome/LandingCard';

type Query = { code: string | null; state: string | null; error: string | null } | undefined;

const noSubscription = () => () => {};
let cachedSearch = '';
let cachedQuery: Query;
const readQuery = (): Query => {
  if (window.location.search !== cachedSearch || !cachedQuery) {
    cachedSearch = window.location.search;
    const p = new URLSearchParams(cachedSearch);
    cachedQuery = { code: p.get('code'), state: p.get('state'), error: p.get('error') };
  }
  return cachedQuery;
};
const beforeHydration = (): Query => undefined;

// A code redeems once; React may run an effect twice in development.
const redeemed = new Set<string>();

type Phase = 'working' | 'denied' | 'invalid' | 'failed';

// Redeem the code once; the phase to show, or null while leaving the page.
async function redeem(query: NonNullable<Query>, ownerId: string): Promise<Phase | null> {
  if (query.error) {
    driveLog('consent-refused', { error: query.error });
    // Back to exactly where they started, Cloud Sync open, saying so calmly.
    const back = takeConsent(sessionStorage, query.state);
    if (!back) return 'denied';
    markConnectCancelled(sessionStorage);
    window.location.replace(back);
    return null;
  }
  if (!query.code || !query.state || redeemed.has(query.code)) return null;
  redeemed.add(query.code);
  const returnPath = takeConsent(sessionStorage, query.state);
  if (!returnPath) {
    driveWarn('consent-state-unknown', {});
    return 'invalid';
  }
  try {
    await apiDriveConnect(ownerId, query.code, query.state);
  } catch (err) {
    driveWarn('connect-failed', { error: err instanceof Error ? err.message : String(err) });
    return 'failed';
  }
  track('Drive', 'Linked', 'Broker');
  driveLog('connected', {});
  markConnectConnected(sessionStorage);
  // Replaces this page, so Back never lands on a spent code.
  window.location.replace(returnPath);
  return null;
}

export function DriveConnected() {
  const { t } = useTranslation();
  const { authLoaded, isSignedIn, clerkUserId } = useClerkApiBootstrap();
  const query = useSyncExternalStore(noSubscription, readQuery, beforeHydration);
  const [phase, setPhase] = useState<Phase>('working');

  useEffect(() => {
    if (!query || !authLoaded || !isSignedIn || !clerkUserId) return;
    void redeem(query, clerkUserId).then((next) => {
      if (next) setPhase(next);
    });
  }, [query, authLoaded, isSignedIn, clerkUserId]);

  if (authLoaded && !isSignedIn) {
    return (
      <LandingCard>
        <Heading>{t('driveconnected.sign-in-to-connect-google-drive')}</Heading>
        <Body>{t('driveconnected.google-drive-connects-to-your-livediagram')}</Body>
        <PrimaryLink href="/sign-in/">{t('driveconnected.sign-in')}</PrimaryLink>
      </LandingCard>
    );
  }
  if (phase === 'denied') {
    return (
      <LandingCard>
        <Heading>{t('driveconnected.google-drive-wasn-t-connected')}</Heading>
        <Body>{t('driveconnected.nothing-changed-you-can-connect-it')}</Body>
        <PrimaryLink href="/explorer?settings=account&section=cloud-sync">{t('driveconnected.back')}</PrimaryLink>
      </LandingCard>
    );
  }
  if (phase === 'invalid' || phase === 'failed') {
    return (
      <LandingCard>
        <Heading>{t('driveconnected.google-drive-couldn-t-be-connected')}</Heading>
        <Body>
          {phase === 'invalid'
            ? t('driveconnected.this-connection-was-not-started-from')
            : t('driveconnected.google-did-not-accept-the-connection')}{' '}{t('driveconnected.try-again-from-settings-account-cloud')}</Body>
        <PrimaryLink href="/explorer?settings=account&section=cloud-sync">{t('driveconnected.back-to-cloud-sync')}</PrimaryLink>
      </LandingCard>
    );
  }
  return (
    <LandingCard>
      <Body>{t('driveconnected.connecting-google-drive')}</Body>
    </LandingCard>
  );
}
