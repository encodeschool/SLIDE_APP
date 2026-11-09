import { useState, type FormEvent } from "react";
import { LoaderCircle, Mail, ShieldCheck } from "lucide-react";
import type { Translations } from "../../app/translations";
import { requestAdminInvitation } from "./authApi";

interface AdminInvitationRequestProps {
  translations: Translations;
  onCancel: () => void;
}

export function AdminInvitationRequest({ translations: t, onCancel }: AdminInvitationRequestProps) {
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setLoading(true);
    try {
      await requestAdminInvitation(email, t.genericError);
      setSent(true);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : t.genericError);
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="admin-content">
      <div className="admin-kicker"><ShieldCheck size={15} aria-hidden="true" />{t.staffOnly}</div>
      <h1>{t.requestInvitationTitle}</h1>
      <p className="admin-intro">{sent ? t.requestInvitationSent : t.requestInvitationCopy}</p>
      {sent ? (
        <button className="secondary-button" type="button" onClick={onCancel}>{t.returnToSignIn}</button>
      ) : (
        <form className="login-card" onSubmit={(event) => void submit(event)}>
          <label>{t.email}<input type="email" autoComplete="email" required maxLength={255}
            value={email} onChange={(event) => setEmail(event.target.value)} /></label>
          {error && <p className="error-message" role="alert">{error}</p>}
          <button className="primary-button" type="submit" disabled={loading}>
            {loading ? <><LoaderCircle size={16} className="spin" />{t.sendingInvitationEmail}</> : <><Mail size={16} />{t.sendInvitationEmail}</>}
          </button>
          <button className="secondary-button" type="button" onClick={onCancel}>{t.returnToSignIn}</button>
        </form>
      )}
    </section>
  );
}
