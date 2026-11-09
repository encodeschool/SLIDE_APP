import { useState, type FormEvent } from "react";
import { LoaderCircle, LockKeyhole } from "lucide-react";
import type { Translations } from "../../app/translations";

interface SignInProps {
  translations: Translations;
  loading: boolean;
  error: string;
  onSubmit: (event: FormEvent<HTMLFormElement>, email: string, password: string) => Promise<boolean>;
  onRegister: () => void;
}

export function SignIn({ translations: t, loading, error, onSubmit, onRegister }: SignInProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  function submit(event: FormEvent<HTMLFormElement>) {
    void onSubmit(event, email, password).then((success) => {
      if (success) setPassword("");
    });
  }

  return (
    <section className="admin-content">
      <div className="admin-kicker"><LockKeyhole size={15} aria-hidden="true" />{t.console}</div>
      <h1>{t.signIn}</h1>
      <p className="admin-intro">{t.signInCopy}</p>
      <form className="login-card" onSubmit={submit}>
        <label>{t.email}<input type="email" autoComplete="username" required value={email} onChange={(event) => setEmail(event.target.value)} /></label>
        <label>{t.password}<input type="password" autoComplete="current-password" required value={password} onChange={(event) => setPassword(event.target.value)} /></label>
        {error && <p className="error-message" role="alert">{error}</p>}
        <button className="primary-button" type="submit" disabled={loading}>
          {loading ? <><LoaderCircle size={16} className="spin" />{t.signingIn}</> : <><LockKeyhole size={16} />{t.signInButton}</>}
        </button>
      </form>
      <div className="admin-register-prompt">
        <p>{t.registerAdminCopy}</p>
        <button className="secondary-button" type="button" onClick={onRegister}>{t.registerAdmin}</button>
      </div>
    </section>
  );
}
