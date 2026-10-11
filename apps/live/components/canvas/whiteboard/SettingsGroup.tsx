'use client';

// The dock's Settings group (docs/specs/023-draw-mode/draw-mode.md "What a whiteboard shows"): the
// cog on its own, last. It opens the Settings flyout on a press only, never on hover.

import { useTranslation } from '@/lib/i18n';
import { DockButton, DockToolbar } from './DockToolbar';
import type { DockFlyoutApi } from './useDockFlyout';
import { SettingsGlyph } from './whiteboard-icons';

export function SettingsGroup({ fly }: { fly: DockFlyoutApi }) {
  const { t } = useTranslation();
  return (
    <DockToolbar label={t('settingsgroup.settings')} group="settings">
      <DockButton
        itemKey="settings"
        label={t('settingsgroup.settings-2')}
        icon={<SettingsGlyph />}
        controls={{ id: 'whiteboard-flyout-settings', expanded: fly.flyout?.kind === 'settings' }}
        onPress={(el) => fly.toggle('settings', el)}
      />
    </DockToolbar>
  );
}
