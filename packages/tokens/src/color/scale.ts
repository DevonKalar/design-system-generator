import { clampChroma, converter, formatHex } from 'culori';
import type { Palette, ScaleStep } from '@dsg/contracts';

const toOklch = converter('oklch');

/**
 * The shape of every generated ramp.
 *
 * `lightness` is fixed per step rather than derived from the user's base color, so step 500
 * has the same perceptual lightness in every palette of every system. That predictability is
 * what makes the semantic layer safe: swapping `primary` from brand-600 to danger-600 cannot
 * silently change a contrast ratio. The cost is that a user's exact base color is snapped to
 * its nearest step rather than reproduced verbatim.
 *
 * `chromaFactor` is relative, not absolute — it is scaled by the base color's own saturation
 * (see `generateColorScale`). The curve peaks at 600/700 and falls off at both ends because
 * near-white and near-black cannot hold much chroma without leaving sRGB.
 */
const RAMP = [
  { step: 50, lightness: 0.971, chromaFactor: 0.057 },
  { step: 100, lightness: 0.932, chromaFactor: 0.131 },
  { step: 200, lightness: 0.882, chromaFactor: 0.253 },
  { step: 300, lightness: 0.809, chromaFactor: 0.429 },
  { step: 400, lightness: 0.707, chromaFactor: 0.694 },
  { step: 500, lightness: 0.623, chromaFactor: 0.873 },
  { step: 600, lightness: 0.546, chromaFactor: 1 },
  { step: 700, lightness: 0.488, chromaFactor: 1 },
  { step: 800, lightness: 0.424, chromaFactor: 0.91 },
  { step: 900, lightness: 0.379, chromaFactor: 0.751 },
  { step: 950, lightness: 0.282, chromaFactor: 0.371 },
] as const satisfies ReadonlyArray<{
  step: ScaleStep;
  lightness: number;
  chromaFactor: number;
}>;

export interface ScaleColor {
  step: ScaleStep;
  /** CSS `oklch(...)` string — this is what gets emitted into stylesheets. */
  css: string;
  /** sRGB hex, for UI swatches and contrast math. */
  hex: string;
  lightness: number;
  chroma: number;
  hue: number;
}

function round(value: number, places: number): number {
  const factor = 10 ** places;
  return Math.round(value * factor) / factor;
}

/**
 * Expands a base color into an 11-step ramp.
 *
 * The base color's chroma is transferred onto the curve by anchoring: whichever step sits
 * closest to the base color in lightness is scaled to match the base color's chroma exactly,
 * and every other step follows the curve from there. So a muted base yields a muted ramp and
 * a vivid base yields a vivid one, without the caller specifying an intensity.
 */
export function generateColorScale(palette: Palette): ScaleColor[] {
  const base = toOklch(palette.baseColor);
  if (!base) {
    throw new Error(
      `Could not parse base color "${palette.baseColor}" for palette "${palette.name}"`,
    );
  }

  // culori leaves hue undefined for achromatic colors; 0 keeps the arithmetic total.
  const baseHue = base.h ?? 0;
  const baseChroma = base.c;

  const anchor = RAMP.reduce((closest, candidate) =>
    Math.abs(candidate.lightness - base.l) < Math.abs(closest.lightness - base.l)
      ? candidate
      : closest,
  );

  const chromaScale = (baseChroma / anchor.chromaFactor) * palette.chroma;

  return RAMP.map(({ step, lightness, chromaFactor }, index) => {
    // -1 at the lightest step, +1 at the darkest, so hueShift reads as "how far the dark end
    // rotates". Tints drifting warm while shades drift cool is what stops a ramp looking
    // like a single color at different opacities.
    const position = (index / (RAMP.length - 1)) * 2 - 1;
    const hue = (((baseHue + palette.hueShift * position) % 360) + 360) % 360;

    // Round lightness and hue *before* clamping: rounding afterwards moves the color a
    // little, which is enough to push a gamut-edge result back outside.
    const l = round(lightness, 4);
    const h = round(hue, 2);

    // Out-of-gamut oklch is legal CSS but renders inconsistently and breaks contrast math,
    // so pull chroma down until the color fits sRGB.
    const clamped = clampChroma(
      { mode: 'oklch', l, c: chromaFactor * chromaScale, h },
      'oklch',
      'rgb',
    );

    // Floor rather than round, so the 4-decimal truncation can only ever move inward.
    const c = Math.floor(clamped.c * 1e4) / 1e4;

    return {
      step,
      css: `oklch(${l} ${c} ${h})`,
      hex: formatHex({ mode: 'oklch', l, c, h }),
      lightness: l,
      chroma: c,
      hue: h,
    };
  });
}
