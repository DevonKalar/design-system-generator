import { converter } from 'culori';

const toRgb = converter('rgb');

/** WCAG 2.1 grades. `aa-large` only qualifies for 18pt+ / 14pt-bold text. */
export type ContrastGrade = 'aaa' | 'aa' | 'aa-large' | 'fail';

function linearize(channel: number): number {
  return channel <= 0.03928 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
}

/** WCAG 2.1 relative luminance, 0 (black) to 1 (white). */
export function relativeLuminance(color: string): number {
  const rgb = toRgb(color);
  if (!rgb) {
    throw new Error(`Could not parse color "${color}"`);
  }

  return 0.2126 * linearize(rgb.r) + 0.7152 * linearize(rgb.g) + 0.0722 * linearize(rgb.b);
}

/** WCAG 2.1 contrast ratio, 1 (identical) to 21 (black on white). Order-independent. */
export function contrastRatio(foreground: string, background: string): number {
  const a = relativeLuminance(foreground);
  const b = relativeLuminance(background);
  const lighter = Math.max(a, b);
  const darker = Math.min(a, b);

  return (lighter + 0.05) / (darker + 0.05);
}

export function gradeContrast(ratio: number): ContrastGrade {
  if (ratio >= 7) return 'aaa';
  if (ratio >= 4.5) return 'aa';
  if (ratio >= 3) return 'aa-large';
  return 'fail';
}
