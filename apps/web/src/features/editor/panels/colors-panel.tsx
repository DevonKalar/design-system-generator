import type { DesignSystemDefinition, Palette, ScaleStep, SemanticToken } from '@dsg/contracts';
import { analyzeContrast, type ResolvedDesignSystem, type ThemeMode } from '@dsg/tokens';
import { useState } from 'react';
import { Button } from '../../../components/ui/button.js';
import { Panel } from '../../../components/ui/panel.js';
import { ContrastReport } from './contrast-report.js';
import { PaletteEditor } from './palette-editor.js';
import { SemanticEditor } from './semantic-editor.js';

interface ColorsPanelProps {
  draft: DesignSystemDefinition;
  resolved: ResolvedDesignSystem | null;
  onChange: (next: DesignSystemDefinition) => void;
}

const NEW_PALETTE: Omit<Palette, 'name'> = { baseColor: '#6366f1', hueShift: 0, chroma: 1 };

function nextPaletteName(existing: string[]): string {
  let index = existing.length + 1;
  while (existing.includes(`palette-${index}`)) {
    index += 1;
  }
  return `palette-${index}`;
}

export function ColorsPanel({ draft, resolved, onChange }: ColorsPanelProps) {
  const [mode, setMode] = useState<ThemeMode>('light');

  const { palettes, semantic } = draft.colors;
  const paletteNames = palettes.map((palette) => palette.name);

  const referenced = new Set(
    [...Object.values(semantic.light), ...Object.values(semantic.dark)].map((ref) => ref.palette),
  );

  const setColors = (next: Partial<DesignSystemDefinition['colors']>) => {
    onChange({ ...draft, colors: { ...draft.colors, ...next } });
  };

  const updatePalette = (index: number, next: Palette) => {
    const previous = palettes[index];
    const updated = palettes.map((palette, i) => (i === index ? next : palette));

    // A rename would orphan every semantic token pointing at the old name, so carry the
    // references across with it rather than letting the document go invalid mid-edit.
    if (previous && previous.name !== next.name) {
      const remap = (map: typeof semantic.light) =>
        Object.fromEntries(
          Object.entries(map).map(([token, ref]) => [
            token,
            ref.palette === previous.name ? { ...ref, palette: next.name } : ref,
          ]),
        ) as typeof semantic.light;

      setColors({
        palettes: updated,
        semantic: { light: remap(semantic.light), dark: remap(semantic.dark) },
      });
      return;
    }

    setColors({ palettes: updated });
  };

  const updateSemantic = (token: SemanticToken, palette: string, step: ScaleStep) => {
    setColors({
      semantic: { ...semantic, [mode]: { ...semantic[mode], [token]: { palette, step } } },
    });
  };

  return (
    <>
      <Panel
        title="Palettes"
        description="Each base color expands into an 11-step ramp."
        actions={
          <Button
            onClick={() =>
              setColors({
                palettes: [...palettes, { name: nextPaletteName(paletteNames), ...NEW_PALETTE }],
              })
            }
          >
            Add
          </Button>
        }
      >
        <div className="space-y-3">
          {palettes.map((palette, index) => (
            <PaletteEditor
              key={index}
              palette={palette}
              resolved={resolved?.palettes.find((entry) => entry.name === palette.name)}
              deletable={palettes.length > 1 && !referenced.has(palette.name)}
              onChange={(next) => updatePalette(index, next)}
              onDelete={() => setColors({ palettes: palettes.filter((_, i) => i !== index) })}
            />
          ))}
        </div>
      </Panel>

      <Panel
        title="Semantic colors"
        description="Roles that point at a palette step, resolved per theme."
        actions={
          <div className="flex rounded-md border border-zinc-300 p-0.5 dark:border-zinc-700">
            {(['light', 'dark'] as const).map((option) => (
              <button
                key={option}
                type="button"
                onClick={() => setMode(option)}
                aria-pressed={mode === option}
                className={`rounded px-2 py-0.5 text-xs font-medium capitalize transition ${
                  mode === option
                    ? 'bg-zinc-900 text-white dark:bg-white dark:text-zinc-900'
                    : 'text-zinc-500'
                }`}
              >
                {option}
              </button>
            ))}
          </div>
        }
      >
        <SemanticEditor
          paletteNames={paletteNames}
          semantic={semantic[mode]}
          resolved={resolved?.semantic[mode]}
          onChange={updateSemantic}
        />
      </Panel>

      <Panel title="Contrast" description={`WCAG ratios for the ${mode} theme.`}>
        {resolved ? (
          <ContrastReport reports={analyzeContrast(resolved, mode)} />
        ) : (
          <p className="text-xs text-zinc-500">Fix the errors above to see contrast ratios.</p>
        )}
      </Panel>
    </>
  );
}
