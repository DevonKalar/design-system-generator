import {
  SCALE_STEPS,
  SEMANTIC_TOKENS,
  type ScaleStep,
  type SemanticMap,
  type SemanticToken,
} from '@dsg/contracts';
import type { ResolvedSemanticMap } from '@dsg/tokens';
import { inputClass } from '../../../components/ui/field.js';

interface SemanticEditorProps {
  paletteNames: string[];
  semantic: SemanticMap;
  resolved: ResolvedSemanticMap | undefined;
  onChange: (token: SemanticToken, palette: string, step: ScaleStep) => void;
}

export function SemanticEditor({
  paletteNames,
  semantic,
  resolved,
  onChange,
}: SemanticEditorProps) {
  return (
    <ul className="space-y-1.5">
      {SEMANTIC_TOKENS.map((token) => {
        const ref = semantic[token];

        return (
          <li key={token} className="flex items-center gap-2">
            <span
              aria-hidden
              style={{ background: resolved?.[token].color.css }}
              className="h-6 w-6 shrink-0 rounded border border-black/10 dark:border-white/15"
            />
            <span className="flex-1 truncate font-mono text-xs text-zinc-600 dark:text-zinc-400">
              {token}
            </span>

            <select
              aria-label={`${token} palette`}
              value={ref.palette}
              onChange={(event) => onChange(token, event.target.value, ref.step)}
              className={`${inputClass} w-28 shrink-0 py-1`}
            >
              {/* A palette renamed mid-edit is briefly absent from the list; keeping the
                  current value as an option stops the select snapping to another palette. */}
              {(paletteNames.includes(ref.palette)
                ? paletteNames
                : [ref.palette, ...paletteNames]
              ).map((name) => (
                <option key={name} value={name}>
                  {name}
                </option>
              ))}
            </select>

            <select
              aria-label={`${token} step`}
              value={ref.step}
              onChange={(event) =>
                onChange(token, ref.palette, Number(event.target.value) as ScaleStep)
              }
              className={`${inputClass} w-20 shrink-0 py-1`}
            >
              {SCALE_STEPS.map((step) => (
                <option key={step} value={step}>
                  {step}
                </option>
              ))}
            </select>
          </li>
        );
      })}
    </ul>
  );
}
