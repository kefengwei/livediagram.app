'use client';

import { useTranslation } from '@/lib/i18n';
import { HoverCard } from '@livediagram/ui';
import { CameraIcon, type EsBoardControls } from './EventStormingBoardRows';
import { TOOLBAR_TRIGGER_TONE } from './PaletteDropdown';

// Add from photo in the Toolbar layout's strip (docs/specs/021-event-storming/event-storming.md
// Phase 8; docs/specs/007-editor/toolbar-layout.md): the same control as the Event Storming
// category's board row (EventStormingBoardRows), icon-only to sit with the strip's tiles, its words in the
// hover card and its accessible name. Renders nothing where the board offers no photo import.
export function EsPhotoStripButton({ controls }: { controls: EsBoardControls | undefined }) {
  const { t } = useTranslation();
  if (!controls?.onImportPhoto) return null;
  const disabled = controls.photoDisabled === true;
  return (
    <HoverCard
      title={t('esphotostripbutton.add-from-photo')}
      description={
        (disabled && controls.photoDisabledReason) || t('esphotostripbutton.read-the-stickies-off-a-photo')
      }
    >
      <button
        type="button"
        aria-label={t('esphotostripbutton.add-from-photo-2')}
        // aria-disabled, not disabled: the button keeps focus and hover, so the reason in the
        // hover card stays reachable.
        aria-disabled={disabled || undefined}
        onClick={() => {
          if (!disabled) controls.onImportPhoto?.();
        }}
        className={`flex h-9 w-9 items-center justify-center rounded-md transition ${
          disabled ? 'cursor-not-allowed opacity-50' : TOOLBAR_TRIGGER_TONE
        }`}
      >
        <CameraIcon />
      </button>
    </HoverCard>
  );
}
