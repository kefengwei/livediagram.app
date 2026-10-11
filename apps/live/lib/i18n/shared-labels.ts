import type { MessageKey } from './index';

// The live side's translations for copy that lives in a SHARED package
// (docs/specs/004-interface-design/localization.md). `@livediagram/ui` and
// `@livediagram/document` cannot call `t`: they ship to marketing, help and community too,
// and their strings have no locale there. So the map lives here, beside the only app that
// translates today, and a missing entry is a compile error rather than a silent English word.
//
// Leave a value out of the translation table to keep a word as-is on purpose (a product
// name like "Plan", a brand).

import type { AppearanceSetting } from '@livediagram/ui';
import type { EditorMode } from '@livediagram/document';

/** The appearance control's three states, as the shared package names them. */
export const APPEARANCE_LABEL_KEY: Record<AppearanceSetting, MessageKey> = {
  light: 'settings.appearance.light',
  dark: 'settings.appearance.dark',
  system: 'settings.appearance.system',
};

/** What each state means, for the control's hover card. */
export const APPEARANCE_DESCRIPTION_KEY: Record<AppearanceSetting, MessageKey> = {
  light: 'appearance.description.light',
  dark: 'appearance.description.dark',
  system: 'appearance.description.system',
};

/** The editor's modes, as the shared catalogue names them. */
export const EDITOR_MODE_LABEL_KEY: Record<EditorMode, MessageKey> = {
  diagram: 'editormode.diagram',
  draw: 'editormode.draw',
  illustrate: 'editormode.illustrate',
  plan: 'editormode.plan',
};
