import type { AuthResponse } from "../types";

export const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:8080";

let sessionRestoreRequest: Promise<AuthResponse | null> | null = null;

export function restoreSessionFromCookie(): Promise<AuthResponse | null> {
  if (!sessionRestoreRequest) {
    sessionRestoreRequest = fetch(`${API_URL}/api/v1/auth/refresh`, {
      method: "POST",
      credentials: "include",
    })
      .then(async (response) => response.ok ? response.json() as Promise<AuthResponse> : null)
      .catch(() => null)
      .finally(() => {
        sessionRestoreRequest = null;
      });
  }
  return sessionRestoreRequest;
}

export async function authorizedFetch(
  path: string,
  token: string,
  init: RequestInit,
  onRefresh: (session: AuthResponse) => void,
  onExpired: () => void,
): Promise<Response> {
  const send = (accessToken: string) => {
    const headers = new Headers(init.headers);
    headers.set("Authorization", `Bearer ${accessToken}`);
    return fetch(`${API_URL}${path}`, { ...init, headers });
  };

  const response = await send(token);
  if (response.status !== 401) return response;

  const refreshResponse = await fetch(`${API_URL}/api/v1/auth/refresh`, {
    method: "POST",
    credentials: "include",
  });
  if (!refreshResponse.ok) {
    onExpired();
    return response;
  }
  const session = await refreshResponse.json() as AuthResponse;
  onRefresh(session);
  return send(session.accessToken);
}
