import type { AuthUser } from '@dsg/contracts';
import {
  createContext,
  use,
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { accessTokenStore } from '../../lib/access-token-store.js';
import { api, refreshSession } from '../../lib/api-client.js';

export type AuthStatus = 'loading' | 'authenticated' | 'anonymous';

interface AuthContextValue {
  status: AuthStatus;
  user: AuthUser | null;
  signIn: () => void;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<AuthStatus>('loading');
  const [user, setUser] = useState<AuthUser | null>(null);

  // On load there is no access token in memory — only, possibly, an httpOnly refresh cookie.
  // Exchanging it is what distinguishes "signed in" from "signed out" after a reload.
  useEffect(() => {
    let cancelled = false;

    void refreshSession().then((session) => {
      if (cancelled) return;
      setUser(session?.user ?? null);
      setStatus(session ? 'authenticated' : 'anonymous');
    });

    return () => {
      cancelled = true;
    };
  }, []);

  const signIn = useCallback(() => {
    // A full navigation, not fetch: Google's consent screen must be a top-level document.
    globalThis.location.href = '/api/auth/google';
  }, []);

  const signOut = useCallback(async () => {
    await api.post('/api/auth/logout');
    accessTokenStore.set(null);
    setUser(null);
    setStatus('anonymous');
  }, []);

  const value = useMemo(() => ({ status, user, signIn, signOut }), [status, user, signIn, signOut]);

  return <AuthContext value={value}>{children}</AuthContext>;
}

export function useAuth(): AuthContextValue {
  const value = use(AuthContext);

  if (!value) {
    throw new Error('useAuth must be used inside an AuthProvider');
  }
  return value;
}
