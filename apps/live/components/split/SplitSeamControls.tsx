'use client';

import { useTranslation } from '@/lib/i18n';
import { CloseIcon, FitViewIcon, Tooltip } from '@livediagram/ui';

// The split's own buttons (docs/specs/007-editor/split-view.md "The seam"): Fit Both Sides, which fits
// both sides at once, and Close Side by Side. They sit on the seam, stacked just above the resize
// grip, because the seam belongs to neither pane: reaching for them never hands a pane to the editor
// (a pointer resting in a pane does), and they never hide under the editor's own chrome. Above the
// separator's own hit area (z-10), which is wider than the seam and would otherwise take the click.
export function SplitSeamControls({
  canFit,
  onFit,
  onClose,
}: {
  canFit: boolean;
  onFit: () => void;
  onClose: () => void;
}) {
  const { t } = useTranslation();
  return (
    <div className="absolute left-0 top-1/2 z-20 flex -translate-x-1/2 -translate-y-[calc(100%+1.75rem)] flex-col items-center gap-0.5 rounded-full border border-slate-200 bg-white p-0.5 shadow-md dark:border-slate-700 dark:bg-slate-800">
      <Tooltip label={t('splitseamcontrols.fit-both-sides')}>
        <button
          type="button"
          aria-label={t('splitseamcontrols.fit-both-sides-2')}
          disabled={!canFit}
          onClick={onFit}
          className="flex size-7 items-center justify-center rounded-full text-slate-500 transition hover:bg-slate-100 hover:text-slate-900 disabled:opacity-40 dark:text-slate-300 dark:hover:bg-slate-700 dark:hover:text-white"
        >
          <FitViewIcon />
        </button>
      </Tooltip>
      <Tooltip label={t('splitseamcontrols.close-side-by-side')}>
        <button
          type="button"
          aria-label={t('splitseamcontrols.close-side-by-side-2')}
          onClick={onClose}
          className="flex size-7 items-center justify-center rounded-full text-slate-500 transition hover:bg-slate-100 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-700 dark:hover:text-white"
        >
          <CloseIcon />
        </button>
      </Tooltip>
    </div>
  );
}
