const API_BASE = (import.meta.env.VITE_API_BASE ?? "/api").replace(/\/+$/, "");

type HttpMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";

export type ApiError = Error & { status?: number; body?: unknown };

function messageFromFailedResponse(data: unknown, res: Response, rawText: string): string {
  if (data && typeof data === "object") {
    const m = (data as Record<string, unknown>).message;
    if (typeof m === "string" && m.trim()) return m.trim();
    if (Array.isArray(m)) {
      const parts = m.filter((x): x is string => typeof x === "string");
      if (parts.length) return parts.join("; ");
    }
  }
  const t = rawText.trim();
  if (t) return t;
  return `HTTP ${res.status}`;
}

function getToken(): string | null {
  return localStorage.getItem("auth:token");
}

export function setToken(token: string | null) {
  if (!token) localStorage.removeItem("auth:token");
  else localStorage.setItem("auth:token", token);
}

export async function api<T>(method: HttpMethod, path: string, body?: unknown): Promise<T> {
  const token = getToken();
  const isFormData = body instanceof FormData;
  const res = await fetch(`${API_BASE}${path.startsWith("/") ? path : `/${path}`}`, {
    method,
    headers: {
      ...(isFormData ? {} : { "Content-Type": "application/json" }),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body === undefined ? undefined : isFormData ? body : JSON.stringify(body),
  });

  const text = await res.text();
  const data = text ? (JSON.parse(text) as unknown) : null;

  if (!res.ok) {
    const err = new Error(messageFromFailedResponse(data, res, text)) as ApiError;
    err.status = res.status;
    err.body = data;
    throw err;
  }

  return data as T;
}
