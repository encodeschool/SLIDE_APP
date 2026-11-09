import { apiFetch, readApiError } from "../../shared/api/client";

export interface AuthResponse {
  user: {
    id: string;
    email: string;
    displayName: string;
    roles: string[];
  };
  accessToken: string;
}

let refreshRequest: Promise<AuthResponse | null> | null = null;

export async function login(email: string, password: string, fallback: string): Promise<AuthResponse> {
  const response = await apiFetch("/api/v1/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  if (!response.ok) throw await readApiError(response, fallback);
  return response.json() as Promise<AuthResponse>;
}

export async function completeAdminInvitation(token: string, newPassword: string, fallback: string): Promise<void> {
  const response = await apiFetch("/api/v1/auth/admin-invitation/complete", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ token, newPassword }),
  });
  if (!response.ok) throw await readApiError(response, fallback);
}

export async function requestAdminInvitation(email: string, fallback: string): Promise<void> {
  const response = await apiFetch("/api/v1/auth/admin-invitation/request", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email }),
  });
  if (!response.ok) throw await readApiError(response, fallback);
}

export async function refreshSession(): Promise<AuthResponse | null> {
  if (!refreshRequest) {
    refreshRequest = apiFetch("/api/v1/auth/refresh", { method: "POST" })
      .then((response) => response.ok ? response.json() as Promise<AuthResponse> : null)
      .catch(() => null)
      .finally(() => { refreshRequest = null; });
  }
  return refreshRequest;
}

export async function logout(): Promise<void> {
  await apiFetch("/api/v1/auth/logout", { method: "POST" }).catch(() => undefined);
}

export function isAdmin(session: AuthResponse | null): session is AuthResponse {
  return Boolean(session?.user.roles.includes("ADMIN"));
}

export async function authorizedAdminFetch(
  path: string,
  token: string,
  onAccessToken: (token: string | null) => void,
  refreshUnavailable: string,
  genericError: string,
  init: RequestInit = {},
): Promise<Response> {
  const send = (accessToken: string) => {
    const headers = new Headers(init.headers);
    headers.set("Authorization", `Bearer ${accessToken}`);
    return apiFetch(path, { ...init, headers });
  };
  let response = await send(token);
  if (response.status === 401) {
    const session = await refreshSession();
    if (!isAdmin(session)) {
      onAccessToken(null);
      throw new Error(refreshUnavailable);
    }
    onAccessToken(session.accessToken);
    response = await send(session.accessToken);
  }
  if (!response.ok) throw await readApiError(response, genericError);
  return response;
}
