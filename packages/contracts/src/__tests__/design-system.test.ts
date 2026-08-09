import { describe, expect, it } from 'vitest';
import { createDefaultDefinition } from '../defaults.js';
import {
  CURRENT_SCHEMA_VERSION,
  SEMANTIC_TOKENS,
  designSystemDefinitionSchema,
  paletteNameSchema,
  semanticMapSchema,
} from '../design-system.js';
import { updateDesignSystemRequestSchema } from '../api.js';

describe('designSystemDefinitionSchema', () => {
  it('accepts the default definition', () => {
    expect(() => designSystemDefinitionSchema.parse(createDefaultDefinition())).not.toThrow();
  });

  it('rejects a semantic token pointing at a palette that does not exist', () => {
    const definition = createDefaultDefinition();
    definition.colors.semantic.light.primary = { palette: 'nonexistent', step: 500 };

    const result = designSystemDefinitionSchema.safeParse(definition);

    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.message).toContain('unknown palette "nonexistent"');
    expect(result.error?.issues[0]?.path).toEqual(['colors', 'semantic', 'light', 'primary']);
  });

  it('rejects duplicate palette names', () => {
    const definition = createDefaultDefinition();
    definition.colors.palettes.push({
      name: 'brand',
      baseColor: '#ff0000',
      hueShift: 0,
      chroma: 1,
    });

    const result = designSystemDefinitionSchema.safeParse(definition);

    expect(result.success).toBe(false);
    expect(result.error?.issues.some((issue) => issue.message.includes('Duplicate'))).toBe(true);
  });

  it('rejects a type ratio outside the usable range', () => {
    const definition = createDefaultDefinition();
    definition.typography.ratio = 3;

    expect(designSystemDefinitionSchema.safeParse(definition).success).toBe(false);
  });

  it('requires at least one palette', () => {
    const definition = createDefaultDefinition();
    definition.colors.palettes = [];

    expect(designSystemDefinitionSchema.safeParse(definition).success).toBe(false);
  });

  it('pins the schema version so migrations are deliberate', () => {
    expect(CURRENT_SCHEMA_VERSION).toBe(1);
  });
});

describe('semanticMapSchema', () => {
  it('requires every semantic token to be assigned', () => {
    const partial = { ...createDefaultDefinition().colors.semantic.light };
    delete (partial as Record<string, unknown>)['ring'];

    expect(semanticMapSchema.safeParse(partial).success).toBe(false);
  });

  it('assigns all tokens in the default definition', () => {
    const light = createDefaultDefinition().colors.semantic.light;

    for (const token of SEMANTIC_TOKENS) {
      expect(light[token]).toBeDefined();
    }
  });
});

describe('paletteNameSchema', () => {
  it.each(['brand', 'warm-grey', 'x1', 'a-b-c'])('accepts %s', (name) => {
    expect(paletteNameSchema.safeParse(name).success).toBe(true);
  });

  it.each(['Brand', '1brand', 'brand-', '-brand', 'brand--x', 'brand x', ''])(
    'rejects %s',
    (name) => {
      expect(paletteNameSchema.safeParse(name).success).toBe(false);
    },
  );
});

describe('updateDesignSystemRequestSchema', () => {
  it('rejects an empty patch', () => {
    expect(updateDesignSystemRequestSchema.safeParse({}).success).toBe(false);
  });

  it('accepts a name-only patch', () => {
    expect(updateDesignSystemRequestSchema.safeParse({ name: 'Renamed' }).success).toBe(true);
  });

  it('trims whitespace from names', () => {
    const result = updateDesignSystemRequestSchema.parse({ name: '  Spaced  ' });
    expect(result.name).toBe('Spaced');
  });
});
