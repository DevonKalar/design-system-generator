import { Navigate, useSearchParams } from 'react-router-dom';
import { useAuth } from './auth-context.js';

export function LoginPage() {
  const { status, signIn } = useAuth();
  const [params] = useSearchParams();
  const error = params.get('error');

  if (status === 'authenticated') {
    return <Navigate to="/" replace />;
  }

  return (
    <main className="flex min-h-full items-center justify-center p-6">
      <div className="w-full max-w-sm space-y-6 text-center">
        <div className="space-y-2">
          <h1 className="text-2xl font-semibold tracking-tight">Design System Generator</h1>
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            Build a design system and export CSS tokens and a Tailwind v4 setup.
          </p>
        </div>

        {error && (
          <p
            role="alert"
            className="rounded-md border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-300"
          >
            Sign-in failed. Please try again.
          </p>
        )}

        <button
          type="button"
          onClick={signIn}
          disabled={status === 'loading'}
          className="w-full rounded-md bg-zinc-900 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-zinc-700 disabled:opacity-50 dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-200"
        >
          {status === 'loading' ? 'Checking session…' : 'Continue with Google'}
        </button>
      </div>
    </main>
  );
}
