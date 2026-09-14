import { getSalaryUnlockToken } from "@/lib/salary-unlock";

const API_BASE = (import.meta.env.VITE_API_BASE ?? "/api").replace(/\/+$/, "");

const AUTH_TOKEN_KEY = "auth:token";

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

type MakeupEventListener = () => void;

const makeupEventListeners = new Set<MakeupEventListener>();
let makeupEventAbort: AbortController | null = null;
let makeupEventReconnectTimer: number | null = null;

function stopMakeupEvents() {
  makeupEventAbort?.abort();
  makeupEventAbort = null;
  if (makeupEventReconnectTimer !== null) {
    window.clearTimeout(makeupEventReconnectTimer);
    makeupEventReconnectTimer = null;
  }
}

function scheduleMakeupEventsReconnect() {
  if (makeupEventListeners.size === 0 || makeupEventReconnectTimer !== null) return;
  makeupEventReconnectTimer = window.setTimeout(() => {
    makeupEventReconnectTimer = null;
    void connectMakeupEvents();
  }, 3000);
}

function dispatchMakeupEvent(block: string) {
  const data = block
    .split(/\r?\n/)
    .filter((line) => line.startsWith("data:"))
    .map((line) => line.slice(5).trimStart())
    .join("\n");
  if (!data) return;

  try {
    const event = JSON.parse(data) as { type?: string };
    if (event.type === "ping" || event.type === "connected") return;
  } catch {
    // 非 JSON 事件仍通知订阅方刷新
  }

  for (const listener of makeupEventListeners) listener();
}

async function connectMakeupEvents() {
  if (makeupEventListeners.size === 0 || makeupEventAbort) return;
  const token = getToken();
  if (!token) return;

  const controller = new AbortController();
  makeupEventAbort = controller;

  try {
    const res = await fetch(`${API_BASE}/attendance/makeup-events`, {
      headers: {
        Accept: "text/event-stream",
        Authorization: `Bearer ${token}`,
      },
      signal: controller.signal,
    });
    if (res.status === 401) {
      setToken(null);
      onUnauthorized?.();
      return;
    }
    if (!res.ok || !res.body) throw new Error(`SSE 请求失败（${res.status}）`);

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";

    while (true) {
      const { value, done } = await reader.read();
      buffer += decoder.decode(value, { stream: !done });
      const blocks = buffer.split(/\r?\n\r?\n/);
      buffer = blocks.pop() ?? "";
      for (const block of blocks) dispatchMakeupEvent(block);
      if (done) break;
    }
  } catch {
    if (!controller.signal.aborted) scheduleMakeupEventsReconnect();
  } finally {
    if (makeupEventAbort === controller) makeupEventAbort = null;
    if (!controller.signal.aborted) scheduleMakeupEventsReconnect();
  }
}

export function subscribeMakeupEvents(listener: MakeupEventListener) {
  makeupEventListeners.add(listener);
  void connectMakeupEvents();

  return () => {
    makeupEventListeners.delete(listener);
    if (makeupEventListeners.size === 0) stopMakeupEvents();
  };
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
  let data: unknown = null;
  if (text) {
    try {
      data = JSON.parse(text) as unknown;
    } catch {
      data = null;
    }
  }

  if (!res.ok) {
    // 薪资密码等二次验证失败也会是 4xx，不能当成登录失效
    const isSessionUnauthorized =
      res.status === 401 && !path.replace(/^\//, "").startsWith("salary/unlock");
    if (isSessionUnauthorized) {
      setToken(null);
      onUnauthorized?.();
    }
    const err = new Error(messageFromFailedResponse(data, res, text)) as ApiError;
    err.status = res.status;
    err.body = data ?? text;
    throw err;
  }

  if (text && data === null) {
    const err = new Error(`响应不是合法 JSON（${res.status}）`) as ApiError;
    err.status = res.status;
    err.body = text;
    throw err;
  }

  return data as T;
}
