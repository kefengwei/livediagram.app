// The message tables and the lookup rules (docs/specs/004-interface-design/localization.md).
// A translation that drifts from the source table is a bug whether or not TypeScript
// catches it, so the tables are compared at runtime too.

import { describe, expect, it } from 'vitest';
import { en } from './messages/en';
import { zh } from './messages/zh';
import { extraKeys, interpolate, lookup, missingKeys } from './translate';

describe('message tables', () => {
  it('translates every English key, and invents none', () => {
    expect(missingKeys(en, zh)).toEqual([]);
    expect(extraKeys(en, zh)).toEqual([]);
  });

  it('has no empty message', () => {
    for (const [key, value] of Object.entries({ ...en, ...zh })) {
      expect(value.trim(), key).not.toBe('');
    }
  });
});

describe('interpolate', () => {
  it('fills named placeholders', () => {
    expect(interpolate('Hello {name}, {count} files', { name: 'Ada', count: 3 })).toBe(
      'Hello Ada, 3 files',
    );
  });

  it('leaves an unknown placeholder as written', () => {
    expect(interpolate('Hello {name}', {})).toBe('Hello {name}');
  });

  it('returns the template untouched when there are no vars', () => {
    expect(interpolate('Plain {text}')).toBe('Plain {text}');
  });
});

describe('lookup', () => {
  it("prefers the reader's language", () => {
    expect(lookup('header.share.label', zh, en)).toBe('分享');
  });

  it('falls back to English for a key the translation lacks', () => {
    expect(lookup('header.share.label', {}, en)).toBe('Share');
  });

  it('falls back to the key itself when neither table has it', () => {
    expect(lookup('nope.not.here', zh, en)).toBe('nope.not.here');
  });
});
