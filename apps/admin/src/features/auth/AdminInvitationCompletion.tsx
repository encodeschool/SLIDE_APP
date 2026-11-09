import { useState, type FormEvent } from "react";
import { LoaderCircle, ShieldCheck } from "lucide-react";
import type { Translations } from "../../app/translations";
import { completeAdminInvitation } from "./authApi";

interface AdminInvitationCompletionProps {
  token: string;
  translations: Translations;
  onComplete: () => void;
}

export function AdminInvitationCompletion({ token, translations: t, onComplete }: AdminInvitationCompletionProps) {
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [complete, setComplete] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    if (password !== confirmation) {
      setError(t.passwordMismatch);
      return;
    }
    setLoading(true);
    try {
      await completeAdminInvitation(token, password, t.genericError);
      setComplete(true);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : t.genericError);
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="admin-content">
      <div className="admin-kicker"><ShieldCheck size={15} aria-hidden="true" />{t.staffOnly}</div>
      <h1>{t.invitationTitle}</h1>
      <p className="admin-intro">{complete ? t.invitationComplete : t.invitationCopy}</p>
      {complete ? (
        <button className="primary-button" type="button" onClick={onComplete}>{t.returnToSignIn}</button>
      ) : (
        <form className="login-card" onSubmit={(event) => void submit(event)}>
          <label>{t.newPassword}<input type="password" autoComplete="new-password" minLength={12} maxLength={72}
            required value={password} onChange={(event) => setPassword(event.target.value)} /></label>
          <label>{t.confirmPassword}<input type="password" autoComplete="new-password" minLength={12} maxLength={72}
            required value={confirmation} onChange={(event) => setConfirmation(event.target.value)} /></label>
          {error && <p className="error-message" role="alert">{error}</p>}
          <button className="primary-button" type="submit" disabled={loading}>
            {loading ? <><LoaderCircle size={16} className="spin" />{t.completingInvitation}</> : t.completeInvitation}
          </button>
        </form>
      )}
    </section>
  );
}
