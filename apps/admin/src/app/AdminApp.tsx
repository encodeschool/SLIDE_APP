import { useEffect, useState } from "react";
import { AdminShell } from "./AdminShell";
import { useAdminSession } from "../features/auth/useAdminSession";
import { SignIn } from "../features/auth/SignIn";
import { AdminInvitationCompletion } from "../features/auth/AdminInvitationCompletion";
import { AdminInvitationRequest } from "../features/auth/AdminInvitationRequest";
import { UserManagement } from "../features/users/UserManagement";
import { translations, type Locale } from "./translations";
import { LoaderCircle } from "lucide-react";

export default function AdminApp() {
  const [locale, setLocale] = useState<Locale>("en");
  const [invitationToken, setInvitationToken] = useState(
    () => new URLSearchParams(window.location.search).get("admin-invite"),
  );
  const [registering, setRegistering] = useState(false);
  const session = useAdminSession(translations[locale]);
  const t = translations[locale];

  useEffect(() => {
    if (!invitationToken) return;
    const url = new URL(window.location.href);
    url.searchParams.delete("admin-invite");
    window.history.replaceState({}, "", `${url.pathname}${url.search}${url.hash}`);
  }, [invitationToken]);

  return (
    <AdminShell
      locale={locale}
      translations={t}
      authenticated={Boolean(session.accessToken)}
      onSignOut={() => void session.signOut()}
      onToggleLocale={() => setLocale((current) => current === "en" ? "ru" : "en")}
    >
      {invitationToken ? (
        <AdminInvitationCompletion
          token={invitationToken}
          translations={t}
          onComplete={() => {
            window.history.replaceState({}, "", window.location.pathname);
            setInvitationToken(null);
          }}
        />
      ) : registering ? (
        <AdminInvitationRequest translations={t} onCancel={() => setRegistering(false)} />
      ) : session.loading ? (
        <section className="admin-content auth-loading" aria-live="polite">
          <LoaderCircle className="spin" size={22} />{t.sessionChecking}
        </section>
      ) : !session.accessToken ? (
        <SignIn
          translations={t}
          loading={session.loading}
          error={session.error}
          onSubmit={session.signIn}
          onRegister={() => setRegistering(true)}
        />
      ) : (
        <UserManagement
          accessToken={session.accessToken}
          translations={t}
          locale={locale}
          onSessionExpired={session.clearSession}
        />
      )}
    </AdminShell>
  );
}
