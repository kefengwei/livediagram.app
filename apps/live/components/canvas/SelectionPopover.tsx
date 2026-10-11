import { useRef } from 'react';
import { useEdgeAwarePlacement } from '@/hooks/canvas/useEdgeAwarePlacement';
import { FloatingTitle } from '@/components/chrome/FloatingTitle';
import { useCoarsePointer } from '@/hooks/ui/useCoarsePointer';
import { useMinimalChrome, usePowerUser } from '@/components/providers/minimal-chrome';
import { CommentIcon, DuplicateIcon, LockIcon, TrashIcon, HoverCard } from '@livediagram/ui';
import {
  BringToFrontIcon,
  EllipsisIcon,
  SendToBackIcon,
  TextIcon,
} from '@/components/canvas/selection-popover-icons';
import { MIND_CHILD_OPTION, MIND_SIBLING_OPTION } from '@/components/canvas/quick-connect-options';
import { EditPointsIcon } from '@/components/palette/palette-icons';
import { TOOLBAR_DIVIDER } from '@/components/chrome/toolbar-surface';
import { useTranslation } from '@/lib/i18n';

type Bounds = { x: number; y: number; width: number; height: number };

type SelectionPopoverProps = {
  bounds: Bounds;
  canvasOffset: { x: number; y: number };
  zoom: number;
  // Hidden while the selection moves: measures nothing until it ends (useEdgeAwarePlacement).
  suspended?: boolean;
  // Lock state + toggler. Optional so the read-only / view-role
  // mode (no edit handlers) can mount the popover without faking a
  // lock toggle; when omitted the lock button is suppressed.
  locked?: boolean;
  onToggleLock?: () => void;
  onDelete?: () => void;
  // Enter inline text-edit mode on the selected element. Passed for every
  // text-CAPABLE element (see elementSupportsText) — including ones with no
  // label yet, so the button itself teaches that text can be added. Absent
  // for kinds with no label (tables, images, annotations, data shapes).
  onEditText?: () => void;
  // True when the element already has text: the button reads "Edit text";
  // false = "Add text". Defaults to edit for older callers.
  hasText?: boolean;
  // Open a path's edit mode (docs/specs/023-draw-mode/path-tool.md "Editing"): a path only.
  onEditPoints?: () => void;
  // Mind map growth (docs/specs/009-elements/mind-node.md): Add child / Add sibling on a mind node.
  // The same actions as Tab / Enter and the "+" ring, given a one-click home
  // on the toolbar. Passed only for an editable, unlocked mind node.
  onAddMindChild?: () => void;
  onAddMindSibling?: () => void;
  // Duplicate the selected element, a one-click toolbar action (it used to
  // live only in the right-click context menu). Omitted in read-only /
  // view-role mode.
  onDuplicate?: () => void;
  // Intra-LAYER z-order (docs/specs/006-document/layers.md gained no z-nudge until now): stack this
  // element in front of / behind its band-mates WITHOUT moving it between
  // layers, which is what the element menu's Bring to Front does.
  onBringToFront?: () => void;
  onSendToBack?: () => void;
  // Open the comment thread. The toolbar shows the Comment button
  // whenever this is passed, regardless of any other props, which
  // is how view-role visitors get the comments-only toolbar (no
  // edit affordances next to it).
  onOpenComments?: () => void;
  // Open the same context menu that a right-click on the element
  // would open, anchored under the ellipsis button. Surfaces the
  // full action list on touch devices that can't right-click.
  onOpenContextMenu?: (screenX: number, screenY: number) => void;
  // Small caption above (or below) the toolbar naming what's selected
  // ("Selected Square", "Selected Element").
  title?: string;
  // Tighter gap between the popover and the element edge, set whenever
  // the "+" quick-connect button (which sits in this gap) doesn't render:
  // read-only, or a kind that shows none (a Plan board or card, an
  // annotation), so the toolbar sits closer without overlapping anything.
  compact?: boolean;
};

// Default gap: leave room for the plus duplicate button between
// the popover and the element edge. Bumped to 48 px so the plus
// has clear breathing room (at 36 px the popover crowded it and
// felt visually cramped). `compact` callers (no "+" showing) drop to
// 16 px since there's no plus button to clear.
const GAP_DEFAULT = 48;
const GAP_COMPACT = 16;

