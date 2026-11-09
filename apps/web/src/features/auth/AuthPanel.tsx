import type { FormEventHandler, SyntheticEvent } from "react";
import { LoaderCircle, UserRound } from "lucide-react";
import type { AuthMode } from "../../shared/types";

interface AuthPanelProps {
  authMode: AuthMode;
  copy: Record<string, string>;
  authSubmitting: boolean;
  authError: string;
  authNotice: string;
  email: string;
  password: string;
  displayName: string;
  setAuthMode: (mode: AuthMode) => void;
  setAuthError: (message: string) => void;
  setAuthNotice: (message: string) => void;
  setEmail: (email: string) => void;
  setPassword: (password: string) => void;
  setDisplayName: (name: string) => void;
  onSubmitAuth: FormEventHandler<HTMLFormElement>;
  onSubmitAuthAction: (event: SyntheticEvent, resendVerification?: boolean) => void;
  onSubmitPasswordReset: FormEventHandler<HTMLFormElement>;
}

export function AuthPanel({
  authMode,
  copy,
  authSubmitting,
  authError,
  authNotice,
  email,
  password,
  displayName,
  setAuthMode,
  setAuthError,
  setAuthNotice,
  setEmail,
  setPassword,
  setDisplayName,
  onSubmitAuth,
  onSubmitAuthAction,
  onSubmitPasswordReset,
}: AuthPanelProps) {
  return (
    <section className="auth-section" aria-labelledby="auth-title">
      <div className="auth-heading">
        <span className="auth-icon"><UserRound size={18} aria-hidden="true" /></span>
        <div>
          <h2 id="auth-title">
            {authMode === "login" ? copy.loginTitle
              : authMode === "register" ? copy.registerTitle
                : authMode === "forgot" ? copy.forgotTitle : copy.resetTitle}
          </h2>
          <p>{copy.workspace}</p>
        </div>
      </div>
      <form
        className="auth-form"
        onSubmit={authMode === "reset" ? onSubmitPasswordReset
          : authMode === "forgot" ? (event) => onSubmitAuthAction(event)
            : onSubmitAuth}
      >
        {authMode === "register" && (
          <label>
            <span>{copy.displayName}</span>
            <input autoComplete="name" maxLength={120} required value={displayName} onChange={(event) => setDisplayName(event.target.value)} />
          </label>
        )}
        {authMode !== "reset" && (
          <label>
            <span>{copy.email}</span>
            <input type="email" autoComplete="email" maxLength={255} required value={email} onChange={(event) => setEmail(event.target.value)} />
          </label>
        )}
        {(authMode === "login" || authMode === "register" || authMode === "reset") && (
          <label>
            <span>{authMode === "reset" ? copy.newPassword : copy.password}</span>
            <input
              type="password"
              autoComplete={authMode === "login" ? "current-password" : "new-password"}
              minLength={authMode === "login" ? 1 : 12}
              maxLength={72}
              required
              value={password}
              onChange={(event) => setPassword(event.target.value)}
            />
          </label>
        )}
        <div className="auth-actions">
          <button className="primary-button" type="submit" disabled={authSubmitting}>
            {authSubmitting ? <LoaderCircle className="spin-icon" size={16} aria-hidden="true" /> : <UserRound size={16} aria-hidden="true" />}
            {authMode === "login" ? copy.signIn
              : authMode === "register" ? copy.register
                : authMode === "forgot" ? copy.sendInstructions : copy.resetPassword}
          </button>
          {authMode === "login" && (
            <>
              <button className="text-button" type="button" onClick={() => { setAuthError(""); setAuthNotice(""); setAuthMode("register"); }}>
                {copy.register}
              </button>
              <button className="text-button" type="button" onClick={() => { setAuthError(""); setAuthNotice(""); setAuthMode("forgot"); }}>
                {copy.forgotPassword}
              </button>
              <button className="text-button" type="button" disabled={authSubmitting} onClick={(event) => {
                void onSubmitAuthAction(event, true);
              }}>
                {copy.resendVerification}
              </button>
            </>
          )}
          {authMode === "register" && (
            <button className="text-button" type="button" onClick={() => { setAuthError(""); setAuthNotice(""); setAuthMode("login"); }}>
              {copy.signIn}
            </button>
          )}
          {(authMode === "forgot" || authMode === "reset") && (
            <button className="text-button" type="button" onClick={() => { setAuthError(""); setAuthMode("login"); }}>
              {copy.signIn}
            </button>
          )}
        </div>
        {authNotice && <p className="form-success" role="status">{authNotice}</p>}
        {authError && <p className="form-error" role="alert">{authError}</p>}
      </form>
    </section>
  );
}
