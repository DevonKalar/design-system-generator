import { SEMANTIC_TOKENS } from '@dsg/contracts';
import type { ResolvedDesignSystem, ThemeMode } from '@dsg/tokens';
import type { CSSProperties } from 'react';

/**
 * Renders the resolved system as inline custom properties for the preview subtree.
 *
 * Applying them inline rather than injecting a stylesheet keeps the generated tokens fully
 * scoped — they cannot leak into the app's own chrome — and lets light and dark previews sit
 * side by side, which a `:root`-level stylesheet could not do. The names match what the
 * exported files define, so preview markup and exported markup are interchangeable.
 */
export function previewVariables(resolved: ResolvedDesignSystem, mode: ThemeMode): CSSProperties {
  const variables: Record<string, string> = {};

  for (const palette of resolved.palettes) {
    for (const color of palette.scale) {
      variables[`--color-${palette.name}-${color.step}`] = color.css;
    }
  }

  for (const token of SEMANTIC_TOKENS) {
    variables[`--color-${token}`] = resolved.semantic[mode][token].color.css;
  }

  variables['--font-sans'] = resolved.typography.families.sans;
  variables['--font-serif'] = resolved.typography.families.serif;
  variables['--font-mono'] = resolved.typography.families.mono;

  for (const step of resolved.typography.steps) {
    variables[`--text-${step.name}`] = `${step.sizeRem}rem`;
    variables[`--text-${step.name}--line-height`] = String(step.lineHeight);
    variables[`--text-${step.name}--letter-spacing`] = `${step.letterSpacingEm}em`;
  }

  variables['--spacing'] = `${resolved.spacing.baseRem}rem`;
  for (const token of resolved.spacing.tokens) {
    variables[`--spacing-${token.name}`] = `${token.rem}rem`;
  }

  for (const radius of resolved.radii) {
    variables[`--radius-${radius.name}`] = radius.value;
  }

  for (const shadow of resolved.shadows) {
    variables[`--shadow-${shadow.name}`] = shadow.value;
  }

  return variables as CSSProperties;
}
