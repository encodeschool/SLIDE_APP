import type { Locale } from "../../app/translations";

export type UserStatus = "ACTIVE" | "BLOCKED" | "DELETED";

export interface AdminUser {
  id: string;
  email: string;
  displayName: string;
  locale: Locale;
  emailVerified: boolean;
  status: UserStatus;
  roles: string[];
  createdAt: string;
  updatedAt: string;
}

export interface UserPage {
  items: AdminUser[];
  page: number;
  size: number;
  total: number;
}
