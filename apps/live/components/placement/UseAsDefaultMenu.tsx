'use client';

import { useTranslation } from '@/lib/i18n';
import { MenuFlyoutSection } from '@/components/primitives/MenuFlyoutSection';
import { MenuCheckRow } from '@/components/primitives/MenuCheckRow';
import { MenuHeader } from '@/components/primitives/PortalMenu';
import type { DefaultFolderMenu } from '@/hooks/persistence/useDefaultFolderMenus';
import { DEFAULT_KEY_ENTRIES } from '@/lib/placement-defaults/default-key-entries';
import { DefaultKeyIcon, UseAsDefaultIcon } from './default-key-icons';

// "Use as default for" (docs/specs/013-workspace/default-folders.md "Use as default for"): a plain
// verb row of the folder menu (and My documents' menu) opening the entries of "New documents that
// open as", each checkable. It stays open after a choice (blueprint D107), so several entries can be
// set in one visit; the checks follow the store at once.
export function UseAsDefaultMenu({ menu }: { menu: DefaultFolderMenu }) {
  const { t } = useTranslation();
  return (
    <MenuFlyoutSection plain flush title={t('useasdefaultmenu.use-as-default-for')} icon={<UseAsDefaultIcon />}>
      <MenuHeader title={t('useasdefaultmenu.new-documents-that-open-as')} />
      {DEFAULT_KEY_ENTRIES.map((entry) => (
        <MenuCheckRow
          key={entry.key}
          label={entry.label}
          icon={<DefaultKeyIcon entryKey={entry.key} />}
          checked={menu.isChecked(entry.key)}
          disabled={menu.isDisabled(entry.key)}
          onToggle={() => menu.toggle(entry.key)}
        />
      ))}
    </MenuFlyoutSection>
  );
}
