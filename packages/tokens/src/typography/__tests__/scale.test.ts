import { describe, expect, it } from 'vitest';
import { TEXT_STEPS } from '@dsg/contracts';
import { generateTypeScale } from '../scale.js';

const DEFAULT = { baseSizePx: 16, ratio: 1.25 };

describe('generateTypeScale', () => {
  it('produces every named step', () => {
    const steps = generateTypeScale(DEFAULT);

    expect(steps.map((step) => step.name)).toEqual(Object.keys(TEXT_STEPS));
  });

  it('renders the base step at exactly the configured size', () => {
    const base = generateTypeScale({ baseSizePx: 18, ratio: 1.333 }).find(
      (step) => step.name === 'base',
    );

    expect(base?.sizePx).toBe(18);
    expect(base?.sizeRem).toBeCloseTo(18 / 16, 4);
  });

  it('increases size monotonically', () => {
    const steps = generateTypeScale(DEFAULT);

    for (let i = 1; i < steps.length; i += 1) {
      expect(steps[i]!.sizePx).toBeGreaterThan(steps[i - 1]!.sizePx);
    }
  });

  it('applies the ratio between adjacent steps', () => {
    const steps = generateTypeScale(DEFAULT);

    for (let i = 1; i < steps.length; i += 1) {
      expect(steps[i]!.sizePx / steps[i - 1]!.sizePx).toBeCloseTo(DEFAULT.ratio, 3);
    }
  });

  it('spreads a larger ratio further', () => {
    const tight = generateTypeScale({ baseSizePx: 16, ratio: 1.125 });
    const loose = generateTypeScale({ baseSizePx: 16, ratio: 1.5 });

    const largest = TEXT_STEPS['5xl'];
    expect(largest).toBeGreaterThan(0);
    expect(loose.at(-1)!.sizePx).toBeGreaterThan(tight.at(-1)!.sizePx);
  });

  it('tightens line height as size grows', () => {
    const steps = generateTypeScale(DEFAULT);

    for (let i = 1; i < steps.length; i += 1) {
      expect(steps[i]!.lineHeight).toBeLessThanOrEqual(steps[i - 1]!.lineHeight);
    }
  });

  it('keeps line height within a usable band', () => {
    const steps = generateTypeScale({ baseSizePx: 24, ratio: 2 });

    for (const step of steps) {
      expect(step.lineHeight).toBeGreaterThanOrEqual(1.05);
      expect(step.lineHeight).toBeLessThanOrEqual(1.75);
    }
  });

  it('gives the base step neutral tracking whatever the base size', () => {
    for (const baseSizePx of [12, 16, 20, 24]) {
      const base = generateTypeScale({ baseSizePx, ratio: 1.25 }).find(
        (step) => step.name === 'base',
      );
      expect(base?.letterSpacingEm).toBe(0);
    }
  });

  it('tracks large text negatively and small text positively', () => {
    const steps = generateTypeScale(DEFAULT);
    const xs = steps.find((step) => step.name === 'xs')!;
    const display = steps.find((step) => step.name === '5xl')!;

    expect(xs.letterSpacingEm).toBeGreaterThan(0);
    expect(display.letterSpacingEm).toBeLessThan(0);
  });
});
