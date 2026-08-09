import { useId, type ReactNode } from 'react';

interface FieldProps {
  label: string;
  hint?: string;
  children: (id: string) => ReactNode;
}

/** Label/control pairing that guarantees the two are associated for assistive tech. */
export function Field({ label, hint, children }: FieldProps) {
  const id = useId();

  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className="block text-xs font-medium text-zinc-600 dark:text-zinc-400">
        {label}
      </label>
      {children(id)}
      {hint && <p className="text-xs text-zinc-500 dark:text-zinc-500">{hint}</p>}
    </div>
  );
}

export const inputClass =
  'w-full rounded-md border border-zinc-300 bg-white px-2.5 py-1.5 text-sm text-zinc-900 outline-none focus:border-zinc-500 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:focus:border-zinc-500';
