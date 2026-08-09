import {
  designSystemDefinitionSchema,
  type DesignSystemDefinition,
  type DesignSystemDetail,
} from '@dsg/contracts';
import { resolveDesignSystem, type ResolvedDesignSystem } from '@dsg/tokens';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useUpdateDesignSystem } from '../systems/api.js';

const SAVE_DEBOUNCE_MS = 600;

export type SaveStatus = 'saved' | 'unsaved' | 'saving' | 'invalid' | 'error';

export interface DesignSystemDraft {
  draft: DesignSystemDefinition;
  /** Null while the draft is mid-edit and does not satisfy the schema. */
  resolved: ResolvedDesignSystem | null;
  validationError: string | null;
  saveStatus: SaveStatus;
  change: (next: DesignSystemDefinition) => void;
}

/**
 * Holds the definition locally and persists it on a debounce. Everything the editor renders
 * is derived from the local draft, so the preview updates on the keystroke rather than after
 * a round trip — the server is told about the change, it is not asked for the result.
 */
export function useDesignSystemDraft(system: DesignSystemDetail): DesignSystemDraft {
  const [draft, setDraft] = useState<DesignSystemDefinition>(system.definition);
  const [dirty, setDirty] = useState(false);
  const update = useUpdateDesignSystem(system.id);
  const { mutate } = update;

  const change = useCallback((next: DesignSystemDefinition) => {
    setDraft(next);
    setDirty(true);
  }, []);

  const validation = useMemo(() => designSystemDefinitionSchema.safeParse(draft), [draft]);

  const resolved = useMemo(
    () => (validation.success ? resolveDesignSystem(validation.data) : null),
    [validation],
  );

  useEffect(() => {
    // An invalid draft is never sent: the server would reject it and the retry would fire on
    // every subsequent keystroke.
    if (!dirty || !validation.success) return;

    const timer = setTimeout(() => {
      mutate({ definition: validation.data }, { onSuccess: () => setDirty(false) });
    }, SAVE_DEBOUNCE_MS);

    return () => clearTimeout(timer);
  }, [dirty, validation, mutate]);

  const saveStatus: SaveStatus = update.isPending
    ? 'saving'
    : update.isError
      ? 'error'
      : validation.success
        ? dirty
          ? 'unsaved'
          : 'saved'
        : 'invalid';

  return {
    draft,
    resolved,
    validationError: validation.success ? null : (validation.error.issues[0]?.message ?? null),
    saveStatus,
    change,
  };
}
