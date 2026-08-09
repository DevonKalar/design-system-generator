import { z } from 'zod';

/**
 * The stored document describes a design system's *inputs* (a base color, a type ratio),
 * never its derived tokens. Everything downstream is recomputed by @dsg/tokens on read,
 * so improving a generation algorithm improves every existing system and derived values
 * can never go stale relative to their inputs.
 */

/** Bumped whenever the definition shape changes; migrations live in @dsg/tokens/migrate. */
export const CURRENT_SCHEMA_VERSION = 1;

export const SCALE_STEPS = [50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950] as const;
export type ScaleStep = (typeof SCALE_STEPS)[number];

export const SEMANTIC_TOKENS = [
  'background',
  'foreground',
  'card',
  'card-foreground',
  'muted',
  'muted-foreground',
  'primary',
  'primary-foreground',
  'secondary',
  'secondary-foreground',
  'accent',
  'accent-foreground',
  'destructive',
  'destructive-foreground',
  'border',
  'input',
  'ring',
] as const;
export type SemanticToken = (typeof SEMANTIC_TOKENS)[number];

/** Surface/on-surface pairs the editor contrast-checks. Not every token has a partner. */
export const CONTRAST_PAIRS = [
  ['background', 'foreground'],
  ['card', 'card-foreground'],
  ['muted', 'muted-foreground'],
  ['primary', 'primary-foreground'],
  ['secondary', 'secondary-foreground'],
  ['accent', 'accent-foreground'],
  ['destructive', 'destructive-foreground'],
] as const satisfies ReadonlyArray<readonly [SemanticToken, SemanticToken]>;

/** Offsets are exponents applied to the type ratio, so `base` is always the configured size. */
export const TEXT_STEPS = {
  xs: -2,
  sm: -1,
  base: 0,
  lg: 1,
  xl: 2,
  '2xl': 3,
  '3xl': 4,
  '4xl': 5,
  '5xl': 6,
} as const;
export type TextStep = keyof typeof TEXT_STEPS;

/** Multiples of the radius base unit. `full` is the pill case and ignores the base. */
export const RADIUS_STEPS = {
  none: 0,
  sm: 0.5,
  md: 1,
  lg: 1.5,
  xl: 2,
  '2xl': 3,
  full: Number.POSITIVE_INFINITY,
} as const;
export type RadiusStep = keyof typeof RADIUS_STEPS;

export const SHADOW_STEPS = ['sm', 'md', 'lg', 'xl'] as const;
export type ShadowStep = (typeof SHADOW_STEPS)[number];

/** Multiples of the spacing base unit, emitted as named vars for non-Tailwind consumers. */
export const SPACING_STEPS = [
  0, 0.5, 1, 1.5, 2, 2.5, 3, 4, 5, 6, 8, 10, 12, 16, 20, 24, 32,
] as const;

export const hexColorSchema = z
  .string()
  .regex(/^#[0-9a-fA-F]{6}$/, 'Must be a 6-digit hex color, e.g. #3b5bdb');

/** Doubles as the CSS custom-property segment, so it has to be a safe ident. */
export const paletteNameSchema = z
  .string()
  .regex(/^[a-z][a-z0-9]*(-[a-z0-9]+)*$/, 'Must be lowercase kebab-case, e.g. brand or warm-grey')
  .max(32);

export const scaleStepSchema = z.union(SCALE_STEPS.map((step) => z.literal(step)));

export const paletteSchema = z.object({
  name: paletteNameSchema,
  baseColor: hexColorSchema,
  /**
   * Rotates hue toward the dark end of the scale. Real-world palettes rarely hold a single
   * hue across all 11 steps — shadows drift cool, tints drift warm.
   */
  hueShift: z.number().min(-60).max(60).default(0),
  /** Scales generated chroma. Below 1 desaturates toward grey; above 1 pushes to gamut edge. */
  chroma: z.number().min(0).max(1.5).default(1),
});
export type Palette = z.infer<typeof paletteSchema>;

export const tokenRefSchema = z.object({
  palette: paletteNameSchema,
  step: scaleStepSchema,
});
export type TokenRef = z.infer<typeof tokenRefSchema>;

/** Enum keys make this exhaustive: every semantic token must be assigned. */
export const semanticMapSchema = z.record(z.enum(SEMANTIC_TOKENS), tokenRefSchema);
export type SemanticMap = z.infer<typeof semanticMapSchema>;

export const colorsSchema = z.object({
  palettes: z.array(paletteSchema).min(1).max(12),
  semantic: z.object({
    light: semanticMapSchema,
    dark: semanticMapSchema,
  }),
});

export const typographySchema = z.object({
  families: z.object({
    sans: z.string().min(1).max(200),
    serif: z.string().min(1).max(200),
    mono: z.string().min(1).max(200),
  }),
  baseSizePx: z.number().min(10).max(24),
  ratio: z.number().min(1.05).max(2),
});

export const spacingSchema = z.object({
  basePx: z.number().min(1).max(16),
});

export const radiiSchema = z.object({
  basePx: z.number().min(0).max(24),
});

export const shadowsSchema = z.object({
  color: hexColorSchema,
  /** Multiplies shadow opacity across all tiers. 0 disables shadows entirely. */
  strength: z.number().min(0).max(2),
});

export const designSystemDefinitionSchema = z
  .object({
    colors: colorsSchema,
    typography: typographySchema,
    spacing: spacingSchema,
    radii: radiiSchema,
    shadows: shadowsSchema,
  })
  .superRefine((definition, ctx) => {
    const paletteNames = new Set(definition.colors.palettes.map((palette) => palette.name));

    for (const palette of definition.colors.palettes) {
      const duplicate =
        definition.colors.palettes.filter((other) => other.name === palette.name).length > 1;
      if (duplicate) {
        ctx.addIssue({
          code: 'custom',
          path: ['colors', 'palettes'],
          message: `Duplicate palette name "${palette.name}"`,
        });
        break;
      }
    }

    // A semantic token pointing at a deleted palette would emit a var(--…) that resolves to
    // nothing, which fails silently in the browser. Catch it at the contract boundary instead.
    for (const mode of ['light', 'dark'] as const) {
      for (const [token, ref] of Object.entries(definition.colors.semantic[mode])) {
        if (!paletteNames.has(ref.palette)) {
          ctx.addIssue({
            code: 'custom',
            path: ['colors', 'semantic', mode, token],
            message: `Semantic token "${token}" references unknown palette "${ref.palette}"`,
          });
        }
      }
    }
  });

export type DesignSystemDefinition = z.infer<typeof designSystemDefinitionSchema>;
