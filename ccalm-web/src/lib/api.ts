import { getSalaryUnlockToken } from "@/lib/salary-unlock";

const API_BASE = (import.meta.env.VITE_API_BASE ?? "/api").replace(/\/+$/, "");

export const AUTH_TOKEN_KEY = "auth:token";

type HttpMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";

export type ApiOptions = {
  /** 附带薪资二次验证 token（除 /salary/unlock 外的薪资接口） */
  salary?: boolean;
};

export type ApiError = Error & { status?: number; body?: unknown };

let onUnauthorized: (() => void) | null = null;

export function setUnauthorizedHandler(handler: (() => void) | null) {
  onUnauthorized = handler;
}

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
  return `请求失败（${res.status}）`;
}

export function getToken(): string | null {
  return localStorage.getItem(AUTH_TOKEN_KEY);
}

export function setToken(token: string | null) {
  if (!token) localStorage.removeItem(AUTH_TOKEN_KEY);
  else localStorage.setItem(AUTH_TOKEN_KEY, token);
}

export async function api<T>(
  method: HttpMethod,
  path: string,
  body?: unknown,
  options?: ApiOptions,
): Promise<T> {
  const token = getToken();
  const salaryToken = options?.salary ? getSalaryUnlockToken() : null;
  const isFormData = body instanceof FormData;
  const res = await fetch(`${API_BASE}${path.startsWith("/") ? path : `/${path}`}`, {
    method,
    headers: {
      ...(isFormData ? {} : { "Content-Type": "application/json" }),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(salaryToken ? { "X-Salary-Token": salaryToken } : {}),
    },
    body: body === undefined ? undefined : isFormData ? body : JSON.stringify(body),
  });

  const text = await res.text();
  const data = text ? (JSON.parse(text) as unknown) : null;

  if (!res.ok) {
    // 薪资 PIN 等二次验证失败也会是 4xx，不能当成登录失效
    const isSessionUnauthorized =
      res.status === 401 && !path.replace(/^\//, "").startsWith("salary/unlock");
    if (isSessionUnauthorized) {
      setToken(null);
      onUnauthorized?.();
    }
    const err = new Error(messageFromFailedResponse(data, res, text)) as ApiError;
    err.status = res.status;
    err.body = data;
    throw err;
  }

  return data as T;
}
