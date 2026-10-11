'use client';

// The language switch (docs/specs/004-interface-design/localization.md "Switching").
// A reader who cannot read the interface cannot find a settings dialog by reading it, so
// this sits in the editor header as well as in Settings.

import { SOLID_BRAND_DARK_CONTROL } from '@livediagram/ui';
import { LOCALES, useTranslation, type Locale } from '@/lib/i18n';

const LABELS: Record<Locale, string> = {
  en: 'EN',
  'zh-CN': '中文',
};

const TITLES: Record<Locale, string> = {
  en: 'English',
  'zh-CN': '简体中文',
};

export function LanguageToggle({ className = '' }: { className?: string }) {
  const { locale, setLocale, t } = useTranslation();
  return (
    <div
      role="group"
      aria-label={t('language.switchTo')}
      className={`flex items-center gap-0.5 rounded-md border border-slate-200 bg-white p-0.5 dark:border-slate-700 dark:bg-slate-900 ${className}`}
    >
      {LOCALES.map((option) => {
        const active = option === locale;
        return (
          <button
            key={option}
            type="button"
            onClick={() => setLocale(option)}
            aria-pressed={active}
            title={TITLES[option]}
            className={`rounded px-1.5 py-0.5 text-xs font-medium transition ${
              active
                ? `bg-brand-500 text-white ${SOLID_BRAND_DARK_CONTROL}`
                : 'text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800'
            }`}
          >
            {LABELS[option]}
          </button>
        );
      })}
    </div>
  );
}
