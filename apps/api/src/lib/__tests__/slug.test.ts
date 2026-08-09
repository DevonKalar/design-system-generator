import { describe, expect, it } from 'vitest';
import { slugify } from '../slug.js';

describe('slugify', () => {
  it.each([
    ['Acme Design', 'acme-design'],
    ['  Leading and trailing  ', 'leading-and-trailing'],
    ['Multiple   spaces', 'multiple-spaces'],
    ['UPPERCASE', 'uppercase'],
    ['with_underscores', 'with-underscores'],
    ['punctuation!!!here', 'punctuation-here'],
    ['Café Noir', 'cafe-noir'],
    ['v2.0 tokens', 'v2-0-tokens'],
  ])('turns %j into %j', (input, expected) => {
    expect(slugify(input)).toBe(expected);
  });

  it('falls back when nothing slug-safe survives', () => {
    // Names in non-Latin scripts reduce to nothing, and a system still needs a URL.
    expect(slugify('!!!')).toBe('design-system');
    expect(slugify('日本語')).toBe('design-system');
    expect(slugify('')).toBe('design-system');
  });

  it('truncates long names without leaving a trailing separator', () => {
    const slug = slugify('a'.repeat(80));

    expect(slug).toHaveLength(60);
    expect(slug.endsWith('-')).toBe(false);
  });

  it('never leaves a leading or trailing separator', () => {
    for (const input of ['---leading', 'trailing---', '  spaced  ', '!@#middle$%^']) {
      const slug = slugify(input);
      expect(slug.startsWith('-')).toBe(false);
      expect(slug.endsWith('-')).toBe(false);
    }
  });
});
