import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AuthProvider, useAuth } from './features/auth/auth-context.js';
import { LoginPage } from './features/auth/login-page.js';
import { EditorPage } from './features/editor/editor-page.js';
import { SystemsPage } from './features/systems/systems-page.js';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // The API client already refreshes and retries once on 401; a query-level retry would
      // just repeat requests that failed for a real reason.
      retry: false,
      refetchOnWindowFocus: false,
    },
  },
});

function RequireAuth({ children }: { children: ReactNode }) {
  const { status } = useAuth();

  if (status === 'loading') {
    return <p className="p-6 text-sm text-zinc-500">Loading…</p>;
  }

  if (status === 'anonymous') {
    return <Navigate to="/login" replace />;
  }

  return children;
}

export function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route
              path="/"
              element={
                <RequireAuth>
                  <SystemsPage />
                </RequireAuth>
              }
            />
            <Route
              path="/systems/:id"
              element={
                <RequireAuth>
                  <EditorPage />
                </RequireAuth>
              }
            />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </QueryClientProvider>
  );
}
