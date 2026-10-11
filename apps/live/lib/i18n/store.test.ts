// @vitest-environment jsdom

// Detection order and instant switching (docs/specs/004-interface-design/localization.md).

import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  DEFAULT_LOCALE,
  detectLocale,
  getLocaleSnapshot,
  matchLocale,
  resetLocaleForTests,
  setLocale,
  subscribeLocale,
} from './store';

afterEach(() => {
  resetLocaleForTests();
  window.localStorage.clear();
  window.history.replaceState({}, '', '/');
});

describe('matchLocale', () => {
  it('maps a region variant onto the shipped table', () => {
    expect(matchLocale('zh-Hans-CN')).toBe('zh-CN');
    expect(matchLocale('zh-TW')).toBe('zh-CN');
    expect(matchLocale('en-GB')).toBe('en');
  });

  it('ignores a language we do not ship', () => {
    expect(matchLocale('fr-FR')).toBeNull();
    expect(matchLocale(null)).toBeNull();
  });
});

describe('detectLocale', () => {
  it('reads ?lang= first', () => {
    window.history.replaceState({}, '', '/document/abc?lang=zh-CN');
    window.localStorage.setItem('livediagram:language', 'en');
    expect(detectLocale()).toBe('zh-CN');
  });

  it('then the stored choice', () => {
    window.localStorage.setItem('livediagram:language', 'zh-CN');
    expect(detectLocale()).toBe('zh-CN');
  });

  it('then the browser, and English last', () => {
    vi.spyOn(navigator, 'languages', 'get').mockReturnValue(['zh-CN', 'en']);
    expect(detectLocale()).toBe('zh-CN');
    vi.spyOn(navigator, 'languages', 'get').mockReturnValue(['fr-FR']);
    expect(detectLocale()).toBe(DEFAULT_LOCALE);
  });
});

describe('switching', () => {
  it('notifies every subscriber and persists the choice', () => {
    const seen: string[] = [];
    const unsubscribe = subscribeLocale(() => seen.push(getLocaleSnapshot()));
    setLocale('zh-CN');
    expect(seen).toEqual(['zh-CN']);
    expect(window.localStorage.getItem('livediagram:language')).toBe('zh-CN');
    unsubscribe();
  });

  it('does nothing when the language does not change', () => {
    const listener = vi.fn();
    subscribeLocale(listener);
    setLocale(DEFAULT_LOCALE);
    expect(listener).not.toHaveBeenCalled();
  });
});
