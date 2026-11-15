import { useEffect, useState, type FormEvent } from "react";
import { LoaderCircle, Tags } from "lucide-react";
import { marketplaceCategoryTranslations, type Locale } from "../../i18n";
import { authorizedAdminFetch } from "../auth/authApi";

type Category = {
  slug: string;
  nameEn: string;
  nameRu: string;
  nameUz: string;
  active: boolean;
};

interface Props {
  accessToken: string;
  locale: Locale;
  onSessionExpired: () => void;
}

export function MarketplaceCategories({ accessToken, locale, onSessionExpired }: Props) {
  const t = marketplaceCategoryTranslations[locale];
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [revision, setRevision] = useState(0);
  const [slug, setSlug] = useState("");
  const [nameEn, setNameEn] = useState("");
  const [nameRu, setNameRu] = useState("");
  const [nameUz, setNameUz] = useState("");

  useEffect(() => {
    let active = true;
    setLoading(true);
    authorizedAdminFetch(
      "/api/v1/admin/marketplace/categories",
      accessToken,
      (token) => { if (!token) onSessionExpired(); },
      t.sessionExpired,
      t.error,
    )
      .then(async (response) => {
        const result = await response.json() as Category[];
        if (active) setCategories(result);
      })
      .catch((reason: Error) => { if (active) setError(reason.message); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [accessToken, onSessionExpired, revision, t.error]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      await authorizedAdminFetch(
        "/api/v1/admin/marketplace/categories",
        accessToken,
        (token) => { if (!token) onSessionExpired(); },
        t.sessionExpired,
        t.error,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            slug: slug.trim().toLowerCase(),
            nameEn: nameEn.trim(),
            nameRu: nameRu.trim(),
            nameUz: nameUz.trim(),
          }),
        },
      );
      setSlug("");
      setNameEn("");
      setNameRu("");
      setNameUz("");
      setRevision((value) => value + 1);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : t.error);
    } finally { setBusy(false); }
  }

  async function toggle(category: Category) {
    setBusy(true);
    setError("");
    try {
      await authorizedAdminFetch(
        `/api/v1/admin/marketplace/categories/${encodeURIComponent(category.slug)}/status`,
        accessToken,
        (token) => { if (!token) onSessionExpired(); },
        t.sessionExpired,
        t.error,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ active: !category.active }),
        },
      );
      setRevision((value) => value + 1);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : t.error);
    } finally { setBusy(false); }
  }

  return (
    <section id="marketplace-categories" className="admin-content users-content marketplace-monitoring">
      <div className="admin-kicker"><Tags size={15} aria-hidden="true" />{t.title}</div>
      <h1>{t.title}</h1>
      <p className="admin-intro">{t.intro}</p>
      {error && <p className="error-message" role="alert">{error}</p>}
      <form className="category-form" onSubmit={(event) => void submit(event)}>
        <label><span>{t.slug}</span><input required maxLength={40} pattern="[a-z0-9]+(?:-[a-z0-9]+)*" value={slug} onChange={(event) => setSlug(event.target.value)} /></label>
        <label><span>{t.nameEn}</span><input required maxLength={80} value={nameEn} onChange={(event) => setNameEn(event.target.value)} /></label>
        <label><span>{t.nameRu}</span><input required maxLength={80} value={nameRu} onChange={(event) => setNameRu(event.target.value)} /></label>
        <label><span>{t.nameUz}</span><input required maxLength={80} value={nameUz} onChange={(event) => setNameUz(event.target.value)} /></label>
        <button className="primary-button" type="submit" disabled={busy}>
          {busy && <LoaderCircle size={15} className="spin" />}{busy ? t.adding : t.add}
        </button>
      </form>
      <div className="users-panel">
        {loading ? <div className="table-state"><LoaderCircle size={20} className="spin" />{t.adding}</div>
          : categories.length === 0 ? <div className="table-state">{t.empty}</div>
            : <div className="table-scroll"><table>
              <thead><tr><th>{t.slug}</th><th>{t.nameEn}</th><th>{t.nameRu}</th><th>{t.nameUz}</th><th>{t.status}</th><th>{t.action}</th></tr></thead>
              <tbody>{categories.map((category) => <tr key={category.slug}>
                <td data-label={t.slug}>{category.slug}</td><td data-label={t.nameEn}>{category.nameEn}</td>
                <td data-label={t.nameRu}>{category.nameRu}</td><td data-label={t.nameUz}>{category.nameUz}</td>
                <td data-label={t.status}>{category.active ? t.active : t.inactive}</td>
                <td data-label={t.action}><button className={category.active ? "danger-button" : "secondary-button"} type="button" disabled={busy} onClick={() => void toggle(category)}>{category.active ? t.deactivate : t.activate}</button></td>
              </tr>)}</tbody>
            </table></div>}
      </div>
    </section>
  );
}
