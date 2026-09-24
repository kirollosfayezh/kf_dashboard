import type { ApiEnvelope } from "./api-types";
import { messageFromEnvelope } from "./api-types";
import { getToken } from "./session";

/** Origin of the Express server on Render — also where Socket.io lives. */
export const SERVER_ORIGIN =
  (import.meta.env.VITE_API_BASE_URL as string | undefined)?.replace(/\/+$/, "") ?? "";

/** Every REST route is mounted under `/api` by the backend (see app.ts). */
export const API_BASE = `${SERVER_ORIGIN}/api`;

export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public code?: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

/** Called on a 401 from an authenticated admin request — the router redirects to /login. */
let onUnauthorized: (() => void) | null = null;
export function setUnauthorizedHandler(fn: (() => void) | null) {
  onUnauthorized = fn;
}

type RequestOptions = Omit<RequestInit, "body"> & {
  body?: unknown;
  auth?: boolean;
};

export async function apiRequest<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { body, auth: needsAuth = true, headers: initHeaders, ...rest } = options;
  const headers = new Headers(initHeaders);

  if (body !== undefined && !(body instanceof FormData)) {
    headers.set("Content-Type", "application/json");
  }

  if (needsAuth) {
    const token = getToken();
    if (!token) {
      onUnauthorized?.();
      throw new ApiError("Not signed in", 401, "Auth.SignedOut");
    }
    headers.set("Authorization", `Bearer ${token}`);
  }

  let res: Response;
  try {
    res = await fetch(`${API_BASE}${path}`, {
      ...rest,
      headers,
      body:
        body === undefined ? undefined : body instanceof FormData ? body : JSON.stringify(body),
    });
  } catch {
    // Network-level failure (server down, CORS, offline) — never let this bubble
    // up as an unhandled rejection; screens render it as an error banner.
    throw new ApiError(
      "Can't reach the server. Check your connection and that the API is running.",
      0,
      "Network.Unreachable",
    );
  }

  const text = await res.text();
  let parsed: unknown = null;
  if (text) {
    try {
      parsed = JSON.parse(text);
    } catch {
      parsed = null;
    }
  }

  const envelope = parsed as ApiEnvelope<T> | null;

  if (res.status === 401 && needsAuth) {
    onUnauthorized?.();
  }

  if (!res.ok || (envelope && envelope.success === false)) {
    // No SERVER_ORIGIN means the build had no VITE_API_BASE_URL, so this request
    // went to the static host rather than the API — which answers a POST with
    // 405 and a GET with the SPA's own HTML. Name the real cause.
    if (!SERVER_ORIGIN && (res.status === 405 || res.status === 404)) {
      throw new ApiError(
        "This build has no API address (VITE_API_BASE_URL), so it is calling itself. " +
          "Set it to the backend origin and redeploy.",
        res.status,
        "Config.MissingApiBaseUrl",
      );
    }
    const message = envelope ? messageFromEnvelope(envelope) : `Request failed (${res.status})`;
    const code = envelope?.errors?.[0]?.code;
    throw new ApiError(message, res.status, code);
  }

  if (envelope && typeof envelope === "object" && "success" in envelope) {
    return envelope.data as T;
  }

  return parsed as T;
}

export const api = {
  get: <T>(path: string) => apiRequest<T>(path, { method: "GET" }),
  post: <T>(path: string, body?: unknown) => apiRequest<T>(path, { method: "POST", body }),
  patch: <T>(path: string, body?: unknown) => apiRequest<T>(path, { method: "PATCH", body }),
  put: <T>(path: string, body?: unknown) => apiRequest<T>(path, { method: "PUT", body }),
  delete: <T>(path: string, body?: unknown) => apiRequest<T>(path, { method: "DELETE", body }),
};
