import { RADIUS_STEPS, type RadiusStep } from '@dsg/contracts';

const ROOT_FONT_SIZE_PX = 16;

export interface RadiusToken {
  name: RadiusStep;
  value: string;
}

export function generateRadii(radii: { basePx: number }): RadiusToken[] {
  const entries = Object.entries(RADIUS_STEPS) as Array<[RadiusStep, number]>;

  return entries.map(([name, multiplier]) => {
    // `full` is the pill case: a value large enough to always fully round, independent of
    // the base unit. A percentage would distort on non-square elements.
    if (!Number.isFinite(multiplier)) {
      return { name, value: '9999px' };
    }

    const rem = Math.round(((radii.basePx * multiplier) / ROOT_FONT_SIZE_PX) * 1e4) / 1e4;
    return { name, value: `${rem}rem` };
  });
}
