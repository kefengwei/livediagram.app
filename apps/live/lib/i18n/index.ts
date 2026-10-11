'use client';

// The one way a component reads a user-visible string
// (docs/specs/004-interface-design/localization.md):
//
//   const { t } = useTranslation();
//   <button>{t('header.share.label')}</button>
//
// The locale itself lives in ./store (a module-level store read through
// useSyncExternalStore), so a switch reaches every consumer without a provider having to
// wrap the tree — and the first client render already knows the reader's language.

import { useCallback, useEffect } from 'react';
import { en } from './messages/en';
import { zh } from './messages/zh';
import { DEFAULT_LOCALE, setLocale, useLocale, type Locale } from './store';
import { lookup, type MessageTable } from './translate';

export { LOCALES, useLocale, setLocale, type Locale } from './store';
export type { MessageTable } from './translate';

/** The English table is the key space: every key used anywhere comes from here. */
export type MessageKey = keyof typeof en;

export type Translator = (key: MessageKey, vars?: Record<string, string | number>) => string;

const TABLES: Record<Locale, MessageTable> = { en, 'zh-CN': zh };

/** The table for a locale, for the rare caller that needs it directly (tests, `Intl`). */
export function tableFor(locale: Locale): MessageTable {
  return TABLES[locale] ?? TABLES[DEFAULT_LOCALE];
}

export function useTranslation(): {
  t: Translator;
  locale: Locale;
  setLocale: (next: Locale) => void;
} {
  const locale = useLocale();
  const t = useCallback<Translator>(
    (key, vars) => lookup(key, tableFor(locale), TABLES[DEFAULT_LOCALE], vars),
    [locale],
  );
  return { t, locale, setLocale };
}

/**
 * Keeps `<html lang>` honest while mounted. The static export ships `lang="en-GB"`;
 * a reader on another language gets the attribute corrected without a reload, which is
 * what screen readers and the browser's own hyphenation read.
 */
export function LanguageSync(): null {
  const locale = useLocale();
  useEffect(() => {
    document.documentElement.lang = locale;
  }, [locale]);
  return null;
}
