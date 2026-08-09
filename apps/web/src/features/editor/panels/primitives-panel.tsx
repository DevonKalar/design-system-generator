import type { DesignSystemDefinition } from '@dsg/contracts';
import type { ResolvedDesignSystem } from '@dsg/tokens';
import { Field, inputClass } from '../../../components/ui/field.js';
import { Panel } from '../../../components/ui/panel.js';

interface PrimitivesPanelProps {
  draft: DesignSystemDefinition;
  resolved: ResolvedDesignSystem | null;
  onChange: (next: DesignSystemDefinition) => void;
}

export function PrimitivesPanel({ draft, resolved, onChange }: PrimitivesPanelProps) {
  return (
    <Panel title="Spacing, radii and shadows" description="Base units the rest is derived from.">
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <Field label={`Spacing unit (${draft.spacing.basePx}px)`}>
            {(id) => (
              <input
                id={id}
                type="range"
                min={1}
                max={16}
                step={1}
                value={draft.spacing.basePx}
                onChange={(event) =>
                  onChange({ ...draft, spacing: { basePx: Number(event.target.value) } })
                }
                className="w-full"
              />
            )}
          </Field>

          <Field label={`Radius unit (${draft.radii.basePx}px)`}>
            {(id) => (
              <input
                id={id}
                type="range"
                min={0}
                max={24}
                step={1}
                value={draft.radii.basePx}
                onChange={(event) =>
                  onChange({ ...draft, radii: { basePx: Number(event.target.value) } })
                }
                className="w-full"
              />
            )}
          </Field>
        </div>

        {resolved && (
          <div className="flex flex-wrap items-end gap-3">
            {resolved.radii
              .filter((radius) => radius.name !== 'none')
              .map((radius) => (
                <div key={radius.name} className="text-center">
                  <div
                    style={{ borderRadius: radius.value }}
                    className="h-10 w-10 border-2 border-zinc-400 dark:border-zinc-600"
                  />
                  <span className="mt-1 block font-mono text-[10px] text-zinc-500">
                    {radius.name}
                  </span>
                </div>
              ))}
          </div>
        )}

        <div className="grid grid-cols-2 gap-3 border-t border-zinc-200 pt-4 dark:border-zinc-800">
          <Field label="Shadow color">
            {(id) => (
              <input
                id={id}
                type="color"
                value={draft.shadows.color}
                onChange={(event) =>
                  onChange({ ...draft, shadows: { ...draft.shadows, color: event.target.value } })
                }
                className={`${inputClass} h-9 cursor-pointer p-1`}
              />
            )}
          </Field>

          <Field label={`Shadow strength (${draft.shadows.strength.toFixed(2)}×)`}>
            {(id) => (
              <input
                id={id}
                type="range"
                min={0}
                max={2}
                step={0.05}
                value={draft.shadows.strength}
                onChange={(event) =>
                  onChange({
                    ...draft,
                    shadows: { ...draft.shadows, strength: Number(event.target.value) },
                  })
                }
                className="w-full"
              />
            )}
          </Field>
        </div>

        {resolved && (
          <div className="flex flex-wrap gap-4 pt-1">
            {resolved.shadows.map((shadow) => (
              <div key={shadow.name} className="text-center">
                <div
                  style={{ boxShadow: shadow.value }}
                  className="h-10 w-14 rounded-md bg-white dark:bg-zinc-800"
                />
                <span className="mt-1 block font-mono text-[10px] text-zinc-500">
                  {shadow.name}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </Panel>
  );
}
