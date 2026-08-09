import type { SemanticToken } from '@dsg/contracts';
import type { ResolvedDesignSystem } from '../resolve.js';

/**
 * Custom-property names are shared between the Tailwind output and the plain-CSS output on
 * purpose: a component written against `var(--color-background)` works under either. The
 * `--text-*--line-height` double-dash form is Tailwind v4's modifier convention and is a
 * valid custom-property name everywhere else, so it costs nothing to keep.
 */

export function colorVar(palette: string, step: number): string {
  return `--color-${palette}-${step}`;
}

export function semanticVar(token: SemanticToken): string {
  return `--color-${token}`;
}

/** Indirection layer that lets semantic colors flip between light and dark at runtime. */
export function semanticSourceVar(token: SemanticToken): string {
  return `--semantic-${token}`;
}

export function declaration(name: string, value: string): string {
  return `  ${name}: ${value};`;
}

export function section(title: string, lines: string[]): string[] {
  return lines.length === 0 ? [] : [`  /* ${title} */`, ...lines, ''];
}

export function typographyDeclarations(resolved: ResolvedDesignSystem): string[] {
  const families = [
    declaration('--font-sans', resolved.typography.families.sans),
    declaration('--font-serif', resolved.typography.families.serif),
    declaration('--font-mono', resolved.typography.families.mono),
  ];

  const steps = resolved.typography.steps.flatMap((step) => [
    declaration(`--text-${step.name}`, `${step.sizeRem}rem`),
    declaration(`--text-${step.name}--line-height`, String(step.lineHeight)),
    declaration(`--text-${step.name}--letter-spacing`, `${step.letterSpacingEm}em`),
  ]);

  return [...families, ...steps];
}

export function colorDeclarations(resolved: ResolvedDesignSystem): string[] {
  return resolved.palettes.flatMap((palette) =>
    palette.scale.map((color) => declaration(colorVar(palette.name, color.step), color.css)),
  );
}

export function radiusDeclarations(resolved: ResolvedDesignSystem): string[] {
  return resolved.radii.map((radius) => declaration(`--radius-${radius.name}`, radius.value));
}

export function shadowDeclarations(resolved: ResolvedDesignSystem): string[] {
  return resolved.shadows.map((shadow) => declaration(`--shadow-${shadow.name}`, shadow.value));
}
