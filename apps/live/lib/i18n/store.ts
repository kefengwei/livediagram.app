'use client';

// Where the live app's locale comes from, and how a change reaches every reader
// (docs/specs/004-interface-design/localization.md). Deliberately NOT part of the URL: the
// editor is a signed-in application, so a language change must not navigate or reload a
// canvas mid-edit.

import { useSyncExternalStore } from 'react';

export const LOCALES = ['en', 'zh-CN'] as const;
export type Locale = (typeof LOCALES)[number];

/** The source language, and the fallback for any key a translation is missing. */
export const DEFAULT_LOCALE: Locale = 'en';

const STORAGE_KEY = 'livediagram:language';

export function isLocale(value: unknown): value is Locale {
  return typeof value === 'string' && (LOCALES as readonly string[]).includes(value);
}

/**
 * The shipped locale a BCP 47 tag asks for: `zh-Hans-CN` and `zh-TW` both land on
 * `zh-CN`, because a reader who asked for Chinese is better served by the one Chinese
 * table we have than by English.
 */
export function matchLocale(tag: string | null | undefined): Locale | null {
  if (!tag) return null;
  const lower = tag.toLowerCase();
  if (lower === 'en' || lower.startsWith('en-')) return 'en';
  if (lower === 'zh' || lower.startsWith('zh-')) return 'zh-CN';
  return null;
}

function fromUrl(): Locale | null {
  if (typeof window === 'undefined') return null;
  try {
    return matchLocale(new URLSearchParams(window.location.search).get('lang'));
  } catch {
    return null;
  }
}

function fromStorage(): Locale | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return isLocale(raw) ? raw : null;
  } catch {
    return null;
  }
}

function fromNavigator(): Locale | null {
  if (typeof navigator === 'undefined') return null;
  for (const tag of navigator.languages ?? []) {
    const hit = matchLocale(tag);
    if (hit) return hit;
  }
  return matchLocale(navigator.language);
}

/** Detection order: `?lang=` → the stored choice → the browser → English. */
export function detectLocale(): Locale {
  return fromUrl() ?? fromStorage() ?? fromNavigator() ?? DEFAULT_LOCALE;
}

// One module-level value, read through useSyncExternalStore: the server snapshot is
// English (what the static export was built with) and the client snapshot is the real
// choice, so hydration never disagrees — and no effect has to run before the reader sees
// their own language.
let current: Locale | null = null;
const listeners = new Set<() => void>();

export function getLocaleSnapshot(): Locale {
  current ??= detectLocale();
  return current;
}

export function getLocaleServerSnapshot(): Locale {
  return DEFAULT_LOCALE;
}

export function subscribeLocale(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/**
 * Switch language. Instant, in place: no navigation, no reload.
 *
 * The choice is remembered even when it matches what detection already produced — a
 * reader whose browser asks for Chinese and who picks English means it — but only a
 * CHANGE notifies subscribers, so re-picking the current language costs no re-render.
 */
export function setLocale(next: Locale): void {
  const changed = getLocaleSnapshot() !== next;
  current = next;
  try {
    window.localStorage.setItem(STORAGE_KEY, next);
  } catch {
    // A blocked storage (private mode) costs the reader their choice next visit, not this one.
  }
  if (changed) for (const listener of listeners) listener();
}

/** Test seam: forget the cached choice so a fresh detection runs. */
export function resetLocaleForTests(): void {
  current = null;
  listeners.clear();
}

export function useLocale(): Locale {
  return useSyncExternalStore(subscribeLocale, getLocaleSnapshot, getLocaleServerSnapshot);
}
