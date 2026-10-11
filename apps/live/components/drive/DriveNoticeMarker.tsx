'use client';

// The unseen-folder mark on a document's Explorer row
// (docs/specs/022-drive-mirror/drive-mirror.md, "Folders livediagram cannot see").

import { useTranslation } from '@/lib/i18n';
import { lucideFolderLock } from '@livediagram/icons/lucide';
import { HoverCard, lucideGlyph } from '@livediagram/ui';
import { DRIVE_NOTICE_TEXT } from '@/lib/drive/cloud-sync-copy';
import { useDriveNotice } from './drive-mirror-context';

// Vendored Lucide glyph (docs/specs/004-interface-design/iconography.md): a
// folder livediagram has no access to.
const FolderLockGlyph = lucideGlyph(lucideFolderLock, 13);

export function DriveNoticeMarker({ documentId }: { documentId: string }) {
  const { t } = useTranslation();
  const notice = useDriveNotice(documentId);
  if (!notice) return null;
  return (
    <HoverCard
      title={t('drivenoticemarker.in-a-folder-livediagram-can-t')}
      description={t('drivenoticemarker.open-settings-account-cloud-sync-to')}
    >
      <span
        aria-label={DRIVE_NOTICE_TEXT}
        className="inline-flex shrink-0 items-center text-amber-600 dark:text-amber-400"
      >
        <FolderLockGlyph />
      </span>
    </HoverCard>
  );
}
