import { useEffect, useState } from "react";
import { AdminShell } from "./AdminShell";
import { useAdminSession } from "../features/auth/useAdminSession";
import { SignIn } from "../features/auth/SignIn";
import { AdminInvitationCompletion } from "../features/auth/AdminInvitationCompletion";
import { AdminInvitationRequest } from "../features/auth/AdminInvitationRequest";
import { UserManagement } from "../features/users/UserManagement";
import { MarketplaceMonitoring } from "../features/marketplace/MarketplaceMonitoring";
import { MarketplaceCategories } from "../features/marketplace/MarketplaceCategories";
import { translations, type Locale } from "./translations";
import { Layers3 } from "lucide-react";

type AdminPage = "users" | "marketplace" | "categories";

function pageFromHash(hash: string): AdminPage {
  if (hash === "#marketplace-monitoring") return "marketplace";
  if (hash === "#marketplace-categories") return "categories";
  return "users";
}

export default function AdminApp() {
  const [locale, setLocale] = useState<Locale>("en");
  const [activePage, setActivePage] = useState<AdminPage>(() => pageFromHash(window.location.hash));
  const [invitationToken, setInvitationToken] = useState(
    () => new URLSearchParams(window.location.search).get("admin-invite"),
  );
  const [registering, setRegistering] = useState(false);
  const session = useAdminSession(translations[locale]);
  const t = translations[locale];
  const visiblePage = activePage === "categories" && !session.isSuperAdmin ? "users" : activePage;

  useEffect(() => {
    const handleHashChange = () => setActivePage(pageFromHash(window.location.hash));
    window.addEventListener("hashchange", handleHashChange);
    return () => window.removeEventListener("hashchange", handleHashChange);
  }, []);

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
      superadmin={session.isSuperAdmin}
      activePage={visiblePage}
      onSignOut={() => void session.signOut()}
      onToggleLocale={() => setLocale((current) => current === "en" ? "ru" : current === "ru" ? "uz" : "en")}
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
        <section className="admin-content auth-loading-page" role="status" aria-live="polite">
          <span className="admin-loading-mark"><Layers3 size={24} strokeWidth={2.2} aria-hidden="true" /></span>
          <span className="admin-loading-brand">slideforge<span className="brand-divider">/</span>admin</span>
          <span className="admin-loading-spinner" aria-hidden="true" />
          <strong>{t.sessionChecking}</strong>
          <span className="admin-loading-caption">{t.console}</span>
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
        <>
          {visiblePage === "users" && (
            <UserManagement
              accessToken={session.accessToken}
              translations={t}
              locale={locale}
              onSessionExpired={session.clearSession}
            />
          )}
          {visiblePage === "marketplace" && (
            <MarketplaceMonitoring
              accessToken={session.accessToken}
              locale={locale}
              onSessionExpired={session.clearSession}
            />
          )}
          {visiblePage === "categories" && (
            <MarketplaceCategories
              accessToken={session.accessToken}
              locale={locale}
              onSessionExpired={session.clearSession}
            />
          )}
        </>
      )}
    </AdminShell>
  );
}
