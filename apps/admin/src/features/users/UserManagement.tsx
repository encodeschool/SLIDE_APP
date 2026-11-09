import { useEffect, useState, type FormEvent } from "react";
import { ArrowLeft, ArrowRight, LoaderCircle, Search, ShieldCheck, UserRound } from "lucide-react";
import type { Locale, Translations } from "../../app/translations";
import { inviteAdmin, listUsers, updateUserStatus } from "./usersApi";
import type { AdminUser, UserStatus } from "./types";

interface UserManagementProps {
  accessToken: string;
  translations: Translations;
  locale: Locale;
  onSessionExpired: () => void;
}

const pageSize = 20;

export function UserManagement({ accessToken, translations: t, locale, onSessionExpired }: UserManagementProps) {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<UserStatus | "">("");
  const [page, setPage] = useState(0);
  const [total, setTotal] = useState(0);
  const [listLoading, setListLoading] = useState(false);
  const [listError, setListError] = useState("");
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [revision, setRevision] = useState(0);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteName, setInviteName] = useState("");
  const [inviteLoading, setInviteLoading] = useState(false);
  const [inviteError, setInviteError] = useState("");
  const [inviteSuccess, setInviteSuccess] = useState(false);

  useEffect(() => {
    let active = true;
    const timer = window.setTimeout(() => {
      setListLoading(true);
      setListError("");
      listUsers(accessToken, page, pageSize, search, status, onSessionExpired, t)
        .then((result) => {
          if (active) {
            setUsers(result.items);
            setTotal(result.total);
          }
        })
        .catch((error: Error) => {
          if (!active) return;
          if (error.name === "ACCESS_DENIED") setListError(t.forbidden);
          else setListError(error.message || t.loadError);
          if (error.name === "ACCOUNT_UNAVAILABLE" || error.name === "AUTH_REQUIRED") onSessionExpired();
        })
        .finally(() => {
          if (active) setListLoading(false);
        });
    }, search ? 250 : 0);
    return () => {
      active = false;
      window.clearTimeout(timer);
    };
  }, [accessToken, onSessionExpired, page, search, status, revision, t.forbidden, t.loadError, t.genericError, t.refreshUnavailable]);

  async function changeStatus(user: AdminUser) {
    setPendingId(user.id);
    setListError("");
    try {
      await updateUserStatus(user, accessToken, onSessionExpired, t);
      setRevision((value) => value + 1);
    } catch (error) {
      setListError(error instanceof Error ? error.message : t.actionError);
    } finally {
      setPendingId(null);
    }
  }

  async function submitInvitation(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setInviteLoading(true);
    setInviteError("");
    setInviteSuccess(false);
    try {
      await inviteAdmin(inviteEmail, inviteName, locale, accessToken, onSessionExpired, t);
      setInviteEmail("");
      setInviteName("");
      setInviteSuccess(true);
      setRevision((value) => value + 1);
    } catch (error) {
      setInviteError(error instanceof Error ? error.message : t.invitationFailed);
    } finally {
      setInviteLoading(false);
    }
  }

  const pageCount = Math.max(1, Math.ceil(total / pageSize));

  return (
    <section className="admin-content users-content">
      <div className="admin-kicker"><ShieldCheck size={15} aria-hidden="true" />{t.users}</div>
      <h1>{t.usersTitle}</h1>
      <p className="admin-intro">{t.usersIntro}</p>
      <form className="login-card admin-invitation-form" onSubmit={(event) => void submitInvitation(event)}>
        <h2>{t.inviteAdmin}</h2>
        <p>{t.inviteAdminCopy}</p>
        <label>{t.name}<input required maxLength={120} value={inviteName} onChange={(event) => setInviteName(event.target.value)} /></label>
        <label>{t.email}<input type="email" autoComplete="email" required maxLength={255} value={inviteEmail} onChange={(event) => setInviteEmail(event.target.value)} /></label>
        {inviteError && <p className="error-message" role="alert">{inviteError}</p>}
        {inviteSuccess && <p className="success-message" role="status">{t.invitationSent}</p>}
        <button className="primary-button" type="submit" disabled={inviteLoading}>
          {inviteLoading ? <><LoaderCircle size={16} className="spin" />{t.completingInvitation}</> : t.inviteAdmin}
        </button>
      </form>
      <div className="user-toolbar">
        <label className="search-field">
          <Search size={17} aria-hidden="true" />
          <input type="search" value={search} placeholder={t.search}
            onChange={(event) => { setSearch(event.target.value); setPage(0); }} />
        </label>
        <select aria-label={t.allStatuses} value={status}
          onChange={(event) => { setStatus(event.target.value as UserStatus | ""); setPage(0); }}>
          <option value="">{t.allStatuses}</option>
          <option value="ACTIVE">{t.active}</option>
          <option value="BLOCKED">{t.blocked}</option>
          <option value="DELETED">{t.deleted}</option>
        </select>
      </div>
      {listError && <p className="error-message list-error" role="alert">{listError}</p>}
      <div className="users-panel">
        {listLoading ? (
          <div className="table-state"><LoaderCircle size={20} className="spin" />{t.loading}</div>
        ) : users.length === 0 ? (
          <div className="table-state"><UserRound size={20} />{t.noUsers}</div>
        ) : (
          <div className="table-scroll">
            <table>
              <thead><tr><th>{t.name}</th><th>{t.account}</th><th>{t.roles}</th><th>{t.created}</th><th>{t.action}</th></tr></thead>
              <tbody>
                {users.map((user) => (
                  <tr key={user.id}>
                    <td><strong>{user.displayName}</strong><small>{user.emailVerified ? t.emailVerified : t.emailUnverified}</small></td>
                    <td><span className={`status-badge status-${user.status.toLowerCase()}`}>{t[user.status.toLowerCase() as "active" | "blocked" | "deleted"]}</span></td>
                    <td>{user.roles.join(", ")}</td>
                    <td>{new Date(user.createdAt).toLocaleDateString(locale === "ru" ? "ru-RU" : "en-US")}</td>
                    <td>
                      {user.status !== "DELETED" && (
                        <button className={user.status === "ACTIVE" ? "danger-button" : "secondary-button"}
                          type="button" disabled={pendingId === user.id}
                          onClick={() => void changeStatus(user)}>
                          {pendingId === user.id ? <LoaderCircle size={15} className="spin" />
                            : user.status === "ACTIVE" ? t.disable : t.enable}
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <div className="table-pagination">
          <span>{t.page} {page + 1} {t.of} {pageCount} · {total}</span>
          <div>
            <button className="pager-button" type="button" aria-label={t.previous} disabled={page === 0 || listLoading}
              onClick={() => setPage((current) => Math.max(0, current - 1))}><ArrowLeft size={15} />{t.previous}</button>
            <button className="pager-button" type="button" aria-label={t.next} disabled={page + 1 >= pageCount || listLoading}
              onClick={() => setPage((current) => current + 1)}>{t.next}<ArrowRight size={15} /></button>
          </div>
        </div>
      </div>
    </section>
  );
}
