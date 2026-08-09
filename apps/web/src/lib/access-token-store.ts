type Listener = (token: string | null) => void;

let current: string | null = null;
const listeners = new Set<Listener>();

/**
 * Holds the access token in memory only — never localStorage or sessionStorage, where any
 * injected script could read it. It is deliberately outside React so the fetch wrapper can
 * read and replace it without a hook, and survives remounts but not a page reload (on reload
 * the app silently re-acquires one from the httpOnly refresh cookie).
 */
export const accessTokenStore = {
  get(): string | null {
    return current;
  },

  set(token: string | null): void {
    current = token;
    for (const listener of listeners) {
      listener(token);
    }
  },

  subscribe(listener: Listener): () => void {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  },
};
