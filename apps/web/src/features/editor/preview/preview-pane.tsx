import type { ResolvedDesignSystem, ThemeMode } from '@dsg/tokens';
import { previewVariables } from './preview-variables.js';

/**
 * Sample UI rendered entirely from the generated tokens. Styles reference `var(--…)` directly
 * rather than Tailwind utilities, because these variables live on this subtree, not on
 * `:root` where the app's own utilities resolve from.
 */
function PreviewSurface({ resolved, mode }: { resolved: ResolvedDesignSystem; mode: ThemeMode }) {
  return (
    <div
      data-testid={`preview-${mode}`}
      style={{
        ...previewVariables(resolved, mode),
        background: 'var(--color-background)',
        color: 'var(--color-foreground)',
        fontFamily: 'var(--font-sans)',
        padding: 'calc(var(--spacing) * 6)',
        borderRadius: 'var(--radius-lg)',
      }}
      className="border border-zinc-200 dark:border-zinc-800"
    >
      <p
        style={{
          fontSize: 'var(--text-xs)',
          letterSpacing: 'var(--text-xs--letter-spacing)',
          color: 'var(--color-muted-foreground)',
          textTransform: 'uppercase',
        }}
      >
        {mode}
      </p>

      <h2
        style={{
          fontSize: 'var(--text-3xl)',
          lineHeight: 'var(--text-3xl--line-height)',
          letterSpacing: 'var(--text-3xl--letter-spacing)',
          marginTop: 'calc(var(--spacing) * 2)',
          fontWeight: 600,
        }}
      >
        Ship a consistent interface
      </h2>

      <p
        style={{
          fontSize: 'var(--text-base)',
          lineHeight: 'var(--text-base--line-height)',
          color: 'var(--color-muted-foreground)',
          marginTop: 'calc(var(--spacing) * 2)',
        }}
      >
        Every color, size and shadow here comes from the tokens on the left.
      </p>

      <div
        style={{
          display: 'flex',
          gap: 'calc(var(--spacing) * 2)',
          marginTop: 'calc(var(--spacing) * 5)',
        }}
      >
        <button
          type="button"
          style={{
            background: 'var(--color-primary)',
            color: 'var(--color-primary-foreground)',
            borderRadius: 'var(--radius-md)',
            padding: 'calc(var(--spacing) * 2) calc(var(--spacing) * 4)',
            fontSize: 'var(--text-sm)',
            boxShadow: 'var(--shadow-sm)',
            fontWeight: 500,
          }}
        >
          Primary
        </button>
        <button
          type="button"
          style={{
            background: 'var(--color-secondary)',
            color: 'var(--color-secondary-foreground)',
            borderRadius: 'var(--radius-md)',
            padding: 'calc(var(--spacing) * 2) calc(var(--spacing) * 4)',
            fontSize: 'var(--text-sm)',
            fontWeight: 500,
          }}
        >
          Secondary
        </button>
        <button
          type="button"
          style={{
            background: 'var(--color-destructive)',
            color: 'var(--color-destructive-foreground)',
            borderRadius: 'var(--radius-md)',
            padding: 'calc(var(--spacing) * 2) calc(var(--spacing) * 4)',
            fontSize: 'var(--text-sm)',
            fontWeight: 500,
          }}
        >
          Delete
        </button>
      </div>

      <div
        style={{
          background: 'var(--color-card)',
          color: 'var(--color-card-foreground)',
          border: '1px solid var(--color-border)',
          borderRadius: 'var(--radius-lg)',
          boxShadow: 'var(--shadow-lg)',
          padding: 'calc(var(--spacing) * 4)',
          marginTop: 'calc(var(--spacing) * 5)',
        }}
      >
        <p style={{ fontSize: 'var(--text-lg)', fontWeight: 600 }}>Card</p>
        <p
          style={{
            fontSize: 'var(--text-sm)',
            color: 'var(--color-muted-foreground)',
            marginTop: 'calc(var(--spacing) * 1)',
          }}
        >
          Elevated surface with a border and shadow.
        </p>
        <input
          readOnly
          value="Input field"
          style={{
            marginTop: 'calc(var(--spacing) * 3)',
            width: '100%',
            background: 'var(--color-background)',
            color: 'var(--color-foreground)',
            border: '1px solid var(--color-input)',
            borderRadius: 'var(--radius-md)',
            padding: 'calc(var(--spacing) * 2)',
            fontSize: 'var(--text-sm)',
            outline: '2px solid var(--color-ring)',
            outlineOffset: '2px',
          }}
        />
      </div>
    </div>
  );
}

export function PreviewPane({ resolved }: { resolved: ResolvedDesignSystem }) {
  return (
    <div className="grid gap-6 p-6 lg:grid-cols-2">
      <PreviewSurface resolved={resolved} mode="light" />
      <PreviewSurface resolved={resolved} mode="dark" />
    </div>
  );
}
