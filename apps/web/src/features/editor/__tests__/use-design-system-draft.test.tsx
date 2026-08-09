import { createDefaultDefinition, type DesignSystemDetail } from '@dsg/contracts';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useDesignSystemDraft } from '../use-design-system-draft.js';

const SYSTEM: DesignSystemDetail = {
  id: '11111111-1111-4111-8111-111111111111',
  name: 'Acme',
  slug: 'acme',
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
  schemaVersion: 1,
  definition: createDefaultDefinition(),
};

function wrapper({ children }: { children: ReactNode }) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

let fetchMock: ReturnType<typeof vi.fn>;

beforeEach(() => {
  fetchMock = vi.fn().mockImplementation(
    () =>
      new Response(JSON.stringify(SYSTEM), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
  );
  vi.stubGlobal('fetch', fetchMock);
});

function patchCalls(): unknown[] {
  return fetchMock.mock.calls.filter((call) => (call[1] as RequestInit)?.method === 'PATCH');
}

describe('useDesignSystemDraft', () => {
  it('starts clean and resolves the stored definition', () => {
    const { result } = renderHook(() => useDesignSystemDraft(SYSTEM), { wrapper });

    expect(result.current.saveStatus).toBe('saved');
    expect(result.current.resolved?.palettes).toHaveLength(4);
    expect(result.current.validationError).toBeNull();
  });

  it('reflects an edit immediately, before any request is made', () => {
    const { result } = renderHook(() => useDesignSystemDraft(SYSTEM), { wrapper });

    act(() => {
      result.current.change({
        ...result.current.draft,
        typography: { ...result.current.draft.typography, baseSizePx: 20 },
      });
    });

    // The point of the local draft: the preview updates without waiting for the server.
    expect(result.current.draft.typography.baseSizePx).toBe(20);
    expect(result.current.resolved?.typography.steps.find((s) => s.name === 'base')?.sizePx).toBe(
      20,
    );
    expect(result.current.saveStatus).toBe('unsaved');
    expect(patchCalls()).toHaveLength(0);
  });

  it('persists the edit after the debounce', async () => {
    const { result } = renderHook(() => useDesignSystemDraft(SYSTEM), { wrapper });

    act(() => {
      result.current.change({
        ...result.current.draft,
        radii: { basePx: 12 },
      });
    });

    await waitFor(() => expect(patchCalls()).toHaveLength(1), { timeout: 2000 });
    await waitFor(() => expect(result.current.saveStatus).toBe('saved'));

    const [path, init] = fetchMock.mock.calls.find(
      (call) => (call[1] as RequestInit)?.method === 'PATCH',
    )!;
    expect(path).toBe(`/api/design-systems/${SYSTEM.id}`);
    expect(JSON.parse((init as RequestInit).body as string).definition.radii.basePx).toBe(12);
  });

  it('coalesces rapid edits into one request', async () => {
    const { result } = renderHook(() => useDesignSystemDraft(SYSTEM), { wrapper });

    for (const basePx of [2, 4, 6, 8]) {
      act(() => {
        result.current.change({ ...result.current.draft, spacing: { basePx } });
      });
    }

    await waitFor(() => expect(patchCalls()).toHaveLength(1), { timeout: 2000 });

    const init = patchCalls()[0] as unknown as [string, RequestInit];
    expect(JSON.parse((init[1].body as string) ?? '{}').definition.spacing.basePx).toBe(8);
  });

  it('never sends a draft that fails validation', async () => {
    const { result } = renderHook(() => useDesignSystemDraft(SYSTEM), { wrapper });

    act(() => {
      result.current.change({
        ...result.current.draft,
        colors: {
          ...result.current.draft.colors,
          // Leaves the `destructive` tokens pointing at a palette that no longer exists.
          palettes: result.current.draft.colors.palettes.filter((p) => p.name !== 'danger'),
        },
      });
    });

    expect(result.current.saveStatus).toBe('invalid');
    expect(result.current.resolved).toBeNull();
    expect(result.current.validationError).toContain('unknown palette');

    // Well past the debounce — a rejected request here would retry on every keystroke.
    await new Promise((resolve) => {
      setTimeout(resolve, 900);
    });
    expect(patchCalls()).toHaveLength(0);
  });

  it('recovers once the draft becomes valid again', async () => {
    const { result } = renderHook(() => useDesignSystemDraft(SYSTEM), { wrapper });

    act(() => {
      result.current.change({
        ...result.current.draft,
        colors: {
          ...result.current.draft.colors,
          palettes: result.current.draft.colors.palettes.filter((p) => p.name !== 'danger'),
        },
      });
    });
    expect(result.current.saveStatus).toBe('invalid');

    act(() => {
      result.current.change({ ...SYSTEM.definition, radii: { basePx: 4 } });
    });

    await waitFor(() => expect(patchCalls()).toHaveLength(1), { timeout: 2000 });
    expect(result.current.validationError).toBeNull();
  });
});
