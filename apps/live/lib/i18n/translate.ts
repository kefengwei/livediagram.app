// Message lookup, as pure functions so they can be tested without React
// (docs/specs/004-interface-design/localization.md).

export type MessageTable = Record<string, string>;

/** Fills `{name}` placeholders. An unknown placeholder is left as written. */
export function interpolate(template: string, vars?: Record<string, string | number>): string {
  if (!vars) return template;
  return template.replace(/\{(\w+)\}/g, (whole, name: string) =>
    name in vars ? String(vars[name]) : whole,
  );
}

/**
 * One key, in the reader's language, falling back to English and then to the key itself.
 * Never an empty string: a missing translation shows the English sentence, which is a
 * bug somebody will report, rather than a hole nobody notices.
 */
export function lookup(
  key: string,
  table: MessageTable,
  fallback: MessageTable,
  vars?: Record<string, string | number>,
): string {
  const raw = table[key] ?? fallback[key] ?? key;
  return interpolate(raw, vars);
}

/** Keys present in the source table and missing from a translation. */
export function missingKeys(source: MessageTable, translation: MessageTable): string[] {
  return Object.keys(source).filter((key) => !(key in translation));
}

/** Keys a translation has that the source does not — dead entries. */
export function extraKeys(source: MessageTable, translation: MessageTable): string[] {
  return Object.keys(translation).filter((key) => !(key in source));
}

/** BCP 47 tag for `Intl`, so dates and numbers follow the interface language. */
export function intlLocale(locale: string): string {
  return locale;
}
