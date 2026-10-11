'use client';

// Asked before a merge that would drop values (docs/specs/029-sheets/sheet.md "Merge"): the toolbar's Merge menu and
// the cell menu ask the same thing, naming the range.
import { useTranslation } from '@/lib/i18n';
import { Button } from '@livediagram/ui';
import { formatRange, type GridRange } from '@livediagram/sheets';

export function SheetMergeConfirm({
  range,
  onCancel,
  onMerge,
}: {
  range: GridRange;
  onCancel: () => void;
  onMerge: () => void;
}) {
  const { t } = useTranslation();
  return (
    <div className="w-64 px-3 py-2 text-[13px]" role="alertdialog" aria-label={t('sheetmergeconfirm.merge-cells')}>
      <p>{t('sheetmergeconfirm.merging-keeps-only-the-top-left')}{formatRange(range)}?</p>
      <div className="mt-2 flex justify-end gap-2">
        <Button variant="ghost" size="xs" onClick={onCancel}>{t('sheetmergeconfirm.cancel')}</Button>
        <Button variant="primary" size="xs" onClick={onMerge}>{t('sheetmergeconfirm.merge')}</Button>
      </div>
    </div>
  );
}
