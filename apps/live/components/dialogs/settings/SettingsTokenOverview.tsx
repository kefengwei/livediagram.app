'use client';

// The token manager's overview (docs/specs/015-api/public-api-and-tokens.md#36-management--the-settings-dialogs-api-tokens-category):
// what tokens are for, how many of the ten slots are taken, and the way to
// make another. The meter is one pip per slot so "how close am I to the cap"
// reads at a glance instead of from a sentence.
import { useTranslation } from '@/lib/i18n';
import { Button } from '@livediagram/ui';
import { PlusIcon } from '@/components/primitives/explorer-icons';
import { TokensGlyph } from './settings-icons';

// Brand while there is room, amber from here, rose at the cap.
const METER_WARN_AT = 8;

export function SettingsTokenOverview({
  count,
  max,
  composing,
  onNew,
}: {
  // Null while the list loads: the meter waits rather than flashing "0".
  count: number | null;
  max: number;
  composing: boolean;
  onNew: () => void;
}) {
  const { t } = useTranslation();
  // No tokens yet: the composer below is the one thing to do, so the header
  // offers no second way to it and no meter reading "0 of 10".
  const firstRun = count === 0;
  const atCap = count !== null && count >= max;
  const fill = atCap
    ? 'bg-rose-500'
    : count !== null && count >= METER_WARN_AT
      ? 'bg-amber-500'
      : 'bg-brand-500 dark:bg-brand-400';

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-start gap-3">
        <span
          aria-hidden
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-slate-600 to-slate-800 text-white shadow-sm shadow-slate-900/20 dark:from-slate-500 dark:to-slate-700"
        >
          {TokensGlyph}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-semibold text-slate-800 dark:text-slate-100">{t('settingstokenoverview.api-tokens')}</span>
          <span className="block text-xs leading-relaxed text-slate-500 dark:text-slate-400">{t('settingstokenoverview.let-your-scripts-and-ai-tools')}</span>
        </span>
        {composing || firstRun ? null : (
          // Visibly just "New" beside the API Tokens title; the accessible
          // name says what it makes, still starting with the visible word.
          <Button
            size="xs"
            onClick={onNew}
            disabled={count === null || atCap}
            aria-label={t('settingstokenoverview.new-token')}
            className="shrink-0"
          >
            <PlusIcon />{t('settingstokenoverview.new')}</Button>
        )}
      </div>

      {count === null || firstRun ? null : (
        <div className="flex items-center gap-3">
          <div
            role="meter"
            aria-label={t('settingstokenoverview.token-slots-used')}
            aria-valuemin={0}
            aria-valuemax={max}
            aria-valuenow={count}
            aria-valuetext={`${count} of ${max}`}
            className="flex flex-1 gap-1"
          >
            {Array.from({ length: max }, (_, i) => (
              <span
                key={i}
                className={`h-1.5 flex-1 rounded-full transition-colors ${
                  i < count ? fill : 'bg-slate-200 dark:bg-slate-700'
                }`}
              />
            ))}
          </div>
          <span className="shrink-0 text-[11px] tabular-nums text-slate-500 dark:text-slate-400">
            <span className="font-semibold text-slate-700 dark:text-slate-200">{count}</span>{t('settingstokenoverview.of')}{' '}
            {max}
          </span>
        </div>
      )}
      {atCap ? (
        <p className="text-[11px] text-rose-600 dark:text-rose-400">{t('settingstokenoverview.every-slot-is-taken-revoke-a')}</p>
      ) : null}
    </div>
  );
}
