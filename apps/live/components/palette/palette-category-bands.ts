import type { MessageKey } from '@/lib/i18n';

// The category dropdown's bands, in order (docs/specs/010-palette/palette-top-level-categories.md).
// Tabs are listed in band order in the caller's `tabs` array, so the grid renders them under
// these headings without a sort.
// KEYS beside the English: the dropdown translates, this table cannot (docs/specs/004-interface-design/localization.md).
export const CATEGORY_BAND_KEYS: Record<number, MessageKey> = {
  0: 'palette.band.common',
  1: 'palette.band.structure',
  2: 'palette.band.decorate',
  3: 'palette.band.dynamic',
  4: 'palette.band.boards-cards',
  5: 'palette.band.spreadsheets',
};

export const CATEGORY_BANDS: Record<number, string> = {
  0: 'Common',
  // Structure (docs/specs/010-palette/palette-top-level-categories.md): the elements you lay a diagram OUT with — Build's
  // containers, the ready-made Components, the device frames. They sit above
  // Decorate because arranging the canvas comes before dressing it.
  1: 'Structure',
  2: 'Decorate',
  3: 'Dynamic',
  // Plan mode's Boards and Cards (docs/specs/026-plan/plan-mode.md "The palette"), listed first in
  // that mode, straight after Popular.
  4: 'Boards & Cards',
  // Plan mode's Sheets (docs/specs/029-sheets/sheet.md "Placing a sheet"), after Boards & Cards.
  5: 'Spreadsheets',
};
