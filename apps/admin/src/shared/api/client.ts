const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:8080";

export function apiFetch(path: string, init?: RequestInit): Promise<Response> {
  return fetch(`${API_URL}${path}`, {
    ...init,
    credentials: "include",
  });
}

export async function readApiError(response: Response, fallback: string): Promise<Error> {
  try {
    const body = await response.json() as { detail?: string; code?: string };
    const error = new Error(body.detail || fallback);
    error.name = body.code || String(response.status);
    return error;
  } catch {
    return new Error(fallback);
  }
}
