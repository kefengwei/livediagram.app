'use client';

// /drive/open: the Drive UI integration's Open URL
// (docs/specs/022-drive-mirror/drive-mirror.md, "Open with"). Google passes
// `state`; this reads the file and opens the document, offers **Import a copy**
// (or **Import as new document** for a copy of a mirrored file), or says the
// file cannot be opened.

import { useTranslation } from '@/lib/i18n';
import { useCallback, useEffect, useState, useSyncExternalStore } from 'react';
import { Button } from '@livediagram/ui';
import { ApiError, apiDriveToken } from '@/lib/api-client';
import { useClerkApiBootstrap } from '@/hooks/persistence/useClerkApiBootstrap';
import { googleClientId } from '@/lib/drive/config';
import { createDriveRestClient } from '@/lib/drive/drive-rest-client';
import { requestBrowserAccessToken } from '@/lib/drive/google-scripts';
import { createApiLivediagramPort } from '@/lib/drive/livediagram-port';
import { driveWarn } from '@/lib/drive/log';
import {
  importOpenWithCopy,
  openWithTelemetryType,
  parseOpenState,
  resolveOpenWith,
  type OpenWithImportReason,
  type OpenWithOutcome,
  type OpenWithState,
} from '@/lib/drive/open-with';
import { track } from '@/lib/telemetry';
import { Body, Heading, LandingCard, PrimaryLink } from '@/components/chrome/LandingCard';
import { useDriveMirror } from './drive-mirror-context';

const noSubscription = () => () => {};
let cachedSearch = '';
let cachedState: OpenWithState | null = null;
const readState = (): OpenWithState | null => {
  if (window.location.search !== cachedSearch) {
    cachedSearch = window.location.search;
    cachedState = parseOpenState(cachedSearch);
  }
  return cachedState;
};
const beforeHydration = (): OpenWithState | null | undefined => undefined;
// This page's own path and query, for the sign-in return; empty while
// prerendering, where there is no window.
const readHere = () => `${window.location.pathname}${window.location.search}`;
const hereBeforeHydration = () => '';

type Phase =
  | { kind: 'loading' }
  | { kind: 'needs-access' }
  | { kind: 'outcome'; outcome: OpenWithOutcome }
  | { kind: 'importing' }
  | { kind: 'import-failed' };

