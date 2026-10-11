'use client';

// New Card in Plan mode's bottom-right strip (docs/specs/026-plan/items.md "New Card"): a + between the Trash and
// Find a Card, for someone who may edit. It opens the New Card panel above it (NewCardPanel), pointing at it.
import { useTranslation } from '@/lib/i18n';
import { PlusIcon } from '@livediagram/ui';
import { ClusterPopoverSegment } from './ClusterPopoverButton';

export function NewCardSegment({
  divided,
  open,
  onToggle,
}: {
  divided: boolean;
  open: boolean;
  onToggle: (button: HTMLElement) => void;
}) {
  const { t } = useTranslation();
  return (
    <ClusterPopoverSegment
      divided={divided}
      label={t('newcardclusterbutton.new-card')}
      hoverTitle="New Card"
      hoverDescription="Make a card of any type here and now, then put it on a board when you are ready."
      icon={<PlusIcon size={18} />}
      popoverOpen={open}
      onTogglePopover={onToggle}
    />
  );
}
