import type { Deck } from "../../../../packages/shared-types/src/index.ts";

export type Locale = "en" | "ru" | "uz";
export type AuthMode = "login" | "register" | "forgot" | "reset";

export interface UserProfile {
  id: string;
  email: string;
  displayName: string;
  locale: Locale;
  roles: string[];
}

export interface WalletPackage {
  code: string;
  amountTiyin: number;
  workUnits: number;
  costPerWorkTiyin: number;
}

export type WalletPaymentMethod =
  | "CLICK"
  | "PAYME"
  | "UZUM"
  | "VISA"
  | "MASTERCARD"
  | "HUMO"
  | "UZCARD";

export interface WalletResponse {
  balanceTiyin: number;
  workCredits: number;
  currency: string;
  sandboxEnabled: boolean;
  packages: WalletPackage[];
}

export interface WalletTransactionResponse {
  id: string;
  type: "TOP_UP" | "WORK" | "WORK_REFUND" | "MARKETPLACE_PURCHASE";
  status: "RESERVED" | "SETTLED" | "REFUNDED";
  amountTiyin: number;
  workUnits: number;
  packageCode: string | null;
  paymentMethod: WalletPaymentMethod | "SANDBOX" | null;
  referenceId: string | null;
  createdAt: string;
  sandbox: boolean;
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
