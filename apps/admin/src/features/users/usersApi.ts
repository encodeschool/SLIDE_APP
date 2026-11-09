import { authorizedAdminFetch } from "../auth/authApi";
import type { Locale, Translations } from "../../app/translations";
import type { AdminUser, UserPage, UserStatus } from "./types";

export async function listUsers(
  token: string,
  page: number,
  size: number,
  search: string,
  status: UserStatus | "",
  onAccessToken: (token: string | null) => void,
  t: Translations,
): Promise<UserPage> {
  const params = new URLSearchParams({ page: String(page), size: String(size) });
  if (search.trim()) params.set("search", search.trim());
  if (status) params.set("status", status);
  const response = await authorizedAdminFetch(
    `/api/v1/admin/users?${params}`,
    token,
    onAccessToken,
    t.refreshUnavailable,
    t.genericError,
  );
  return response.json() as Promise<UserPage>;
}

export async function updateUserStatus(
  user: AdminUser,
  token: string,
  onAccessToken: (token: string | null) => void,
  t: Translations,
): Promise<void> {
  const action = user.status === "ACTIVE" ? "disable" : "enable";
  await authorizedAdminFetch(
    `/api/v1/admin/users/${user.id}/${action}`,
    token,
    onAccessToken,
    t.refreshUnavailable,
    t.genericError,
  ).then(() => undefined);
}

export async function inviteAdmin(
  email: string,
  displayName: string,
  locale: Locale,
  token: string,
  onAccessToken: (token: string | null) => void,
  t: Translations,
): Promise<void> {
  await authorizedAdminFetch(
    "/api/v1/admin/users/invitations",
    token,
    onAccessToken,
    t.refreshUnavailable,
    t.genericError,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, displayName, locale }),
    },
  );
}
