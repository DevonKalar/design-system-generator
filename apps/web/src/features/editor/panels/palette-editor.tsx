import type { Palette } from '@dsg/contracts';
import type { ResolvedPalette } from '@dsg/tokens';
import { Button } from '../../../components/ui/button.js';
import { Field, inputClass } from '../../../components/ui/field.js';

interface PaletteEditorProps {
  palette: Palette;
  resolved: ResolvedPalette | undefined;
  /** False when a semantic token still points at this palette. */
  deletable: boolean;
  onChange: (next: Palette) => void;
  onDelete: () => void;
}

export function PaletteEditor({
  palette,
  resolved,
  deletable,
  onChange,
  onDelete,
}: PaletteEditorProps) {
  const set = <Key extends keyof Palette>(key: Key, value: Palette[Key]) => {
    onChange({ ...palette, [key]: value });
  };

  return (
    <div className="space-y-3 rounded-lg border border-zinc-200 p-3 dark:border-zinc-800">
      <div className="flex items-center gap-2">
        <input
          aria-label={`Name for ${palette.name} palette`}
          value={palette.name}
          onChange={(event) => set('name', event.target.value)}
          className={`${inputClass} font-medium`}
        />
        <input
          type="color"
          aria-label={`Base color for ${palette.name}`}
          value={palette.baseColor}
          onChange={(event) => set('baseColor', event.target.value)}
          className="h-9 w-10 shrink-0 cursor-pointer rounded border border-zinc-300 bg-transparent dark:border-zinc-700"
        />
        <Button
          variant="danger"
          disabled={!deletable}
          title={deletable ? undefined : 'A semantic token still uses this palette'}
          aria-label={`Delete ${palette.name} palette`}
          onClick={onDelete}
          className="shrink-0"
        >
          Delete
        </Button>
      </div>

      <div className="flex gap-1">
        {resolved?.scale.map((color) => (
          <div
            key={color.step}
            title={`${palette.name}-${color.step} · ${color.hex}`}
            style={{ background: color.css }}
            className="h-8 flex-1 rounded-sm border border-black/5 dark:border-white/10"
          />
        ))}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Field label={`Hue shift (${palette.hueShift}°)`}>
          {(id) => (
            <input
              id={id}
              type="range"
              min={-60}
              max={60}
              step={1}
              value={palette.hueShift}
              onChange={(event) => set('hueShift', Number(event.target.value))}
              className="w-full"
            />
          )}
        </Field>

        <Field label={`Chroma (${palette.chroma.toFixed(2)}×)`}>
          {(id) => (
            <input
              id={id}
              type="range"
              min={0}
              max={1.5}
              step={0.05}
              value={palette.chroma}
              onChange={(event) => set('chroma', Number(event.target.value))}
              className="w-full"
            />
          )}
        </Field>
      </div>
    </div>
  );
}
