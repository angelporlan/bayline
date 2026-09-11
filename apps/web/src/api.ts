import type { DemoRole } from "./types";

const ROLE_KEY = "bayline-role";

export function getStoredRole(): DemoRole {
  const v = localStorage.getItem(ROLE_KEY);
  if (v === "quality" || v === "engineering" || v === "operator") return v;
  return "operator";
}

export function storeRole(role: DemoRole): void {
  localStorage.setItem(ROLE_KEY, role);
}

export class ApiError extends Error {
  status: number;
  body: unknown;

  constructor(status: number, body: unknown) {
    const msg =
      typeof body === "object" && body && "error" in body
        ? String((body as { error: string }).error)
        : `HTTP ${status}`;
    super(msg);
    this.status = status;
    this.body = body;
  }
}

export async function api<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers);
  if (!headers.has("Content-Type") && init.body) {
    headers.set("Content-Type", "application/json");
  }
  headers.set("X-Demo-Role", getStoredRole());
  const res = await fetch(path, { ...init, headers });
  const text = await res.text();
  let data: unknown = null;
  if (text) {
    try {
      data = JSON.parse(text) as unknown;
    } catch {
      data = { raw: text };
    }
  }
  if (!res.ok) {
    throw new ApiError(res.status, data);
  }
  return data as T;
}
