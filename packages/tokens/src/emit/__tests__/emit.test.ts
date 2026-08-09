import { describe, expect, it } from 'vitest';
import { SEMANTIC_TOKENS, createDefaultDefinition } from '@dsg/contracts';
import { emitDesignSystem } from '../index.js';

const SYSTEM_NAME = 'Acme';

function fileNamed(path: string): string {
  const file = emitDesignSystem(createDefaultDefinition(), SYSTEM_NAME).files.find(
    (candidate) => candidate.path === path,
  );
  if (!file) throw new Error(`No emitted file at ${path}`);
  return file.contents;
}

/** Collects `--foo: ...` declarations and `var(--foo)` references from a stylesheet. */
function analyzeVariables(css: string): { defined: Set<string>; referenced: Set<string> } {
  const defined = new Set([...css.matchAll(/^\s*(--[\w-]+):/gm)].map((match) => match[1]!));
  const referenced = new Set([...css.matchAll(/var\((--[\w-]+)\)/g)].map((match) => match[1]!));
  return { defined, referenced };
}

describe('emitDesignSystem', () => {
  it('emits the expected file set', () => {
    const { files } = emitDesignSystem(createDefaultDefinition(), SYSTEM_NAME);

    expect(files.map((file) => file.path)).toEqual([
      'theme.css',
      'tokens.css',
      'semantic.css',
      'README.md',
    ]);
  });

  it('emits no empty files', () => {
    const { files } = emitDesignSystem(createDefaultDefinition(), SYSTEM_NAME);

    for (const file of files) {
      expect(file.contents.trim().length).toBeGreaterThan(0);
    }
  });

  it('is deterministic', () => {
    const definition = createDefaultDefinition();

    expect(emitDesignSystem(definition, SYSTEM_NAME)).toEqual(
      emitDesignSystem(definition, SYSTEM_NAME),
    );
  });
});

describe('theme.css', () => {
  it('is a self-contained Tailwind entry point', () => {
    const css = fileNamed('theme.css');

    expect(css).toContain("@import 'tailwindcss';");
    expect(css).toContain('@theme static {');
    expect(css).toContain('@theme inline {');
    expect(css).toContain('@custom-variant dark');
  });

  it('defines every variable it references', () => {
    const { defined, referenced } = analyzeVariables(fileNamed('theme.css'));

    // A dangling var() fails silently in the browser, so this is the check that matters most.
    const dangling = [...referenced].filter((name) => !defined.has(name));
    expect(dangling).toEqual([]);
  });

  it('routes semantic colors through the runtime indirection layer', () => {
    const css = fileNamed('theme.css');

    for (const token of SEMANTIC_TOKENS) {
      expect(css).toContain(`--color-${token}: var(--semantic-${token});`);
    }
  });

  it('overrides every semantic source variable in dark mode', () => {
    const css = fileNamed('theme.css');
    const darkBlock = css.slice(css.indexOf(".dark,\n[data-theme='dark'] {"));

    for (const token of SEMANTIC_TOKENS) {
      expect(darkBlock).toContain(`--semantic-${token}:`);
    }
  });

  it('exposes the spacing base rather than fixed spacing steps, so Tailwind can derive them', () => {
    const css = fileNamed('theme.css');

    expect(css).toContain('--spacing: 0.25rem;');
    expect(css).not.toContain('--spacing-4:');
  });

  it('emits full color ramps and type steps', () => {
    const css = fileNamed('theme.css');

    expect(css).toContain('--color-brand-50:');
    expect(css).toContain('--color-brand-950:');
    expect(css).toContain('--text-base: 1rem;');
    expect(css).toContain('--text-base--line-height:');
    expect(css).toContain('--radius-full: 9999px;');
    expect(css).toContain('--shadow-md:');
  });
});

describe('tokens.css + semantic.css', () => {
  it('names semantic variables identically to the Tailwind output, so components port over', () => {
    const semantic = fileNamed('semantic.css');

    for (const token of SEMANTIC_TOKENS) {
      expect(semantic).toContain(`--color-${token}:`);
    }
  });

  it('resolves every semantic reference against tokens.css', () => {
    const { defined } = analyzeVariables(fileNamed('tokens.css'));
    const { referenced } = analyzeVariables(fileNamed('semantic.css'));

    const dangling = [...referenced].filter((name) => !defined.has(name));
    expect(dangling).toEqual([]);
  });

  it('includes named spacing steps, which plain CSS cannot derive', () => {
    const css = fileNamed('tokens.css');

    expect(css).toContain('--spacing-4:');
    expect(css).toContain('--spacing-0-5:');
  });

  it('uses no Tailwind-specific at-rules', () => {
    for (const path of ['tokens.css', 'semantic.css']) {
      expect(fileNamed(path)).not.toContain('@theme');
      expect(fileNamed(path)).not.toContain('@import');
    }
  });
});

describe('README.md', () => {
  it('names the system and lists its palettes', () => {
    const readme = fileNamed('README.md');

    expect(readme).toContain(`# ${SYSTEM_NAME}`);
    expect(readme).toContain('`brand`');
    expect(readme).toContain('prefers-color-scheme');
  });
});

describe('emitted output snapshot', () => {
  // Guards against silent renames of the token vocabulary — the thing consumers depend on.
  it('matches the recorded theme.css', () => {
    expect(fileNamed('theme.css')).toMatchSnapshot();
  });

  it('matches the recorded tokens.css', () => {
    expect(fileNamed('tokens.css')).toMatchSnapshot();
  });

  it('matches the recorded semantic.css', () => {
    expect(fileNamed('semantic.css')).toMatchSnapshot();
  });
});
