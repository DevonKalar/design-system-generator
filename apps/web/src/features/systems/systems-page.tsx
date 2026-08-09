import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '../../components/ui/button.js';
import { inputClass } from '../../components/ui/field.js';
import { useAuth } from '../auth/auth-context.js';
import { useCreateDesignSystem, useDeleteDesignSystem, useDesignSystems } from './api.js';

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

export function SystemsPage() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const systems = useDesignSystems();
  const create = useCreateDesignSystem();
  const remove = useDeleteDesignSystem();
  const [name, setName] = useState('');

  const handleCreate = (event: React.FormEvent) => {
    event.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) return;

    create.mutate(trimmed, {
      onSuccess: (created) => {
        setName('');
        void navigate(`/systems/${created.id}`);
      },
    });
  };

  return (
    <div className="mx-auto max-w-3xl p-6">
      <header className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Design systems</h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">{user?.email}</p>
        </div>
        <Button variant="ghost" onClick={() => void signOut()}>
          Sign out
        </Button>
      </header>

      <form onSubmit={handleCreate} className="mb-8 flex gap-2">
        <input
          aria-label="New design system name"
          placeholder="New design system name"
          value={name}
          onChange={(event) => setName(event.target.value)}
          className={inputClass}
        />
        <Button
          type="submit"
          variant="primary"
          disabled={create.isPending || name.trim().length === 0}
          className="shrink-0"
        >
          {create.isPending ? 'Creating…' : 'Create'}
        </Button>
      </form>

      {create.isError && (
        <p role="alert" className="mb-4 text-sm text-red-600 dark:text-red-400">
          {create.error.message}
        </p>
      )}

      {systems.isPending && <p className="text-sm text-zinc-500">Loading…</p>}

      {systems.isError && (
        <p role="alert" className="text-sm text-red-600 dark:text-red-400">
          {systems.error.message}
        </p>
      )}

      {systems.data?.length === 0 && (
        <p className="rounded-lg border border-dashed border-zinc-300 p-8 text-center text-sm text-zinc-500 dark:border-zinc-700">
          No design systems yet. Create one above to get started.
        </p>
      )}

      <ul className="divide-y divide-zinc-200 dark:divide-zinc-800">
        {systems.data?.map((system) => (
          <li key={system.id} className="flex items-center justify-between gap-4 py-3">
            <Link to={`/systems/${system.id}`} className="group min-w-0 flex-1">
              <p className="truncate font-medium group-hover:underline">{system.name}</p>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                {system.slug} · updated {formatDate(system.updatedAt)}
              </p>
            </Link>
            <Button
              variant="danger"
              aria-label={`Delete ${system.name}`}
              disabled={remove.isPending}
              onClick={() => remove.mutate(system.id)}
            >
              Delete
            </Button>
          </li>
        ))}
      </ul>
    </div>
  );
}