export function SelectionPopover({
  bounds,
  canvasOffset,
  zoom,
  locked = false,
  onToggleLock,
  onDelete,
  onEditText,
  hasText = true,
  onEditPoints,
  onAddMindChild,
  onAddMindSibling,
  onDuplicate,
  onBringToFront,
  onSendToBack,
  onOpenComments,
  onOpenContextMenu,
  compact = false,
  suspended = false,
  title,
}: SelectionPopoverProps) {
  const { t } = useTranslation();

  const ellipsisRef = useRef<HTMLButtonElement>(null);
  // More opens the element menu: on every device, since right-click is not something a desktop
  // user finds, except in power user mode, where right-click is the way in. Touch can't
  // right-click, so it always keeps it. The bin goes only with Minimal chrome on desktop, where
  // Delete is the key (docs/specs/008-canvas/canvas-and-palette.md#selection-popover).
  const touch = useCoarsePointer();
  const minimalChrome = useMinimalChrome();
  const powerUser = usePowerUser();
  const showMore = !!onOpenContextMenu && (touch || !powerUser);
  const showDelete = !!onDelete && (touch || !minimalChrome);
  // Counter-scaled placement: the popover renders at its natural on-screen size
  // regardless of zoom, pinned to the selection's nearest centre edge.
  const { ref, placeAbove, style } = useEdgeAwarePlacement(
    bounds,
    canvasOffset,
    zoom,
    (compact ? GAP_COMPACT : GAP_DEFAULT) / zoom,
    suspended,
  );

  return (
    <div
      ref={ref}
      data-testid="selection-popover"
      // A toolbar over the canvas: a held tool's press there is a button press (usePathTool).
      data-canvas-toolbar=""
      onPointerDown={(e) => e.stopPropagation()}
      onContextMenu={(e) => {
        e.preventDefault();
        e.stopPropagation();
      }}
      role="toolbar"
      aria-label={title}
      className="pointer-events-auto absolute z-[var(--z-toolbar)] flex animate-fade-in items-center gap-1 rounded-lg border border-slate-200 bg-white p-1 shadow-lg shadow-slate-900/10 dark:border-slate-800 dark:bg-slate-900 dark:shadow-slate-950/40"
      style={style}
    >
      {title && !minimalChrome ? <FloatingTitle title={title} placeAbove={placeAbove} /> : null}
      {showMore && onOpenContextMenu ? (
        <>
          <HoverCard
            title={t('selectionpopover.more')}
            description={t('selectionpopover.open-the-element-menu')}
          >
            <button
              ref={ellipsisRef}
              // A stable id: this toolbar unmounts while the element menu it opens is up, and
              // the menu's Escape finds it again by id (docs/specs/004-interface-design/menus.md).
              id="selection-more-actions"
              type="button"
              data-context-menu-trigger
              onClick={() => {
                const rect = ellipsisRef.current?.getBoundingClientRect();
                if (!rect) return;
                onOpenContextMenu(rect.left, rect.bottom);
              }}
              aria-label={t('selectionpopover.more-actions')}
              aria-haspopup="dialog"
              className="flex h-8 w-8 items-center justify-center rounded-md text-slate-600 transition hover:bg-slate-100 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white"
            >
              <EllipsisIcon />
            </button>
          </HoverCard>
          <Divider />
        </>
      ) : null}

      {onEditText ? (
        <>
          <PopoverButton
            label={hasText ? t('selectionpopover.edit-text') : t('selectionpopover.add-text')}
            description={
              hasText
                ? t('selectionpopover.edit-this-element-s-text')
                : t('selectionpopover.give-this-element-a-text-label')
            }
            onClick={onEditText}
          >
            <TextIcon />
          </PopoverButton>
          <Divider />
        </>
      ) : null}

      {onEditPoints ? (
        <>
          <PopoverButton
            label={t('selectionpopover.edit-points')}
            description={t('selectionpopover.adjust-the-path-s-points-corners')}
            onClick={onEditPoints}
          >
            <EditPointsIcon />
          </PopoverButton>
          <Divider />
        </>
      ) : null}

      {onAddMindChild && onAddMindSibling ? (
        <>
          <PopoverButton
            label={MIND_CHILD_OPTION.label}
            description={MIND_CHILD_OPTION.description}
            onClick={onAddMindChild}
          >
            {MIND_CHILD_OPTION.icon}
          </PopoverButton>
          <PopoverButton
            label={MIND_SIBLING_OPTION.label}
            description={MIND_SIBLING_OPTION.description}
            onClick={onAddMindSibling}
          >
            {MIND_SIBLING_OPTION.icon}
          </PopoverButton>
          <Divider />
        </>
      ) : null}

      {onDuplicate ? (
        <>
          <PopoverButton
            label={t('selectionpopover.duplicate')}
            description={t('selectionpopover.create-a-copy-of-this-element')}
            onClick={onDuplicate}
          >
            <DuplicateIcon />
          </PopoverButton>
          <Divider />
        </>
      ) : null}

      {onBringToFront && onSendToBack ? (
        <>
          <PopoverButton
            label={t('selectionpopover.bring-to-front')}
            description={t('selectionpopover.stack-this-in-front-of-everything')}
            onClick={onBringToFront}
          >
            <BringToFrontIcon />
          </PopoverButton>
          <PopoverButton
            label={t('selectionpopover.send-to-back')}
            description={t('selectionpopover.stack-this-behind-everything-else-on')}
            onClick={onSendToBack}
          >
            <SendToBackIcon />
          </PopoverButton>
          <Divider />
        </>
      ) : null}

      {/* Comment stays on the toolbar (it's the only edit-adjacent
          action a view-role visitor gets, so it has to be reachable
          without right-clicking on a comment badge). For an editor
          session it duplicates the context menu entry, which is
          fine: comments are high-traffic and a one-click affordance
          beats a two-click context menu open + click. */}
      {onOpenComments ? (
        <PopoverButton
          label={t('selectionpopover.add-comment')}
          description={t('selectionpopover.open-the-comment-thread-for-this')}
          onClick={onOpenComments}
        >
          <CommentIcon />
        </PopoverButton>
      ) : null}

      {onToggleLock ? (
        <HoverCard
          title={locked ? 'Unlock' : 'Lock'}
          description={
            locked
              ? t('selectionpopover.allow-this-element-to-be-moved')
              : t('selectionpopover.protect-from-moves-resizes-and-deletion')
          }
        >
          <button
            type="button"
            onClick={onToggleLock}
            aria-label={locked ? 'Unlock' : 'Lock'}
            aria-pressed={locked}
            className={
              locked
                ? 'flex h-8 w-8 items-center justify-center rounded-md bg-brand-100 text-brand-700 dark:bg-brand-500/20 dark:text-brand-100'
                : 'flex h-8 w-8 items-center justify-center rounded-md text-slate-600 transition hover:bg-slate-100 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white'
            }
          >
            <LockIcon closed={locked} />
          </button>
        </HoverCard>
      ) : null}
      {showDelete ? (
        <>
          <HoverCard
            title={t('selectionpopover.delete')}
            description={
              locked
                ? t('selectionpopover.locked-unlock-it-to-delete')
                : t('selectionpopover.delete-this-element-arrows-too')
            }
          >
            <button
              type="button"
              onClick={onDelete}
              disabled={locked}
              aria-label={t('selectionpopover.delete-2')}
              className={
                locked
                  ? 'flex h-8 w-8 items-center justify-center rounded-md text-slate-300 dark:text-slate-400'
                  : 'flex h-8 w-8 items-center justify-center rounded-md text-slate-600 transition hover:bg-slate-100 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white'
              }
            >
              <TrashIcon />
            </button>
          </HoverCard>
        </>
      ) : null}
    </div>
  );
}

function Divider() {
  return <div aria-hidden className={TOOLBAR_DIVIDER} />;
}

function PopoverButton({
  label,
  description,
  onClick,
  children,
  active,
}: {
  label: string;
  description: string;
  onClick: () => void;
  children: React.ReactNode;
  active?: boolean;
}) {
  return (
    <HoverCard title={label} description={description}>
      <button
        type="button"
        onClick={onClick}
        aria-label={label}
        aria-pressed={active ? true : undefined}
        className={
          active
            ? 'flex h-8 w-8 items-center justify-center rounded-md bg-brand-100 text-brand-700 dark:bg-brand-500/20 dark:text-brand-100'
            : 'flex h-8 w-8 items-center justify-center rounded-md text-slate-600 transition hover:bg-slate-100 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white'
        }
      >
        {children}
      </button>
    </HoverCard>
  );
}
