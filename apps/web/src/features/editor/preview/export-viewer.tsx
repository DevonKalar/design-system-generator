import { emitFromResolved } from '@dsg/tokens';
import type { ResolvedDesignSystem } from '@dsg/tokens';
import { useMemo, useState } from 'react';
import { Button } from '../../../components/ui/button.js';

import { downloadFile } from '../../../lib/api-client.js';

interface ExportViewerProps {
  resolved: ResolvedDesignSystem;
  systemId: string;
  systemName: string;
  systemSlug: string;
}

export function ExportViewer({ resolved, systemId, systemName, systemSlug }: ExportViewerProps) {
  // The same emit function the server streams into the zip, so what is shown here and what
  // downloads cannot diverge.
  const { files } = useMemo(() => emitFromResolved(resolved, systemName), [resolved, systemName]);

  const [activePath, setActivePath] = useState(files[0]?.path ?? '');
  const [copied, setCopied] = useState(false);

  const active = files.find((file) => file.path === activePath) ?? files[0];

  const copy = async () => {
    if (!active) return;
    await navigator.clipboard.writeText(active.contents);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-1 border-b border-zinc-200 px-4 dark:border-zinc-800">
        {files.map((file) => (
          <button
            key={file.path}
            type="button"
            onClick={() => setActivePath(file.path)}
            aria-current={file.path === active?.path}
            className={`border-b-2 px-3 py-2.5 text-xs font-medium transition ${
              file.path === active?.path
                ? 'border-zinc-900 text-zinc-900 dark:border-white dark:text-white'
                : 'border-transparent text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200'
            }`}
          >
            {file.path}
          </button>
        ))}

        <div className="ml-auto flex items-center gap-2 py-1.5">
          <Button onClick={() => void copy()}>{copied ? 'Copied' : 'Copy'}</Button>
          <Button
            variant="primary"
            onClick={() =>
              void downloadFile(`/api/design-systems/${systemId}/export.zip`, `${systemSlug}.zip`)
            }
          >
            Download .zip
          </Button>
        </div>
      </div>

      <pre className="flex-1 overflow-auto bg-zinc-50 p-4 text-xs leading-relaxed dark:bg-zinc-900">
        <code>{active?.contents}</code>
      </pre>
    </div>
  );
}
