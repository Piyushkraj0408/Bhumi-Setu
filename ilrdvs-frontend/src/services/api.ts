// ---------------------------------------------------------------------------
// Base API client.
//
// `apiFetch` is the single HTTP entry-point. It:
//   1. Injects the Authorization: Bearer header from localStorage.
//   2. On a 401 response, attempts a silent token refresh once.
//   3. On any non-2xx response, throws ApiError.
//
// Services that don't yet have a backend endpoint continue to use
// `simulateLatency` so the UI keeps working while the API is extended.
// ---------------------------------------------------------------------------

import { tokenStore } from "../lib/tokenStore";

export const API_BASE_URL =
  (import.meta.env.VITE_API_BASE_URL as string | undefined) ?? "/api/v1";

export class ApiError extends Error {
  status: number;
  constructor(message: string, status = 500) {
    super(message);
    this.status = status;
    this.name = "ApiError";
  }
}

/** Simulates network latency for mock services so loading states are visible. */
export function simulateLatency<T>(data: T, ms = 450): Promise<T> {
  return new Promise((resolve) => setTimeout(() => resolve(data), ms));
}

// ---- internal helpers -------------------------------------------------------

let _isRefreshing = false;
let _refreshQueue: Array<(ok: boolean) => void> = [];

async function _doRefresh(): Promise<boolean> {
  const refreshToken = tokenStore.getRefresh();
  if (!refreshToken) return false;
  try {
    const res = await fetch(`${API_BASE_URL}/auth/refresh`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refresh_token: refreshToken }),
    });
    if (!res.ok) return false;
    const data = (await res.json()) as {
      access_token: string;
      refresh_token: string;
    };
    tokenStore.set(data.access_token, data.refresh_token);
    return true;
  } catch {
    return false;
  }
}

async function _ensureRefreshed(): Promise<boolean> {
  if (_isRefreshing) {
    return new Promise<boolean>((resolve) => _refreshQueue.push(resolve));
  }
  _isRefreshing = true;
  const ok = await _doRefresh();
  _isRefreshing = false;
  _refreshQueue.forEach((cb) => cb(ok));
  _refreshQueue = [];
  return ok;
}

// ---- public API -------------------------------------------------------------

export interface ApiFetchOptions extends Omit<RequestInit, "body"> {
  body?: BodyInit | Record<string, unknown> | null;
  /** If true, don't set Content-Type (for multipart/form-data uploads). */
  isFormData?: boolean;
}

/**
 * Authenticated fetch wrapper.
 * Usage: `const data = await apiFetch<MyType>("/documents")`
 */
export async function apiFetch<T = unknown>(
  path: string,
  options: ApiFetchOptions = {}
): Promise<T> {
  const { body, isFormData, ...rest } = options;

  const buildHeaders = (): HeadersInit => {
    const headers: Record<string, string> = {};
    const access = tokenStore.getAccess();
    if (access) headers["Authorization"] = `Bearer ${access}`;
    if (!isFormData && body && typeof body === "object" && !(body instanceof FormData)) {
      headers["Content-Type"] = "application/json";
    }
    return headers;
  };

  const buildBody = (): BodyInit | null | undefined => {
    if (!body) return undefined;
    if (body instanceof FormData) return body;
    if (typeof body === "object") return JSON.stringify(body);
    return body as BodyInit;
  };

  const doFetch = () =>
    fetch(`${API_BASE_URL}${path}`, {
      ...rest,
      headers: { ...buildHeaders(), ...(rest.headers ?? {}) },
      body: buildBody(),
    });

  let response = await doFetch();

  // Silent token refresh on first 401
  if (response.status === 401) {
    const refreshed = await _ensureRefreshed();
    if (refreshed) {
      response = await doFetch();
    } else {
      tokenStore.clear();
      window.location.href = "/login";
      throw new ApiError("Session expired. Please sign in again.", 401);
    }
  }

  if (!response.ok) {
    let message = `Request failed: ${response.status} ${response.statusText}`;
    try {
      const err = await response.json();
      if (err?.detail) message = err.detail;
    } catch {
      // ignore JSON parse errors
    }
    throw new ApiError(message, response.status);
  }

  // Handle 204 No Content
  if (response.status === 204) return undefined as T;

  return response.json() as Promise<T>;
}

