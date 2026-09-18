import { create } from "zustand";
import { ApiError, apiRequest } from "@/services/http";
import { getToken, setToken } from "@/services/session";
import { disconnectSocket } from "@/services/socket";

export interface AdminUser {
  id: string;
  email: string;
  name: string | null;
}

interface LoginResponse {
  token: string;
  user: AdminUser;
}

interface AuthState {
  user: AdminUser | null;
  /** False until the stored token has been validated against `GET /admin/auth/me`. */
  bootstrapped: boolean;
  error: string | null;
  login: (email: string, password: string) => Promise<{ ok: boolean; error?: string }>;
  logout: () => void;
  /** Called by the 401 handler — drops the session without hitting the network. */
  clearSession: () => void;
  bootstrap: () => Promise<void>;
}

export const useAuth = create<AuthState>((set, get) => ({
  user: null,
  bootstrapped: false,
  error: null,

  login: async (email, password) => {
    try {
      const res = await apiRequest<LoginResponse>("/admin/auth/login", {
        method: "POST",
        body: { email: email.trim(), password },
        auth: false,
      });
      setToken(res.token);
      set({ user: res.user, error: null, bootstrapped: true });
      return { ok: true };
    } catch (e) {
      const message = friendlyAuthError(e);
      set({ error: message });
      return { ok: false, error: message };
    }
  },

  logout: () => {
    setToken(null);
    disconnectSocket();
    set({ user: null, error: null, bootstrapped: true });
  },

  clearSession: () => {
    if (!getToken() && !get().user) return;
    setToken(null);
    disconnectSocket();
    set({ user: null, bootstrapped: true });
  },

  bootstrap: async () => {
    const token = getToken();
    if (!token) {
      set({ user: null, bootstrapped: true });
      return;
    }
    try {
      const user = await apiRequest<AdminUser>("/admin/auth/me", { method: "GET" });
      set({ user, bootstrapped: true });
    } catch (e) {
      // An expired/invalid token is the normal case here; a network error means
      // the API is down — either way there's no usable session to restore.
      if (e instanceof ApiError && e.status === 401) setToken(null);
      set({ user: null, bootstrapped: true });
    }
  },
}));

function friendlyAuthError(e: unknown): string {
  if (e instanceof ApiError) {
    if (e.status === 0) return "Can't reach the server. Is the API running?";
    if (e.status === 401) return "Incorrect email or password.";
    if (e.status === 400) return e.message || "Email and password are required.";
    return e.message || "Sign-in failed. Please try again.";
  }
  return "Sign-in failed. Please try again.";
}
