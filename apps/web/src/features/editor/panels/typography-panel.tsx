import type { DesignSystemDefinition } from '@dsg/contracts';
import type { ResolvedDesignSystem } from '@dsg/tokens';
import { Field, inputClass } from '../../../components/ui/field.js';
import { Panel } from '../../../components/ui/panel.js';

interface TypographyPanelProps {
  draft: DesignSystemDefinition;
  resolved: ResolvedDesignSystem | null;
  onChange: (next: DesignSystemDefinition) => void;
}

export function TypographyPanel({ draft, resolved, onChange }: TypographyPanelProps) {
  const { typography } = draft;

  const set = (next: Partial<DesignSystemDefinition['typography']>) => {
    onChange({ ...draft, typography: { ...typography, ...next } });
  };

  const setFamily = (key: keyof typeof typography.families, value: string) => {
    set({ families: { ...typography.families, [key]: value } });
  };

  return (
    <Panel title="Typography" description="A base size and ratio generate the whole scale.">
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <Field label={`Base size (${typography.baseSizePx}px)`}>
            {(id) => (
              <input
                id={id}
                type="range"
                min={10}
                max={24}
                step={1}
                value={typography.baseSizePx}
                onChange={(event) => set({ baseSizePx: Number(event.target.value) })}
                className="w-full"
              />
            )}
          </Field>

          <Field label={`Ratio (${typography.ratio.toFixed(3)})`}>
            {(id) => (
              <input
                id={id}
                type="range"
                min={1.05}
                max={2}
                step={0.005}
                value={typography.ratio}
                onChange={(event) => set({ ratio: Number(event.target.value) })}
                className="w-full"
              />
            )}
          </Field>
        </div>

        {(['sans', 'serif', 'mono'] as const).map((key) => (
          <Field key={key} label={`${key} family`}>
            {(id) => (
              <input
                id={id}
                value={typography.families[key]}
                onChange={(event) => setFamily(key, event.target.value)}
                className={`${inputClass} font-mono text-xs`}
              />
            )}
          </Field>
        ))}

        {resolved && (
          <ul className="space-y-1 border-t border-zinc-200 pt-3 dark:border-zinc-800">
            {resolved.typography.steps.map((step) => (
              <li key={step.name} className="flex items-baseline justify-between gap-3">
                <span className="font-mono text-xs text-zinc-500">{step.name}</span>
                <span
                  className="flex-1 truncate text-right"
                  style={{
                    fontFamily: typography.families.sans,
                    fontSize: `${Math.min(step.sizeRem, 2)}rem`,
                    letterSpacing: `${step.letterSpacingEm}em`,
                  }}
                >
                  Ag
                </span>
                <span className="w-28 text-right font-mono text-xs text-zinc-500 tabular-nums">
                  {step.sizePx.toFixed(1)}px / {step.lineHeight}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </Panel>
  );
}
