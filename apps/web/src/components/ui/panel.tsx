import type { ReactNode } from 'react';

interface PanelProps {
  title: string;
  description?: string;
  actions?: ReactNode;
  children: ReactNode;
}

export function Panel({ title, description, actions, children }: PanelProps) {
  return (
    <section className="border-b border-zinc-200 p-5 dark:border-zinc-800">
      <header className="mb-4 flex items-start justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold">{title}</h2>
          {description && (
            <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">{description}</p>
          )}
        </div>
        {actions}
      </header>
      {children}
    </section>
  );
}
