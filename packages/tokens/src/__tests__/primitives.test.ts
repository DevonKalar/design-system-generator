import { describe, expect, it } from 'vitest';
import { RADIUS_STEPS, SHADOW_STEPS, SPACING_STEPS } from '@dsg/contracts';
import { generateRadii } from '../radii.js';
import { generateShadows } from '../shadows.js';
import { generateSpacing } from '../spacing.js';

describe('generateSpacing', () => {
  it('converts the base unit to rem', () => {
    expect(generateSpacing({ basePx: 4 }).baseRem).toBe(0.25);
    expect(generateSpacing({ basePx: 8 }).baseRem).toBe(0.5);
  });

  it('emits one token per step', () => {
    expect(generateSpacing({ basePx: 4 }).tokens).toHaveLength(SPACING_STEPS.length);
  });

  it('produces CSS-safe names, since a dot is not a valid ident character', () => {
    const { tokens } = generateSpacing({ basePx: 4 });

    for (const token of tokens) {
      expect(token.name).not.toContain('.');
      expect(token.name).toMatch(/^[0-9]+(-[0-9]+)?$/);
    }
    expect(tokens.find((token) => token.multiplier === 0.5)?.name).toBe('0-5');
  });

  it('scales each token by its multiplier', () => {
    const { tokens } = generateSpacing({ basePx: 4 });

    expect(tokens.find((token) => token.multiplier === 4)?.rem).toBe(1);
    expect(tokens.find((token) => token.multiplier === 0)?.rem).toBe(0);
  });
});

describe('generateRadii', () => {
  it('emits every named step', () => {
    expect(generateRadii({ basePx: 8 }).map((radius) => radius.name)).toEqual(
      Object.keys(RADIUS_STEPS),
    );
  });

  it('scales finite steps from the base unit', () => {
    const radii = generateRadii({ basePx: 8 });

    expect(radii.find((radius) => radius.name === 'none')?.value).toBe('0rem');
    expect(radii.find((radius) => radius.name === 'md')?.value).toBe('0.5rem');
    expect(radii.find((radius) => radius.name === 'lg')?.value).toBe('0.75rem');
  });

  it('renders `full` as a fixed pill value independent of the base', () => {
    for (const basePx of [0, 4, 24]) {
      expect(generateRadii({ basePx }).find((radius) => radius.name === 'full')?.value).toBe(
        '9999px',
      );
    }
  });
});

describe('generateShadows', () => {
  it('emits every tier', () => {
    expect(generateShadows({ color: '#0a0a0a', strength: 1 }).map((s) => s.name)).toEqual([
      ...SHADOW_STEPS,
    ]);
  });

  it('uses the configured color channels', () => {
    const shadows = generateShadows({ color: '#ff0000', strength: 1 });

    expect(shadows[0]!.value).toContain('rgb(255 0 0 /');
  });

  it('scales opacity by strength and disables shadows entirely at 0', () => {
    const strong = generateShadows({ color: '#0a0a0a', strength: 2 });
    const none = generateShadows({ color: '#0a0a0a', strength: 0 });

    expect(strong[0]!.value).toContain('/ 0.1)');
    for (const shadow of none) {
      expect(shadow.value).not.toMatch(/\/ 0\.[1-9]/);
      expect(shadow.value).toContain('/ 0)');
    }
  });

  it('layers higher tiers for depth', () => {
    const shadows = generateShadows({ color: '#0a0a0a', strength: 1 });
    const sm = shadows.find((shadow) => shadow.name === 'sm')!;
    const xl = shadows.find((shadow) => shadow.name === 'xl')!;

    expect(sm.value.split(',')).toHaveLength(1);
    expect(xl.value.split(',')).toHaveLength(2);
  });

  it('throws on an unparseable shadow color', () => {
    expect(() => generateShadows({ color: 'nope', strength: 1 })).toThrow(
      /Could not parse shadow color/,
    );
  });
});
