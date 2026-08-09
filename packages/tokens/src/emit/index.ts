import type { DesignSystemDefinition } from '@dsg/contracts';
import { resolveDesignSystem, type ResolvedDesignSystem } from '../resolve.js';
import { emitTokensCss, emitSemanticCss } from './plain-css.js';
import { emitReadme } from './readme.js';
import { emitTailwindTheme } from './tailwind.js';

export interface EmittedFile {
  /** Path relative to the export root. */
  path: string;
  contents: string;
}

export interface EmitResult {
  files: EmittedFile[];
}

/**
 * The single export surface. The editor renders `files` as preview tabs and the API streams
 * the same array into a zip, so neither holds its own copy of the emit logic and the
 * download can never drift from what the user was shown.
 */
export function emitFromResolved(resolved: ResolvedDesignSystem, systemName: string): EmitResult {
  return {
    files: [
      { path: 'theme.css', contents: emitTailwindTheme(resolved) },
      { path: 'tokens.css', contents: emitTokensCss(resolved) },
      { path: 'semantic.css', contents: emitSemanticCss(resolved) },
      { path: 'README.md', contents: emitReadme(systemName, resolved) },
    ],
  };
}

export function emitDesignSystem(
  definition: DesignSystemDefinition,
  systemName: string,
): EmitResult {
  return emitFromResolved(resolveDesignSystem(definition), systemName);
}

export { emitTailwindTheme, emitTokensCss, emitSemanticCss, emitReadme };
