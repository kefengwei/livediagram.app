'use client';

import { useTranslation } from '@/lib/i18n';
import { HoverCard } from '@livediagram/ui';
import { PHOTO_ZOOM_MAX } from '@/lib/photo-view';

// The zoom, where it can be seen and clicked (docs/specs/021-event-storming/event-storming.md Phase 9). The wheel and
// the keys are faster, but a gesture nobody knows about is not a feature: the
// buttons are the discoverable half, and the hint under them teaches the rest.
export function ZoomControls({
  zoom,
  onZoomIn,
  onZoomOut,
  onFit,
}: {
  zoom: number;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onFit: () => void;
}) {
  const { t } = useTranslation();
  const button =
    'flex h-7 min-w-7 items-center justify-center rounded-full px-2 text-sm text-white hover:bg-white/15 disabled:opacity-40 disabled:hover:bg-transparent focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-white';
  return (
    <div
      data-testid="photo-zoom"
      className="pointer-events-auto flex items-center gap-0.5 rounded-full bg-slate-900/85 p-0.5 shadow-lg backdrop-blur"
      // The controls sit on the photo; a click on them is not a drag that
      // draws a box.
      onPointerDown={(e) => e.stopPropagation()}
    >
      <HoverCard title={t('zoomcontrols.zoom-out')} description={t('zoomcontrols.shortcut')}>
        <button
          type="button"
          aria-label={t('zoomcontrols.zoom-out-2')}
          disabled={zoom <= 1}
          onClick={onZoomOut}
          className={button}
        >
          −
        </button>
      </HoverCard>
      <span
        aria-live="polite"
        data-testid="photo-zoom-level"
        className="w-12 text-center text-xs tabular-nums text-slate-200"
      >
        {Math.round(zoom * 100)}%
      </span>
      <HoverCard
        title={t('zoomcontrols.zoom-in')}
        description={t('zoomcontrols.shortcut-or-scroll-or-pinch-drag')}
      >
        <button
          type="button"
          aria-label={t('zoomcontrols.zoom-in-2')}
          disabled={zoom >= PHOTO_ZOOM_MAX}
          onClick={onZoomIn}
          className={button}
        >
          +
        </button>
      </HoverCard>
      <HoverCard title={t('zoomcontrols.show-the-whole-photo')} description={t('zoomcontrols.shortcut-0')}>
        <button
          type="button"
          aria-label={t('zoomcontrols.show-the-whole-photo-2')}
          disabled={zoom === 1}
          onClick={onFit}
          className={`${button} text-xs`}
        >{t('zoomcontrols.fit')}</button>
      </HoverCard>
    </div>
  );
}
