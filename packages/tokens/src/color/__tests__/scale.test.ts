import { converter } from 'culori';
import { describe, expect, it } from 'vitest';
import { SCALE_STEPS, type Palette } from '@dsg/contracts';
import { generateColorScale } from '../scale.js';

const toOklch = converter('oklch');
const toRgb = converter('rgb');

function palette(overrides: Partial<Palette> = {}): Palette {
  return { name: 'brand', baseColor: '#3b5bdb', hueShift: 0, chroma: 1, ...overrides };
}

describe('generateColorScale', () => {
  it('produces one color per scale step, in order', () => {
    const scale = generateColorScale(palette());

    expect(scale.map((color) => color.step)).toEqual([...SCALE_STEPS]);
  });

  it('decreases lightness strictly from 50 to 950', () => {
    const scale = generateColorScale(palette());

    for (let i = 1; i < scale.length; i += 1) {
      expect(scale[i]!.lightness).toBeLessThan(scale[i - 1]!.lightness);
    }
  });

  it('gives every palette the same lightness at the same step', () => {
    const brand = generateColorScale(palette({ baseColor: '#3b5bdb' }));
    const danger = generateColorScale(palette({ name: 'danger', baseColor: '#dc2626' }));

    expect(brand.map((color) => color.lightness)).toEqual(danger.map((color) => color.lightness));
  });

  it('stays inside the sRGB gamut', () => {
    // A vivid base is the case most likely to overflow once chroma is scaled up.
    const scale = generateColorScale(palette({ baseColor: '#00ff00', chroma: 1.5 }));

    for (const color of scale) {
      const rgb = toRgb(color.css)!;
      for (const channel of [rgb.r, rgb.g, rgb.b]) {
        expect(channel).toBeGreaterThanOrEqual(-1e-4);
        expect(channel).toBeLessThanOrEqual(1 + 1e-4);
      }
    }
  });

  it('anchors the ramp to the base color saturation', () => {
    const base = toOklch('#3b5bdb')!;
    const scale = generateColorScale(palette());

    // The step nearest the base in lightness should also be nearest in chroma.
    const anchor = scale.reduce((closest, candidate) =>
      Math.abs(candidate.lightness - base.l) < Math.abs(closest.lightness - base.l)
        ? candidate
        : closest,
    );

    expect(anchor.chroma).toBeCloseTo(base.c, 2);
  });

  it('scales the whole ramp when chroma is multiplied', () => {
    const normal = generateColorScale(palette());
    const muted = generateColorScale(palette({ chroma: 0.5 }));

    for (let i = 0; i < normal.length; i += 1) {
      expect(muted[i]!.chroma).toBeLessThanOrEqual(normal[i]!.chroma + 1e-9);
    }
    expect(muted[5]!.chroma).toBeCloseTo(normal[5]!.chroma / 2, 2);
  });

  it('produces a neutral ramp from a chroma of 0', () => {
    const scale = generateColorScale(palette({ chroma: 0 }));

    for (const color of scale) {
      expect(color.chroma).toBe(0);
    }
  });

  it('produces a near-neutral ramp from a grey base', () => {
    const scale = generateColorScale(palette({ name: 'neutral', baseColor: '#808080' }));

    for (const color of scale) {
      expect(color.chroma).toBeLessThan(0.01);
    }
  });

  it('rotates the dark end away from the light end when hueShift is set', () => {
    const shifted = generateColorScale(palette({ hueShift: 20 }));
    const lightest = shifted[0]!;
    const darkest = shifted.at(-1)!;

    // -20 at the light end, +20 at the dark end => 40 degrees apart.
    expect(darkest.hue - lightest.hue).toBeCloseTo(40, 0);
  });

  it('keeps hue within 0-360 when a shift crosses the boundary', () => {
    const scale = generateColorScale(palette({ baseColor: '#dc2626', hueShift: -60 }));

    for (const color of scale) {
      expect(color.hue).toBeGreaterThanOrEqual(0);
      expect(color.hue).toBeLessThan(360);
    }
  });

  it('emits parseable oklch and matching hex', () => {
    const scale = generateColorScale(palette());

    for (const color of scale) {
      expect(color.css).toMatch(/^oklch\(-?[\d.]+ [\d.]+ [\d.]+\)$/);
      expect(color.hex).toMatch(/^#[0-9a-f]{6}$/);
    }
  });

  it('is deterministic', () => {
    expect(generateColorScale(palette())).toEqual(generateColorScale(palette()));
  });

  it('throws on an unparseable base color', () => {
    expect(() => generateColorScale(palette({ baseColor: 'not-a-color' }))).toThrow(
      /Could not parse base color/,
    );
  });
});
