import {
  CONTRAST_PAIRS,
  SEMANTIC_TOKENS,
  type DesignSystemDefinition,
  type SemanticToken,
  type TokenRef,
} from '@dsg/contracts';
import { contrastRatio, gradeContrast, type ContrastGrade } from './color/contrast.js';
import { generateColorScale, type ScaleColor } from './color/scale.js';
import { generateRadii, type RadiusToken } from './radii.js';
import { generateShadows, type ShadowToken } from './shadows.js';
import { generateSpacing, type GeneratedSpacing } from './spacing.js';
import { generateTypeScale, type TypeScaleStep } from './typography/scale.js';

export interface ResolvedPalette {
  name: string;
  scale: ScaleColor[];
}

export interface ResolvedSemanticToken {
  token: SemanticToken;
  ref: TokenRef;
  color: ScaleColor;
}

export type ResolvedSemanticMap = Record<SemanticToken, ResolvedSemanticToken>;

export type ThemeMode = 'light' | 'dark';

export interface ResolvedDesignSystem {
  palettes: ResolvedPalette[];
  semantic: Record<ThemeMode, ResolvedSemanticMap>;
  typography: {
    families: DesignSystemDefinition['typography']['families'];
    steps: TypeScaleStep[];
  };
  spacing: GeneratedSpacing;
  radii: RadiusToken[];
  shadows: ShadowToken[];
}

export interface ContrastReport {
  background: SemanticToken;
  foreground: SemanticToken;
  ratio: number;
  grade: ContrastGrade;
}

function indexPalettes(palettes: ResolvedPalette[]): Map<string, Map<number, ScaleColor>> {
  return new Map(
    palettes.map((palette) => [
      palette.name,
      new Map(palette.scale.map((color) => [color.step, color])),
    ]),
  );
}

function resolveSemanticMap(
  semantic: Record<SemanticToken, TokenRef>,
  index: Map<string, Map<number, ScaleColor>>,
  mode: ThemeMode,
): ResolvedSemanticMap {
  const entries = SEMANTIC_TOKENS.map((token) => {
    const ref = semantic[token];
    // designSystemDefinitionSchema already rejects dangling references, so reaching here
    // means the caller skipped validation. Fail loudly rather than emit a broken var().
    const color = index.get(ref.palette)?.get(ref.step);
    if (!color) {
      throw new Error(
        `Semantic token "${token}" (${mode}) references ${ref.palette}-${ref.step}, which does not exist`,
      );
    }

    return [token, { token, ref, color } satisfies ResolvedSemanticToken] as const;
  });

  return Object.fromEntries(entries) as ResolvedSemanticMap;
}

/**
 * Expands a stored definition into every value needed to render or export it. Pure and
 * synchronous, so the editor can call it on each keystroke and the API can call it per
 * request without either holding a cache.
 */
export function resolveDesignSystem(definition: DesignSystemDefinition): ResolvedDesignSystem {
  const palettes: ResolvedPalette[] = definition.colors.palettes.map((palette) => ({
    name: palette.name,
    scale: generateColorScale(palette),
  }));

  const index = indexPalettes(palettes);

  return {
    palettes,
    semantic: {
      light: resolveSemanticMap(definition.colors.semantic.light, index, 'light'),
      dark: resolveSemanticMap(definition.colors.semantic.dark, index, 'dark'),
    },
    typography: {
      families: definition.typography.families,
      steps: generateTypeScale(definition.typography),
    },
    spacing: generateSpacing(definition.spacing),
    radii: generateRadii(definition.radii),
    shadows: generateShadows(definition.shadows),
  };
}

/** Scores the surface/on-surface pairs so the editor can flag combinations that fail WCAG. */
export function analyzeContrast(resolved: ResolvedDesignSystem, mode: ThemeMode): ContrastReport[] {
  const semantic = resolved.semantic[mode];

  return CONTRAST_PAIRS.map(([background, foreground]) => {
    const ratio = contrastRatio(semantic[foreground].color.hex, semantic[background].color.hex);

    return {
      background,
      foreground,
      ratio: Math.round(ratio * 100) / 100,
      grade: gradeContrast(ratio),
    };
  });
}
