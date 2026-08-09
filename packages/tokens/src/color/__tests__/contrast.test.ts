import { describe, expect, it } from 'vitest';
import { contrastRatio, gradeContrast, relativeLuminance } from '../contrast.js';

describe('relativeLuminance', () => {
  it('matches the WCAG reference endpoints', () => {
    expect(relativeLuminance('#000000')).toBe(0);
    expect(relativeLuminance('#ffffff')).toBe(1);
  });

  it('weights green above red above blue', () => {
    expect(relativeLuminance('#00ff00')).toBeGreaterThan(relativeLuminance('#ff0000'));
    expect(relativeLuminance('#ff0000')).toBeGreaterThan(relativeLuminance('#0000ff'));
  });
});

describe('contrastRatio', () => {
  it('returns 21 for black on white', () => {
    expect(contrastRatio('#000000', '#ffffff')).toBeCloseTo(21, 5);
  });

  it('returns 1 for a color against itself', () => {
    expect(contrastRatio('#3b5bdb', '#3b5bdb')).toBeCloseTo(1, 5);
  });

  it('is order-independent', () => {
    expect(contrastRatio('#3b5bdb', '#ffffff')).toBeCloseTo(
      contrastRatio('#ffffff', '#3b5bdb'),
      10,
    );
  });

  it('matches a known reference pair', () => {
    // #767676 on white is the canonical "exactly 4.54:1" WCAG example.
    expect(contrastRatio('#767676', '#ffffff')).toBeCloseTo(4.54, 2);
  });

  it('accepts oklch input, not just hex', () => {
    expect(contrastRatio('oklch(0 0 0)', 'oklch(1 0 0)')).toBeCloseTo(21, 3);
  });

  it('throws on an unparseable color', () => {
    expect(() => contrastRatio('nonsense', '#ffffff')).toThrow(/Could not parse color/);
  });
});

describe('gradeContrast', () => {
  it.each([
    [21, 'aaa'],
    [7, 'aaa'],
    [6.99, 'aa'],
    [4.5, 'aa'],
    [4.49, 'aa-large'],
    [3, 'aa-large'],
    [2.99, 'fail'],
    [1, 'fail'],
  ])('grades %s as %s', (ratio, expected) => {
    expect(gradeContrast(ratio)).toBe(expected);
  });
});
