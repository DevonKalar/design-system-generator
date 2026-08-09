import { TEXT_STEPS, type TextStep } from '@dsg/contracts';

/** CSS `rem` is relative to the document root, which is 16px unless the app overrides it. */
const ROOT_FONT_SIZE_PX = 16;

export interface TypeScaleStep {
  name: TextStep;
  sizePx: number;
  sizeRem: number;
  lineHeight: number;
  letterSpacingEm: number;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function round(value: number, places: number): number {
  const factor = 10 ** places;
  const rounded = Math.round(value * factor) / factor;
  // Adding zero collapses -0 to 0, which keeps `-0em` out of the emitted CSS.
  return rounded + 0;
}

/**
 * Expands a base size and ratio into the named type scale.
 *
 * Line height and tracking are derived from the resulting size rather than configured per
 * step: large text needs proportionally less leading and slightly negative tracking to avoid
 * looking loose, and small text needs the opposite. Both curves are centred so that text at
 * exactly the base size gets neutral tracking, whatever base size the user picked.
 */
export function generateTypeScale(typography: {
  baseSizePx: number;
  ratio: number;
}): TypeScaleStep[] {
  const entries = Object.entries(TEXT_STEPS) as Array<[TextStep, number]>;

  return entries.map(([name, exponent]) => {
    const sizePx = typography.baseSizePx * typography.ratio ** exponent;

    const lineHeight = clamp(1.72 - 0.45 * Math.log2(sizePx / 12), 1.05, 1.75);
    const letterSpacingEm = clamp(
      -0.022 * Math.log2(sizePx / typography.baseSizePx),
      -0.045,
      0.015,
    );

    return {
      name,
      sizePx: round(sizePx, 3),
      sizeRem: round(sizePx / ROOT_FONT_SIZE_PX, 4),
      lineHeight: round(lineHeight, 3),
      letterSpacingEm: round(letterSpacingEm, 4),
    };
  });
}
