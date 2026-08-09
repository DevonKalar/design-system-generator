import { createDefaultDefinition } from '@dsg/contracts';
import { resolveDesignSystem } from '@dsg/tokens';
import { describe, expect, it } from 'vitest';
import { previewVariables } from '../preview/preview-variables.js';

const resolved = resolveDesignSystem(createDefaultDefinition());

function vars(mode: 'light' | 'dark'): Record<string, string> {
  return previewVariables(resolved, mode) as unknown as Record<string, string>;
}

describe('previewVariables', () => {
  it('exposes primitive ramps', () => {
    const light = vars('light');

    expect(light['--color-brand-50']).toMatch(/^oklch\(/);
    expect(light['--color-brand-950']).toMatch(/^oklch\(/);
    expect(light['--color-neutral-500']).toBeDefined();
  });

  it('exposes typography, spacing, radii and shadows', () => {
    const light = vars('light');

    expect(light['--text-base']).toBe('1rem');
    expect(light['--text-base--line-height']).toBeDefined();
    expect(light['--font-sans']).toContain('Inter');
    expect(light['--spacing']).toBe('0.25rem');
    expect(light['--radius-full']).toBe('9999px');
    expect(light['--shadow-md']).toContain('rgb(');
  });

  it('flips semantic colors between modes while primitives stay put', () => {
    const light = vars('light');
    const dark = vars('dark');

    expect(light['--color-background']).not.toBe(dark['--color-background']);
    expect(light['--color-foreground']).not.toBe(dark['--color-foreground']);
    // The ramps themselves are theme-independent.
    expect(light['--color-brand-500']).toBe(dark['--color-brand-500']);
  });

  it('uses the same variable names the exported files define', () => {
    // Preview markup and exported markup have to be interchangeable, which only holds if the
    // naming matches exactly.
    const light = vars('light');

    for (const name of ['--color-background', '--color-primary-foreground', '--color-ring']) {
      expect(light[name]).toBeDefined();
    }
  });
});
