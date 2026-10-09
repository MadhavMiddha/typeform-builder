/**
 * Typed fetch wrapper.
 *
 * - Base URL from NEXT_PUBLIC_API_URL (defaults to http://localhost:8000)
 * - All responses expected as JSON
 * - Throws ApiError on non-2xx, carrying the backend error shape
 */
import type { ApiErrorDetail } from "@/lib/types";

const BASE_URL =
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

// ──────────────────────────────────────────────────────────────────────────────
// Error class
// ──────────────────────────────────────────────────────────────────────────────

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly detail: ApiErrorDetail
  ) {
    super(detail.message);
    this.name = "ApiError";
  }
}

// ──────────────────────────────────────────────────────────────────────────────
// Core fetch wrapper
// ──────────────────────────────────────────────────────────────────────────────

async function apiFetch<T>(
  path: string,
  options?: RequestInit
): Promise<T> {
  const url = `${BASE_URL}${path}`;

  const response = await fetch(url, {
    headers: {
      "Content-Type": "application/json",
      ...options?.headers,
    },
    ...options,
  });

  if (!response.ok) {
    let detail: ApiErrorDetail;
    try {
      const body = await response.json();
      detail = body?.error ?? {
        code: "UNKNOWN_ERROR",
        message: `HTTP ${response.status}`,
      };
    } catch {
      detail = {
        code: "UNKNOWN_ERROR",
        message: `HTTP ${response.status}`,
      };
    }
    throw new ApiError(response.status, detail);
  }

  // 204 No Content
  if (response.status === 204) {
    return undefined as T;
  }

  return response.json() as Promise<T>;
}

// ──────────────────────────────────────────────────────────────────────────────
// Convenience methods
// ──────────────────────────────────────────────────────────────────────────────

export const api = {
  get: <T>(path: string, options?: RequestInit) =>
    apiFetch<T>(path, { method: "GET", ...options }),

  post: <T>(path: string, body?: unknown, options?: RequestInit) =>
    apiFetch<T>(path, {
      method: "POST",
      body: body !== undefined ? JSON.stringify(body) : undefined,
      ...options,
    }),

  patch: <T>(path: string, body?: unknown, options?: RequestInit) =>
    apiFetch<T>(path, {
      method: "PATCH",
      body: body !== undefined ? JSON.stringify(body) : undefined,
      ...options,
    }),

  put: <T>(path: string, body?: unknown, options?: RequestInit) =>
    apiFetch<T>(path, {
      method: "PUT",
      body: body !== undefined ? JSON.stringify(body) : undefined,
      ...options,
    }),

  delete: <T>(path: string, options?: RequestInit) =>
    apiFetch<T>(path, { method: "DELETE", ...options }),
};

// ──────────────────────────────────────────────────────────────────────────────
// Endpoint helpers
// ──────────────────────────────────────────────────────────────────────────────

export const endpoints = {
  health: () => "/api/health",

  forms: {
    list: () => "/api/forms",
    create: () => "/api/forms",
    get: (id: number) => `/api/forms/${id}`,
    update: (id: number) => `/api/forms/${id}`,
    delete: (id: number) => `/api/forms/${id}`,
    duplicate: (id: number) => `/api/forms/${id}/duplicate`,
    publish: (id: number) => `/api/forms/${id}/publish`,
    unpublish: (id: number) => `/api/forms/${id}/unpublish`,
    questions: {
      create: (formId: number) => `/api/forms/${formId}/questions`,
      reorder: (formId: number) => `/api/forms/${formId}/questions/order`,
    },
    responses: {
      list: (formId: number) => `/api/forms/${formId}/responses`,
      get: (formId: number, rid: number) =>
        `/api/forms/${formId}/responses/${rid}`,
      summary: (formId: number) => `/api/forms/${formId}/summary`,
      export: (formId: number) => `/api/forms/${formId}/responses/export.csv`,
    },
  },

  questions: {
    update: (qid: number) => `/api/questions/${qid}`,
    delete: (qid: number) => `/api/questions/${qid}`,
    options: (qid: number) => `/api/questions/${qid}/options`,
    logic: (qid: number) => `/api/questions/${qid}/logic`,
  },

  public: {
    form: (publicId: string) => `/public/forms/${publicId}`,
    start: (publicId: string) =>
      `/public/forms/${publicId}/responses/start`,
    submit: (publicId: string) => `/public/forms/${publicId}/responses`,
  },
} as const;
