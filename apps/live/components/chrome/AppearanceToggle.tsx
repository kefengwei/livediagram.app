
import type { MouseEvent } from 'react';
import {
  AppearanceIcon,
  appearanceToggleName,
  HoverCard,
  oppositeAppearanceSetting,
  quickAppearanceToggleName,
} from '@livediagram/ui';
import type { AppearanceSetting } from '@livediagram/ui';
import { useTranslation } from '@/lib/i18n';
import { APPEARANCE_DESCRIPTION_KEY, APPEARANCE_LABEL_KEY } from '@/lib/i18n/shared-labels';
import { useAppearance } from '@/hooks/ui/useAppearance';
import { CHROME_BTN, CHROME_BTN_LABELLED, ChromeLabel } from '@/components/chrome/chrome-button';

// The editor's Appearance control: one button that CYCLES Light → Dark → System
// (docs/specs/004-interface-design/appearance.md), hosted in the tab bar's trailing
// controls. Flips only the editor chrome; a tab's theme is its own setting, except
// for Default, which follows this one (docs/specs/007-editor/live-app.md).
//
// The glyph shows the CURRENT setting, not the next one: with three states, one of
// them deferring to the OS, the only readable thing is where you are, so the
// hover card and accessible name carry where the next click takes you.
//
// In power user mode it is a quick switch instead
// (docs/specs/007-editor/power-user-mode.md#quick-appearance-switch): a click flips to the
// opposite of the painted appearance, and the context menu gesture sets System.

// Keys, not English: the shared package names these states, but only the live app
// translates (lib/i18n/shared-labels.ts).

export function AppearanceToggle({
  labelled = false,
  quick = false,
}: {
  labelled?: boolean;
  quick?: boolean;
}) {
  const { t } = useTranslation();
  const { setting, appearance, set, cycle } = useAppearance();
  const opposite = oppositeAppearanceSetting(appearance);
  const label = (state: AppearanceSetting) => t(APPEARANCE_LABEL_KEY[state]);
  const descriptionOf = (state: AppearanceSetting) => t(APPEARANCE_DESCRIPTION_KEY[state]);

  const onContextMenu = (event: MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
    if (setting !== 'system') set('system');
  };

  const description = quick
    ? t(setting === 'system' ? 'appearance.hover.quick-simple' : 'appearance.hover.quick-hint', {
        current: descriptionOf(setting),
        next: label(opposite),
      })
    : descriptionOf(setting);

  return (
    <HoverCard title={t('appearance.title', { name: label(setting) })} description={description}>
      <button
        type="button"
        onClick={quick ? () => set(opposite) : cycle}
        onContextMenu={quick ? onContextMenu : undefined}
        aria-label={
          quick ? quickAppearanceToggleName(setting, appearance) : appearanceToggleName(setting)
        }
        className={labelled ? `${CHROME_BTN} ${CHROME_BTN_LABELLED}` : CHROME_BTN}
      >
        <AppearanceIcon setting={setting} />
        <ChromeLabel show={labelled}>{label(setting)}</ChromeLabel>
      </button>
    </HoverCard>
  );
}
