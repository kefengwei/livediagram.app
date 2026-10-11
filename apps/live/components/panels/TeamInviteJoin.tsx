'use client';

import { useTranslation } from '@/lib/i18n';
import { useCallback, useEffect, useState, useSyncExternalStore } from 'react';
import type { TeamInviteLinkInfo } from '@livediagram/api-schema';
import { Button, buttonClassName, ButtonContent } from '@livediagram/ui';
import {
  Body,
  Eyebrow,
  Heading,
  LandingCard as Card,
  PrimaryLink,
  SecondaryLink,
} from '@/components/chrome/LandingCard';
import { useClerkApiBootstrap } from '@/hooks/persistence/useClerkApiBootstrap';
import { sessionsEnabled } from '@/lib/clerk-config';
import { useSignedGuestId } from '@/hooks/persistence/useSignedGuestId';
import { track } from '@/lib/telemetry';
import { apiJoinTeamByInviteLink, apiResolveTeamInviteLink } from '@/lib/api-client';

// Landing for a shareable team invite link (docs/specs/013-workspace/teams.md), served at the
// top-level `/join?token=<token>` route (outside the Explorer chrome so
// it works the same for signed-out visitors). It resolves the token to
// a team, then offers Join / Decline to a signed-in user, or a "sign in
// to join" path that returns here afterwards.

type Resolved = 'loading' | 'invalid' | TeamInviteLinkInfo;

// The URL's token, as a store with nothing to subscribe to: the page never changes its own query.
const noSubscription = () => () => {};
const readUrlToken = () => new URLSearchParams(window.location.search).get('token');
const beforeHydration = (): string | null | undefined => undefined;

const teamHref = (teamId: string) => `/explorer/team?id=${encodeURIComponent(teamId)}`;

export function TeamInviteJoin() {
  const { t } = useTranslation();
  const { authLoaded, isSignedIn, clerkUserId } = useClerkApiBootstrap();
  // The token is undefined while prerendering and hydrating (the server snapshot), so the static
  // export and the first client render agree — no hydration mismatch — and read from the URL after.
  const token = useSyncExternalStore(noSubscription, readUrlToken, beforeHydration);

  // A guest's id is the SIGNED one, resolved before the invite is looked up
  // (docs/specs/014-identity/auth-and-guest-access.md "Signed guest ids").
  const guestId = useSignedGuestId(authLoaded, clerkUserId);
  const ownerId = clerkUserId ?? guestId;
  // What the api said about the token; a link without one is invalid without asking.
  const [lookup, setLookup] = useState<Resolved>('loading');
  const resolved: Resolved = authLoaded && token !== undefined && !token ? 'invalid' : lookup;
  const [joining, setJoining] = useState(false);
  const [joinError, setJoinError] = useState<string | null>(null);

  // Resolve once auth has settled (so ownerId / the bearer are stable).
  useEffect(() => {
    if (!authLoaded || !token || !ownerId) return;
    let cancelled = false;
    void apiResolveTeamInviteLink(ownerId, token)
      .then((res) => {
        if (!cancelled) setLookup(res ?? 'invalid');
      })
      .catch(() => {
        if (!cancelled) setLookup('invalid');
      });
    return () => {
      cancelled = true;
    };
  }, [authLoaded, token, ownerId]);

  const join = useCallback(async () => {
    if (!token || !ownerId || joining) return;
    setJoining(true);
    setJoinError(null);
    try {
      const result = await apiJoinTeamByInviteLink(ownerId, token);
      if (!result) {
        setLookup('invalid');
        return;
      }
      // Same event the Accept-invite flow fires (docs/specs/017-telemetry/telemetry.md) — a new
      // membership, just via a link instead of an email row.
      if (!result.alreadyMember) track('Team', 'Joined');
      // Land on the team so they see what they just joined.
      window.location.assign(teamHref(result.teamId));
    } catch {
      setJoinError('Could not join. Try again.');
    } finally {
      setJoining(false);
    }
  }, [token, ownerId, joining]);

  // --- Render states ---------------------------------------------------

  if (!sessionsEnabled) {
    return (
      <Card>
        <Heading>{t('teaminvitejoin.teams-aren-t-enabled-here')}</Heading>
        <Body>{t('teaminvitejoin.this-deployment-runs-without-accounts-so')}</Body>
        <PrimaryLink href="/new">{t('teaminvitejoin.go-to-the-editor')}</PrimaryLink>
      </Card>
    );
  }

  if (!authLoaded || resolved === 'loading') {
    return (
      <Card>
        <Body>{t('teaminvitejoin.loading-the-invite')}</Body>
      </Card>
    );
  }

  if (resolved === 'invalid') {
    return (
      <Card>
        <Heading>{t('teaminvitejoin.this-invite-link-isn-t-valid')}</Heading>
        <Body>{t('teaminvitejoin.it-may-have-been-turned-off')}</Body>
        <PrimaryLink href="/explorer">{t('teaminvitejoin.back-to-your-documents')}</PrimaryLink>
      </Card>
    );
  }

  const { team, memberCount, alreadyMember } = resolved;
  const orgLine = team.organisation
    ? `${team.organisation} · ${memberCount} member${memberCount === 1 ? '' : 's'}`
    : `${memberCount} member${memberCount === 1 ? '' : 's'}`;

  // Signed out: explain why an account is needed, then bounce back here
  // after auth (redirect_url carries this exact URL, token and all).
  if (!isSignedIn) {
    const back = encodeURIComponent(`/join?token=${encodeURIComponent(token!)}`);
    return (
      <Card>
        <Eyebrow>{t('teaminvitejoin.you-re-invited-to-join')}</Eyebrow>
        <Heading>{team.name}</Heading>
        <Body>{orgLine}</Body>
        <Body>
          Teams are tied to your account, so you&apos;ll need to sign in (or create one) to join.
          We&apos;ll bring you right back here.
        </Body>
        <div className="mt-5 flex flex-col gap-2">
          <PrimaryLink href={`/sign-in/?redirect_url=${back}`}>{t('teaminvitejoin.sign-in-to-join')}</PrimaryLink>
          <SecondaryLink href={`/get-started/?redirect_url=${back}`}>{t('teaminvitejoin.create-an-account')}</SecondaryLink>
        </div>
      </Card>
    );
  }

  if (alreadyMember) {
    return (
      <Card>
        <Eyebrow>{t('teaminvitejoin.you-re-already-a-member-of')}</Eyebrow>
        <Heading>{team.name}</Heading>
        <Body>{orgLine}</Body>
        <PrimaryLink href={teamHref(team.id)}>{t('teaminvitejoin.open-team')}</PrimaryLink>
      </Card>
    );
  }

  // Signed in, not yet a member: Join / Decline.
  return (
    <Card>
      <Eyebrow>{t('teaminvitejoin.you-re-invited-to-join-2')}</Eyebrow>
      <Heading>{team.name}</Heading>
      <Body>{orgLine}</Body>
      {joinError ? (
        <p className="mt-3 text-sm text-rose-600 dark:text-rose-400">{joinError}</p>
      ) : null}
      <div className="mt-5 flex items-center justify-center gap-2">
        <Button size="md" onClick={() => void join()} disabled={joining}>
          {joining ? 'Joining…' : 'Join'}
        </Button>
        <a href="/explorer" className={buttonClassName({ variant: 'secondary', size: 'md' })}>
          <ButtonContent>{t('teaminvitejoin.decline')}</ButtonContent>
        </a>
      </div>
    </Card>
  );
}
