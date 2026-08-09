import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Button } from '../../components/ui/button.js';
import { useDesignSystem } from '../systems/api.js';
import { ColorsPanel } from './panels/colors-panel.js';
import { PrimitivesPanel } from './panels/primitives-panel.js';
import { TypographyPanel } from './panels/typography-panel.js';
import { ExportViewer } from './preview/export-viewer.js';
import { PreviewPane } from './preview/preview-pane.js';
import { useDesignSystemDraft, type SaveStatus } from './use-design-system-draft.js';
import type { DesignSystemDetail } from '@dsg/contracts';

const SAVE_LABELS: Record<SaveStatus, string> = {
  saved: 'Saved',
  unsaved: 'Unsaved changes',
  saving: 'Saving…',
  invalid: 'Invalid — not saved',
  error: 'Save failed',
};

function EditorView({ system }: { system: DesignSystemDetail }) {
  const { draft, resolved, validationError, saveStatus, change } = useDesignSystemDraft(system);
  const [tab, setTab] = useState<'preview' | 'export'>('preview');

  return (
    <div className="flex h-full flex-col">
      <header className="flex items-center gap-4 border-b border-zinc-200 px-5 py-3 dark:border-zinc-800">
        <Link to="/" className="text-sm text-zinc-500 hover:underline">
          ← All systems
        </Link>
        <h1 className="font-medium">{system.name}</h1>
        <span
          role="status"
          className={`text-xs ${
            saveStatus === 'invalid' || saveStatus === 'error'
              ? 'text-red-600 dark:text-red-400'
              : 'text-zinc-500'
          }`}
        >
          {SAVE_LABELS[saveStatus]}
        </span>

        <div className="ml-auto flex gap-1">
          {(['preview', 'export'] as const).map((option) => (
            <Button
              key={option}
              variant={tab === option ? 'primary' : 'ghost'}
              onClick={() => setTab(option)}
              className="capitalize"
            >
              {option}
            </Button>
          ))}
        </div>
      </header>

      {validationError && (
        <p
          role="alert"
          className="border-b border-red-200 bg-red-50 px-5 py-2 text-xs text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-300"
        >
          {validationError}
        </p>
      )}

      <div className="flex min-h-0 flex-1">
        <aside className="w-[26rem] shrink-0 overflow-y-auto border-r border-zinc-200 dark:border-zinc-800">
          <ColorsPanel draft={draft} resolved={resolved} onChange={change} />
          <TypographyPanel draft={draft} resolved={resolved} onChange={change} />
          <PrimitivesPanel draft={draft} resolved={resolved} onChange={change} />
        </aside>

        <main className="min-w-0 flex-1 overflow-y-auto">
          {resolved ? (
            tab === 'preview' ? (
              <PreviewPane resolved={resolved} />
            ) : (
              <ExportViewer
                resolved={resolved}
                systemId={system.id}
                systemName={system.name}
                systemSlug={system.slug}
              />
            )
          ) : (
            <p className="p-6 text-sm text-zinc-500">
              The current settings are not a valid design system, so there is nothing to render.
            </p>
          )}
        </main>
      </div>
    </div>
  );
}

export function EditorPage() {
  const { id = '' } = useParams();
  const system = useDesignSystem(id);

  if (system.isPending) {
    return <p className="p-6 text-sm text-zinc-500">Loading…</p>;
  }

  if (system.isError) {
    return (
      <div className="p-6">
        <p role="alert" className="text-sm text-red-600 dark:text-red-400">
          {system.error.message}
        </p>
        <Link to="/" className="mt-2 inline-block text-sm hover:underline">
          ← All systems
        </Link>
      </div>
    );
  }

  // Remounting per system id keeps the draft from carrying over between systems.
  return <EditorView key={system.data.id} system={system.data} />;
}
