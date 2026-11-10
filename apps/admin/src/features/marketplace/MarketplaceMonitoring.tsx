import { useEffect, useState } from "react";
import { LoaderCircle, Store } from "lucide-react";
import type { Locale } from "../../app/translations";
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
  const ru = locale === "ru";
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
      ru ? "Сессия истекла. Войдите снова." : "Session expired. Sign in again.",
      ru ? "Не удалось загрузить объявления." : "Could not load listings.")
      .then(async (response) => {
        const page = await response.json() as { items: AdminListing[] };
        if (active) setListings(page.items);
      })
      .catch((reason: Error) => { if (active) setError(reason.message); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [accessToken, onSessionExpired, revision, ru]);

  async function changeStatus(listing: AdminListing, status: "PUBLISHED" | "SUSPENDED" | "REJECTED") {
    setPendingId(listing.id);
    setError("");
    try {
      await authorizedAdminFetch(`/api/v1/admin/marketplace/listings/${listing.id}/status`, accessToken,
        (token) => { if (!token) onSessionExpired(); },
        ru ? "Сессия истекла. Войдите снова." : "Session expired. Sign in again.",
        ru ? "Не удалось изменить объявление." : "Could not update listing.",
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status }),
        });
      setRevision((value) => value + 1);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : (ru ? "Ошибка действия." : "Action failed."));
    } finally { setPendingId(""); }
  }

  return (
    <section id="marketplace-monitoring" className="admin-content users-content marketplace-monitoring">
      <div className="admin-kicker"><Store size={15} aria-hidden="true" />{ru ? "Маркетплейс" : "Marketplace"}</div>
      <h1>{ru ? "Объявления продавцов" : "Seller listings"}</h1>
      <p className="admin-intro">{ru ? "Просмотр и модерация опубликованных и ожидающих объявлений." : "Monitor seller listings and suspend or restore catalog visibility."}</p>
      {error && <p className="error-message" role="alert">{error}</p>}
      <div className="users-panel">
        {loading ? <div className="table-state"><LoaderCircle size={20} className="spin" />{ru ? "Загрузка…" : "Loading…"}</div>
          : listings.length === 0 ? <div className="table-state">{ru ? "Объявлений пока нет." : "No listings yet."}</div>
            : <div className="table-scroll"><table>
              <thead><tr><th>{ru ? "Презентация" : "Presentation"}</th><th>{ru ? "Продавец" : "Seller"}</th><th>{ru ? "Категория" : "Category"}</th><th>{ru ? "Цена" : "Price"}</th><th>{ru ? "Статус" : "Status"}</th><th>{ru ? "Действие" : "Action"}</th></tr></thead>
              <tbody>{listings.map((listing) => <tr key={listing.id}>
                <td><strong>{listing.title}</strong><small>{listing.description}</small></td>
                <td><strong>{listing.sellerName}</strong><small>{listing.sellerEmail}</small></td>
                <td>{listing.category}</td>
                <td>{(listing.priceTiyin / 100).toLocaleString(ru ? "ru-RU" : "en-US")} {listing.currency}</td>
                <td><span className={`status-badge status-${listing.status.toLowerCase()}`}>{listing.status}</span></td>
                <td className="listing-actions">
                  {listing.status !== "ARCHIVED" && listing.status !== "SUSPENDED" && <button className="danger-button" type="button" disabled={pendingId === listing.id}
                    onClick={() => void changeStatus(listing, "SUSPENDED")}>{ru ? "Приостановить" : "Suspend"}</button>}
                  {listing.status !== "ARCHIVED" && listing.status !== "PUBLISHED" && <button className="secondary-button" type="button" disabled={pendingId === listing.id}
                    onClick={() => void changeStatus(listing, "PUBLISHED")}>{ru ? "Опубликовать" : "Publish"}</button>}
                  {pendingId === listing.id && <LoaderCircle size={15} className="spin" />}
                </td>
              </tr>)}</tbody>
            </table></div>}
      </div>
    </section>
  );
}
