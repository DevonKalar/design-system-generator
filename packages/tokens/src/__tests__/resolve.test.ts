import { describe, expect, it } from 'vitest';
import { SEMANTIC_TOKENS, createDefaultDefinition } from '@dsg/contracts';
import { analyzeContrast, resolveDesignSystem } from '../resolve.js';

describe('resolveDesignSystem', () => {
  it('resolves every palette to a full scale', () => {
    const resolved = resolveDesignSystem(createDefaultDefinition());

    expect(resolved.palettes.map((palette) => palette.name)).toEqual([
      'brand',
      'neutral',
      'accent',
      'danger',
    ]);
    for (const palette of resolved.palettes) {
      expect(palette.scale).toHaveLength(11);
    }
  });

  it('resolves every semantic token in both modes', () => {
    const resolved = resolveDesignSystem(createDefaultDefinition());

    for (const mode of ['light', 'dark'] as const) {
      for (const token of SEMANTIC_TOKENS) {
        const entry = resolved.semantic[mode][token];
        expect(entry.color.hex).toMatch(/^#[0-9a-f]{6}$/);
        expect(entry.token).toBe(token);
      }
    }
  });

  it('inverts background and foreground between modes', () => {
    const resolved = resolveDesignSystem(createDefaultDefinition());

    expect(resolved.semantic.light.background.color.lightness).toBeGreaterThan(
      resolved.semantic.dark.background.color.lightness,
    );
    expect(resolved.semantic.light.foreground.color.lightness).toBeLessThan(
      resolved.semantic.dark.foreground.color.lightness,
    );
  });

  it('throws loudly when a semantic token references a missing palette', () => {
    const definition = createDefaultDefinition();
    definition.colors.palettes = definition.colors.palettes.filter(
      (palette) => palette.name !== 'danger',
    );

    expect(() => resolveDesignSystem(definition)).toThrow(
      /Semantic token "destructive" \(light\) references danger-600/,
    );
  });

  it('is pure — repeated calls give identical output', () => {
    const definition = createDefaultDefinition();

    expect(resolveDesignSystem(definition)).toEqual(resolveDesignSystem(definition));
  });
});

describe('analyzeContrast', () => {
  it('scores every contrast pair in both modes', () => {
    const resolved = resolveDesignSystem(createDefaultDefinition());

    for (const mode of ['light', 'dark'] as const) {
      const reports = analyzeContrast(resolved, mode);

      expect(reports).toHaveLength(7);
      for (const report of reports) {
        expect(report.ratio).toBeGreaterThanOrEqual(1);
        expect(report.ratio).toBeLessThanOrEqual(21);
      }
    }
  });

  it('gives the default system accessible body text in both modes', () => {
    const resolved = resolveDesignSystem(createDefaultDefinition());

    for (const mode of ['light', 'dark'] as const) {
      const body = analyzeContrast(resolved, mode).find(
        (report) => report.background === 'background',
      );

      expect(body?.grade).toBe('aaa');
    }
  });

  it('flags a deliberately low-contrast pairing', () => {
    const definition = createDefaultDefinition();
    definition.colors.semantic.light.foreground = { palette: 'neutral', step: 200 };

    const body = analyzeContrast(resolveDesignSystem(definition), 'light').find(
      (report) => report.background === 'background',
    );

    expect(body?.grade).toBe('fail');
  });
});
