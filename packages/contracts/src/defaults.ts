import type { DesignSystemDefinition, SemanticMap } from './design-system.js';

const LIGHT_SEMANTICS: SemanticMap = {
  background: { palette: 'neutral', step: 50 },
  foreground: { palette: 'neutral', step: 950 },
  card: { palette: 'neutral', step: 50 },
  'card-foreground': { palette: 'neutral', step: 950 },
  muted: { palette: 'neutral', step: 100 },
  'muted-foreground': { palette: 'neutral', step: 600 },
  primary: { palette: 'brand', step: 600 },
  'primary-foreground': { palette: 'neutral', step: 50 },
  secondary: { palette: 'neutral', step: 100 },
  'secondary-foreground': { palette: 'neutral', step: 900 },
  accent: { palette: 'accent', step: 500 },
  'accent-foreground': { palette: 'neutral', step: 50 },
  destructive: { palette: 'danger', step: 600 },
  'destructive-foreground': { palette: 'neutral', step: 50 },
  border: { palette: 'neutral', step: 200 },
  input: { palette: 'neutral', step: 200 },
  ring: { palette: 'brand', step: 500 },
};

const DARK_SEMANTICS: SemanticMap = {
  background: { palette: 'neutral', step: 950 },
  foreground: { palette: 'neutral', step: 50 },
  card: { palette: 'neutral', step: 900 },
  'card-foreground': { palette: 'neutral', step: 50 },
  muted: { palette: 'neutral', step: 800 },
  'muted-foreground': { palette: 'neutral', step: 400 },
  primary: { palette: 'brand', step: 500 },
  'primary-foreground': { palette: 'neutral', step: 950 },
  secondary: { palette: 'neutral', step: 800 },
  'secondary-foreground': { palette: 'neutral', step: 50 },
  accent: { palette: 'accent', step: 400 },
  'accent-foreground': { palette: 'neutral', step: 950 },
  destructive: { palette: 'danger', step: 500 },
  'destructive-foreground': { palette: 'neutral', step: 950 },
  border: { palette: 'neutral', step: 800 },
  input: { palette: 'neutral', step: 800 },
  ring: { palette: 'brand', step: 400 },
};

/** Seed document for a newly created system — a complete, usable system out of the box. */
export function createDefaultDefinition(): DesignSystemDefinition {
  return {
    colors: {
      palettes: [
        { name: 'brand', baseColor: '#3b5bdb', hueShift: -6, chroma: 1 },
        // The base is already near-achromatic, so this ramp reads as grey while keeping a
        // faint cool tint — greys that are exactly neutral look flat next to a tinted brand.
        { name: 'neutral', baseColor: '#71717a', hueShift: 0, chroma: 1 },
        { name: 'accent', baseColor: '#0ea5e9', hueShift: -4, chroma: 1 },
        { name: 'danger', baseColor: '#dc2626', hueShift: 4, chroma: 1 },
      ],
      semantic: {
        light: LIGHT_SEMANTICS,
        dark: DARK_SEMANTICS,
      },
    },
    typography: {
      families: {
        sans: 'Inter, ui-sans-serif, system-ui, sans-serif',
        serif: 'ui-serif, Georgia, Cambria, serif',
        mono: 'ui-monospace, SFMono-Regular, Menlo, monospace',
      },
      baseSizePx: 16,
      // A pure geometric scale compounds hard at the ends. 1.2 keeps `xs` legible (~11px)
      // and `5xl` near 48px; 1.25 would give 10.2px and 61px from the same base.
      ratio: 1.2,
    },
    spacing: { basePx: 4 },
    radii: { basePx: 8 },
    shadows: { color: '#0a0a0a', strength: 1 },
  };
}
