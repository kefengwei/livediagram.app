'use client';

import { useTranslation } from '@/lib/i18n';
import { HoverCard, RedoIcon, UndoIcon } from '@livediagram/ui';
import { CLUSTER_STRIP } from '@/components/canvas/cluster-strip';

// The Undo / Redo strip in the bottom-right cluster: the leftmost item,
// before Layers + Theme & Canvas. Edit sessions only: undo / redo aren't
// actionable for a view-role visitor, so the caller renders nothing for
// them.
//
// `data-dock-button` keeps Undo / Redo presses from closing an open cluster
// popover (Layers, Collaborate), the same as pressing their own buttons.
export function UndoRedoClusterStrip({
  onUndo,
  onRedo,
  canUndo,
  canRedo,
}: {
  onUndo?: () => void;
  onRedo?: () => void;
  canUndo?: boolean;
  canRedo?: boolean;
}) {
  const { t } = useTranslation();
  return (
    <div
      data-dock-button=""
      onContextMenu={(e) => {
        e.preventDefault();
        e.stopPropagation();
      }}
      className={CLUSTER_STRIP}
    >
      <HoverCard
        title={t('undoredoclusterstrip.undo')}
        description={t('undoredoclusterstrip.undo-last-edit')}
      >
        <button
          type="button"
          onPointerDown={(e) => e.stopPropagation()}
          onClick={onUndo}
          disabled={!canUndo}
          aria-label={t('undoredoclusterstrip.undo-2')}
          className="flex h-11 w-11 items-center justify-center text-slate-600 transition hover:bg-slate-50 hover:text-slate-900 disabled:cursor-not-allowed disabled:text-slate-300 disabled:hover:bg-transparent dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white dark:disabled:text-slate-600 dark:disabled:hover:bg-transparent"
        >
          <UndoIcon />
        </button>
      </HoverCard>
      <HoverCard
        title={t('undoredoclusterstrip.redo')}
        description={t('undoredoclusterstrip.redo-last-undone-edit')}
      >
        <button
          type="button"
          onPointerDown={(e) => e.stopPropagation()}
          onClick={onRedo}
          disabled={!canRedo}
          aria-label={t('undoredoclusterstrip.redo-2')}
          className="flex h-11 w-11 items-center justify-center border-l border-slate-100 text-slate-600 transition hover:bg-slate-50 hover:text-slate-900 disabled:cursor-not-allowed disabled:text-slate-300 disabled:hover:bg-transparent dark:border-slate-800 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white dark:disabled:text-slate-600 dark:disabled:hover:bg-transparent"
        >
          <RedoIcon />
        </button>
      </HoverCard>
    </div>
  );
}
