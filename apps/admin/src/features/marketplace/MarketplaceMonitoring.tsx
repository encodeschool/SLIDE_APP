import { useEffect, useState } from "react";
import { LoaderCircle, Store } from "lucide-react";
import { marketplaceMonitoringTranslations, type Locale } from "../../i18n";
import { authorizedAdminFetch } from "../auth/authApi";

type AdminListing = {
  id: string;
  title: string;
  description: string;
  status: string;
  sellerName: string;
  sellerEmail: string;
  category: string;
  priceTiyin: number;
  currency: string;
  updatedAt: string;
};

interface Props {
  accessToken: string;
  locale: Locale;
  onSessionExpired: () => void;
}

export function MarketplaceMonitoring({ accessToken, locale, onSessionExpired }: Props) {
  const t = marketplaceMonitoringTranslations[locale];
  const [listings, setListings] = useState<AdminListing[]>([]);
  const [loading, setLoading] = useState(true);
  const [pendingId, setPendingId] = useState("");
  const [error, setError] = useState("");
  const [revision, setRevision] = useState(0);

  useEffect(() => {
    let active = true;
    setLoading(true);
    authorizedAdminFetch("/api/v1/admin/marketplace/listings?page=0&size=50", accessToken,
      (token) => { if (!token) onSessionExpired(); },
      t.sessionExpired,
      t.loadError)
      .then(async (response) => {
        const page = await response.json() as { items: AdminListing[] };
        if (active) setListings(page.items);
      })
      .catch((reason: Error) => { if (active) setError(reason.message); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [accessToken, onSessionExpired, revision, t.loadError, t.sessionExpired]);

  async function changeStatus(listing: AdminListing, status: "PUBLISHED" | "SUSPENDED" | "REJECTED") {
    setPendingId(listing.id);
    setError("");
    try {
      await authorizedAdminFetch(`/api/v1/admin/marketplace/listings/${listing.id}/status`, accessToken,
        (token) => { if (!token) onSessionExpired(); },
        t.sessionExpired,
        t.updateError,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status }),
        });
      setRevision((value) => value + 1);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : t.actionError);
    } finally { setPendingId(""); }
  }

  return (
    <section id="marketplace-monitoring" className="admin-content users-content marketplace-monitoring">
      <div className="admin-kicker"><Store size={15} aria-hidden="true" />{t.marketplace}</div>
      <h1>{t.title}</h1>
      <p className="admin-intro">{t.intro}</p>
      {error && <p className="error-message" role="alert">{error}</p>}
      <div className="users-panel">
        {loading ? <div className="table-state"><LoaderCircle size={20} className="spin" />{t.loading}</div>
          : listings.length === 0 ? <div className="table-state">{t.empty}</div>
            : <div className="table-scroll"><table>
              <thead><tr><th>{t.presentation}</th><th>{t.seller}</th><th>{t.category}</th><th>{t.price}</th><th>{t.status}</th><th>{t.action}</th></tr></thead>
              <tbody>{listings.map((listing) => <tr key={listing.id}>
                <td data-label={t.presentation}><strong>{listing.title}</strong><small>{listing.description}</small></td>
                <td data-label={t.seller}><strong>{listing.sellerName}</strong><small>{listing.sellerEmail}</small></td>
                <td data-label={t.category}>{listing.category}</td>
                <td data-label={t.price}>{(listing.priceTiyin / 100).toLocaleString(locale === "ru" ? "ru-RU" : locale === "uz" ? "uz-UZ" : "en-US")} {listing.currency}</td>
                <td data-label={t.status}><span className={`status-badge status-${listing.status.toLowerCase()}`}>{t[`${listing.status.toLowerCase()}Status` as keyof typeof t] ?? listing.status}</span></td>
                <td data-label={t.action} className="listing-actions">
                  {listing.status !== "ARCHIVED" && listing.status !== "SUSPENDED" && <button className="danger-button" type="button" disabled={pendingId === listing.id}
                    onClick={() => void changeStatus(listing, "SUSPENDED")}>{t.suspend}</button>}
                  {listing.status !== "ARCHIVED" && listing.status !== "PUBLISHED" && <button className="secondary-button" type="button" disabled={pendingId === listing.id}
                    onClick={() => void changeStatus(listing, "PUBLISHED")}>{t.publish}</button>}
                  {pendingId === listing.id && <LoaderCircle size={15} className="spin" />}
                </td>
              </tr>)}</tbody>
            </table></div>}
      </div>
    </section>
  );
}
