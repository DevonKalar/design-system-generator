import { converter } from 'culori';
import { SHADOW_STEPS, type ShadowStep } from '@dsg/contracts';

const toRgb = converter('rgb');

interface ShadowLayer {
  offsetY: number;
  blur: number;
  spread: number;
  alpha: number;
}

/**
 * Elevation geometry per tier. Higher tiers use a large diffuse layer plus a tighter contact
 * layer, which is what separates a card that looks lifted from one that looks blurry.
 * Negative spread keeps the shadow narrower than the element so it reads as cast, not glowing.
 */
const ELEVATION: Record<ShadowStep, ShadowLayer[]> = {
  sm: [{ offsetY: 1, blur: 2, spread: 0, alpha: 0.05 }],
  md: [
    { offsetY: 4, blur: 6, spread: -1, alpha: 0.1 },
    { offsetY: 2, blur: 4, spread: -2, alpha: 0.1 },
  ],
  lg: [
    { offsetY: 10, blur: 15, spread: -3, alpha: 0.1 },
    { offsetY: 4, blur: 6, spread: -4, alpha: 0.1 },
  ],
  xl: [
    { offsetY: 20, blur: 25, spread: -5, alpha: 0.1 },
    { offsetY: 8, blur: 10, spread: -6, alpha: 0.1 },
  ],
};

export interface ShadowToken {
  name: ShadowStep;
  value: string;
}

export function generateShadows(shadows: { color: string; strength: number }): ShadowToken[] {
  const rgb = toRgb(shadows.color);
  if (!rgb) {
    throw new Error(`Could not parse shadow color "${shadows.color}"`);
  }

  const channels = [rgb.r, rgb.g, rgb.b].map((channel) => Math.round(channel * 255)).join(' ');

  return SHADOW_STEPS.map((name) => ({
    name,
    value: ELEVATION[name]
      .map((layer) => {
        const alpha = Math.round(layer.alpha * shadows.strength * 1e4) / 1e4;
        return `0 ${layer.offsetY}px ${layer.blur}px ${layer.spread}px rgb(${channels} / ${alpha})`;
      })
      .join(', '),
  }));
}
