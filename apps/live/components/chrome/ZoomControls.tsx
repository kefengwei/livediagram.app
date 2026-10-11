import { useTranslation } from '@/lib/i18n';
import { IsometricOrbitButton } from '@/components/chrome/IsometricOrbitButton';
import { ZoomMenu } from '@/components/chrome/ZoomMenu';
import { ZenExitIcon, ZenIcon } from '@/components/palette/palette-icons';
import { HoverCard, Glyph } from '@livediagram/ui';

type ZoomControlsProps = {
  zoom: number;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onSetZoom: (zoom: number) => void;
  onFitToScreen: () => void;
  // Isometric orbit control (docs/specs/008-canvas/isometric-view.md). When both are set (the isometric
  // tool is active) the orbit button sits between Fit and Zen: drag to
  // orbit the camera, click to reset its angle. Omitted on every other
  // tool → no button.
  onIsoOrbit?: (clientX: number, clientY: number) => void;
  onIsoReset?: () => void;
  // Zen / focus mode (docs/specs/007-editor/zen-mode.md). The dock carries the EXIT button, shown
  // while zen is active (it is the only chrome left in zen). Entering
  // lives in the canvas-tool dropdown under Isometric; `zenEnterHere`
  // restores the old enter button for sessions with no palette (view-only
  // visitors), who'd otherwise have no visible way in.
  onToggleZen?: () => void;
  zenActive?: boolean;
  zenEnterHere?: boolean;
  // A phone (docs/specs/007-editor/live-app.md): the cluster also carries Activity + Layers there, so
  // the step buttons go (pinch zooms) and Fit stays.
  pinchOnly?: boolean;
};

// Floating zoom controls, bottom-right of the canvas. Three
// controls: -10% / current % (click to fit, hover for the preset-level
// popover — see ZoomMenu) / +10%. Below `sm` the percentage button is
// hidden (and touch has no hover), so a plain Fit button stands in
// there. In zen mode it also carries the exit-zen button.
export function ZoomControls({
  zoom,
  onZoomIn,
  onZoomOut,
  onSetZoom,
  onFitToScreen,
  onIsoOrbit,
  onIsoReset,
  onToggleZen,
  zenActive,
  zenEnterHere,
  pinchOnly = false,
}: ZoomControlsProps) {
  const { t } = useTranslation();
  return (
    <div
      data-zoom-controls
      onPointerDown={(e) => e.stopPropagation()}
      onContextMenu={(e) => {
        e.preventDefault();
        e.stopPropagation();
      }}
      className="pointer-events-auto flex animate-fade-in items-center gap-1 rounded-lg border border-slate-200 bg-white p-1 shadow-lg shadow-slate-900/5 dark:border-slate-700 dark:bg-slate-900 dark:shadow-slate-950/40"
    >
      {pinchOnly ? null : (
        <HoverCard title={t('zoomcontrols.zoom-out-3')} description={t('zoomcontrols.zoom-out-by-10')}>
          <IconButton onClick={onZoomOut} label={t('zoomcontrols.zoom-out-4')}>
            <Glyph size={14} units={14}>
              <line x1="3" y1="7" x2="11" y2="7" />
            </Glyph>
          </IconButton>
        </HoverCard>
      )}
      <ZoomMenu zoom={zoom} onSetZoom={onSetZoom} onFitToScreen={onFitToScreen} />
      {pinchOnly ? null : (
        <HoverCard title={t('zoomcontrols.zoom-in-3')} description={t('zoomcontrols.zoom-in-by-10')}>
          <IconButton onClick={onZoomIn} label={t('zoomcontrols.zoom-in-4')}>
            <Glyph size={14} units={14}>
              <line x1="3" y1="7" x2="11" y2="7" />
              <line x1="7" y1="3" x2="7" y2="11" />
            </Glyph>
          </IconButton>
        </HoverCard>
      )}
      {/* Mobile-only Fit: below `sm` the percentage button (whose click
          is Fit on desktop) is hidden, and hover popovers don't exist on
          touch, so a plain Fit button keeps the action reachable. */}
      <span className="contents sm:hidden">
        {pinchOnly ? null : (
          <div className="mx-0.5 h-6 w-px bg-slate-200 dark:bg-slate-700" aria-hidden />
        )}
        <HoverCard title={t('zoomcontrols.fit-to-screen')} description={t('zoomcontrols.pan-and-zoom-so-everything-on')}>
          <button
            type="button"
            onClick={onFitToScreen}
            aria-label={t('zoomcontrols.fit-to-screen-2')}
            className="flex h-9 items-center justify-center rounded-md px-2.5 text-xs font-medium text-slate-700 transition hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800"
          >{t('zoomcontrols.fit-2')}</button>
        </HoverCard>
      </span>
      {onIsoOrbit && onIsoReset ? (
        <>
          <div className="mx-0.5 h-6 w-px bg-slate-200 dark:bg-slate-700" aria-hidden />
          <IsometricOrbitButton onOrbit={onIsoOrbit} onReset={onIsoReset} />
        </>
      ) : null}
      {onToggleZen && (zenActive || zenEnterHere) ? (
        // Exit-only in normal sessions: entering zen moved to the
        // canvas-tool dropdown (under Isometric), so outside zen the dock
        // stays minimal. Inside zen the dock is the only chrome left, so
        // the exit button lives here. zenEnterHere (palette-less sessions)
        // keeps the old enter button too.
        <>
          <div className="mx-0.5 h-6 w-px bg-slate-200 dark:bg-slate-700" aria-hidden />
          <HoverCard
            title={zenActive ? t('zoomcontrols.exit-zen-mode') : t('zoomcontrols.zen-mode')}
            description={
              zenActive
                ? t('zoomcontrols.bring-back-the-toolbars-and-panels')
                : t('zoomcontrols.hide-every-panel-and-toolbar-to')
            }
          >
            <IconButton onClick={onToggleZen} label={zenActive ? t('zoomcontrols.exit-zen-mode-2') : t('zoomcontrols.zen-mode-2')}>
              {zenActive ? <ZenExitIcon /> : <ZenIcon />}
            </IconButton>
          </HoverCard>
        </>
      ) : null}
    </div>
  );
}

function IconButton({
  onClick,
  label,
  children,
}: {
  onClick: () => void;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className="flex h-9 w-9 items-center justify-center rounded-md text-slate-600 transition hover:bg-slate-100 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white"
    >
      {children}
    </button>
  );
}