export function DriveOpen() {
  const { t } = useTranslation();
  const { authLoaded, isSignedIn, clerkUserId } = useClerkApiBootstrap();
  const drive = useDriveMirror();
  const state = useSyncExternalStore(noSubscription, readState, beforeHydration);
  const here = useSyncExternalStore(noSubscription, readHere, hereBeforeHydration);
  const [phase, setPhase] = useState<Phase>({ kind: 'loading' });
  const [token, setToken] = useState<string | null>(null);

  // A token: the broker's, or a click away in browser-only mode.
  useEffect(() => {
    if (!clerkUserId || drive.mode !== 'broker' || token) return;
    let live = true;
    void apiDriveToken(clerkUserId)
      .then((t) => live && setToken(t.accessToken))
      .catch((err: unknown) => {
        if (!live) return;
        if (err instanceof ApiError && (err.status === 404 || err.status === 409)) {
          setPhase({ kind: 'needs-access' });
        } else setPhase({ kind: 'outcome', outcome: { kind: 'error', reason: 'unreadable' } });
      });
    return () => {
      live = false;
    };
  }, [clerkUserId, drive.mode, token]);

  const client = useCallback(
    (accessToken: string) =>
      createDriveRestClient({
        fetch: (i, init) => fetch(i, init),
        getAccessToken: async () => accessToken,
      }),
    [],
  );

  useEffect(() => {
    if (!token || !state || !clerkUserId) return;
    let live = true;
    void resolveOpenWith(
      {
        drive: client(token),
        port: createApiLivediagramPort(clerkUserId),
        host: window.location.host,
      },
      state,
    )
      .then((outcome) => {
        if (!live) return;
        track('Drive', 'Opened', openWithTelemetryType(outcome));
        if (outcome.kind === 'open')
          window.location.assign(`/document/${encodeURIComponent(outcome.documentId)}`);
        else setPhase({ kind: 'outcome', outcome });
      })
      .catch((err: unknown) => {
        driveWarn('open-with-failed', { error: err instanceof Error ? err.message : String(err) });
        if (live) setPhase({ kind: 'outcome', outcome: { kind: 'error', reason: 'unreadable' } });
      });
    return () => {
      live = false;
    };
  }, [token, state, clerkUserId, client]);

  const allowAccess = async () => {
    if (drive.mode === 'browser') {
      setToken((await requestBrowserAccessToken(googleClientId, () => Date.now(), '')).accessToken);
      return;
    }
    await drive.connect();
  };

  const importCopy = async (reason: OpenWithImportReason) => {
    if (!token || !state || !clerkUserId) return;
    setPhase({ kind: 'importing' });
    try {
      const id = await importOpenWithCopy(
        {
          drive: client(token),
          port: createApiLivediagramPort(clerkUserId),
          host: window.location.host,
        },
        state,
        reason,
      );
      window.location.assign(`/document/${encodeURIComponent(id)}`);
    } catch (err) {
      driveWarn('open-with-import-failed', {
        error: err instanceof Error ? err.message : String(err),
      });
      setPhase({ kind: 'import-failed' });
    }
  };

  if (authLoaded && !isSignedIn) {
    const back = encodeURIComponent(here);
    return (
      <LandingCard>
        <Heading>{t('driveopen.sign-in-to-open-this-document')}</Heading>
        <Body>{t('driveopen.files-from-google-drive-open-in')}</Body>
        <PrimaryLink href={`/sign-in/?redirect_url=${back}`}>{t('driveopen.sign-in')}</PrimaryLink>
      </LandingCard>
    );
  }
  if (
    state === null ||
    (authLoaded && isSignedIn && drive.mode === 'off' && drive.status.state !== 'starting')
  ) {
    return <CannotOpen />;
  }
  if (phase.kind === 'needs-access') {
    return (
      <LandingCard>
        <Heading>{t('driveopen.allow-livediagram-to-read-this-file')}</Heading>
        <Body>{t('driveopen.connect-google-drive-once-and-files')}</Body>
        <div className="mt-5 flex justify-center">
          <Button size="md" onClick={() => void allowAccess()}>
            {t('driveopen.allow-access')}
          </Button>
        </div>
      </LandingCard>
    );
  }
  if (phase.kind === 'outcome' && phase.outcome.kind === 'error') return <CannotOpen />;
  if (phase.kind === 'outcome' && phase.outcome.kind === 'import') {
    const { reason, name } = phase.outcome;
    // A copy of one of your mirrored files (docs/specs/022-drive-mirror/drive-mirror.md,
    // "Copies made in Drive"): a new document, never the original.
    const copy = reason === 'copy';
    return (
      <LandingCard>
        <Heading>{name}</Heading>
        <Body>
          {copy
            ? t('driveopen.this-is-a-copy-made-in')
            : t('driveopen.this-document-isn-t-in-your')}
        </Body>
        <div className="mt-5 flex justify-center">
          <Button size="md" onClick={() => void importCopy(reason)}>
            {copy ? t('driveopen.import-as-new-document') : t('driveopen.import-a-copy')}
          </Button>
        </div>
      </LandingCard>
    );
  }
  if (phase.kind === 'import-failed') {
    return (
      <LandingCard>
        <Heading>{t('driveopen.the-copy-couldn-t-be-made')}</Heading>
        <Body>{t('driveopen.the-file-isn-t-a-readable')}</Body>
        <PrimaryLink href="/explorer">{t('driveopen.go-to-explorer')}</PrimaryLink>
      </LandingCard>
    );
  }
  return (
    <LandingCard>
      <Body>
        {phase.kind === 'importing' ? 'Importing…' : t('driveopen.opening-from-google-drive')}
      </Body>
    </LandingCard>
  );
}

function CannotOpen() {
  const { t } = useTranslation();
  return (
    <LandingCard>
      <Heading>{t('driveopen.this-file-can-t-be-opened')}</Heading>
      <Body>{t('driveopen.it-isn-t-a-livediagram-file')}</Body>
      <PrimaryLink href="/explorer">{t('driveopen.go-to-explorer-2')}</PrimaryLink>
    </LandingCard>
  );
}
