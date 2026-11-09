import type { Deck } from "../../../../packages/shared-types/src/index.ts";

export type Locale = "en" | "ru";
export type AuthMode = "login" | "register" | "forgot" | "reset";

export interface UserProfile {
  id: string;
  email: string;
  displayName: string;
  locale: Locale;
  roles: string[];
}

export interface AuthResponse {
  user: UserProfile;
  accessToken: string;
  expiresInSeconds: number;
}

export interface PresentationSummary {
  id: string;
  title: string;
  language: Locale;
  status: string;
  currentVersion: number;
  updatedAt: string;
}

export interface PresentationDetail extends PresentationSummary {
  createdAt: string;
  document: Deck;
}

export type ExportFormat = "pptx" | "pdf";
export type ExportJobStatus = "QUEUED" | "RUNNING" | "SUCCEEDED" | "FAILED";

export interface ExportJobResponse {
  id: string;
  presentationId: string;
  version: number;
  format: ExportFormat;
  status: ExportJobStatus;
  failureCode: string | null;
  downloadUrl: string | null;
}

export interface GenerationJobResponse {
  id: string;
  status: ExportJobStatus;
  language: Locale;
  slideCount: number;
  failureCode: string | null;
  failureMessage: string | null;
  document: Deck | null;
}
