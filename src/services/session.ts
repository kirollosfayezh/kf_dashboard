/**
 * The admin JWT issued by `POST /api/admin/auth/login`, persisted to
 * localStorage so a refresh keeps you signed in.
 *
 * This lives apart from the Zustand auth store so that `http.ts` can read the
 * token without importing the store (which imports `http.ts` in turn).
 */

const TOKEN_KEY = "kf.admin.token";

export function getToken(): string | null {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

export function setToken(token: string | null): void {
  try {
    if (token) localStorage.setItem(TOKEN_KEY, token);
    else localStorage.removeItem(TOKEN_KEY);
  } catch {
    /* private mode / blocked storage — the session just won't survive a refresh */
  }
}
