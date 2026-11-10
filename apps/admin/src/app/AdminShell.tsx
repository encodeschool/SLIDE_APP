import { Globe2, Layers3, LogOut, ShieldCheck, Store, UsersRound } from "lucide-react";
import type { Locale, Translations } from "./translations";

interface AdminShellProps {
  locale: Locale;
  translations: Translations;
  authenticated: boolean;
  superadmin: boolean;
  onSignOut: () => void;
  onToggleLocale: () => void;
  children: React.ReactNode;
}

export function AdminShell({
  locale,
  translations: t,
  authenticated,
  superadmin,
  onSignOut,
  onToggleLocale,
  children,
}: AdminShellProps) {
  return (
    <div className="admin-shell">
      <aside className="admin-sidebar">
        <a className="admin-brand" href="#admin-home" aria-label="Slideforge admin home">
          <span className="admin-brand-mark"><Layers3 size={20} strokeWidth={2.2} /></span>
          <span>slideforge<span className="brand-divider">/</span>admin</span>
        </a>
        <div className="console-label">{t.console}</div>
        <nav className="admin-nav" aria-label={t.console}>
          <a className="admin-nav-item active" href="#admin-users"><UsersRound size={17} aria-hidden="true" /><span>{t.users}</span></a>
          <a className="admin-nav-item" href="#marketplace-monitoring"><Store size={17} aria-hidden="true" /><span>{t.marketplace}</span></a>
          {superadmin && <a className="admin-nav-item" href="#marketplace-categories"><Store size={17} aria-hidden="true" /><span>{t.categories}</span></a>}
        </nav>
        <div className="admin-sidebar-bottom"><ShieldCheck size={15} aria-hidden="true" /><span>{t.staffOnly}</span></div>
      </aside>

      <main id="admin-home" className="admin-main">
        <header className="admin-topbar">
          <span>{t.console}</span>
          <div className="topbar-actions">
            {authenticated && <button className="text-button" type="button" onClick={onSignOut}><LogOut size={15} />{t.signOut}</button>}
            <button className="admin-language" type="button"
              title={locale === "uz" ? "Tilni almashtirish" : locale === "en" ? "Switch language" : "Сменить язык"}
              aria-label={locale === "uz" ? "Tilni almashtirish" : locale === "en" ? "Switch language" : "Сменить язык"}
              onClick={onToggleLocale}>
              <Globe2 size={16} aria-hidden="true" />{locale.toUpperCase()}
            </button>
          </div>
        </header>
        {children}
        <footer className="admin-footer"><span>Slideforge Admin</span><span>{t.staffOnly}</span></footer>
      </main>
    </div>
  );
}
