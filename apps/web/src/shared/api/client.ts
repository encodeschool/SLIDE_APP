import type { AuthResponse } from "../types";

export const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:8080";

let sessionRefreshRequest: Promise<AuthResponse | null> | null = null;

function refreshSessionFromCookie(): Promise<AuthResponse | null> {
  if (!sessionRefreshRequest) {
    sessionRefreshRequest = fetch(`${API_URL}/api/v1/auth/refresh`, {
      method: "POST",
      credentials: "include",
    })
      .then(async (response) =>
        response.ok && response.status !== 204
          ? response.json() as Promise<AuthResponse>
          : null,
      )
      .finally(() => {
        sessionRefreshRequest = null;
      });
  }
  return sessionRefreshRequest;
}

export function restoreSessionFromCookie(): Promise<AuthResponse | null> {
  return refreshSessionFromCookie().catch(() => null);
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

  const session = await refreshSessionFromCookie();
  if (!session) {
    onExpired();
    return response;
  }
  onRefresh(session);
  const retriedResponse = await send(session.accessToken);
  if (retriedResponse.status === 401) onExpired();
  return retriedResponse;
}
