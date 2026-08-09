import { SPACING_STEPS } from '@dsg/contracts';

const ROOT_FONT_SIZE_PX = 16;

export interface SpacingToken {
  /** Multiplier with `.` swapped for `-`, since `.` is not valid in a CSS ident. */
  name: string;
  multiplier: number;
  rem: number;
}

export interface GeneratedSpacing {
  /** Tailwind v4 derives every spacing utility from this single value. */
  baseRem: number;
  tokens: SpacingToken[];
}

export function generateSpacing(spacing: { basePx: number }): GeneratedSpacing {
  const baseRem = spacing.basePx / ROOT_FONT_SIZE_PX;

  return {
    baseRem: Math.round(baseRem * 1e4) / 1e4,
    tokens: SPACING_STEPS.map((multiplier) => ({
      name: String(multiplier).replace('.', '-'),
      multiplier,
      rem: Math.round(baseRem * multiplier * 1e4) / 1e4,
    })),
  };
}
