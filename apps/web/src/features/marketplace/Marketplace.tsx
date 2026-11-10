import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { ArrowLeft, ArrowRight, BookOpen, Check, LoaderCircle, ShoppingBag, Store } from "lucide-react";
import { API_URL, authorizedFetch } from "../../shared/api/client";
import type { AuthResponse, Locale, PresentationSummary } from "../../shared/types";
import { demoCatalogPage, demoCategories, demoProductDetails } from "./demoCatalog";
import type { Category, Product, ProductDetail } from "./marketplaceTypes";
type Listing = {
  id: string;
  title: string;
  description: string;
  status: string;
  currentVersion: number;
  priceTiyin: number;
};
type Order = { id: string; status: string; totalTiyin: number; currency: string };
type MarketplaceStage = "shop" | "cart" | "checkout" | "payment";

interface Props {
  locale: Locale;
  token: string | null;
  presentations: PresentationSummary[];
  onSession: (session: AuthResponse) => void;
  onExpired: () => void;
  onRequireAuth: () => void;
}

const categoryNames = {
  en: { shop: "Presentation marketplace", intro: "Discover and sell editable presentations.", category: "Category", all: "All categories", search: "Search presentations", add: "Add to cart", remove: "Remove", cart: "Cart", checkout: "Checkout", payment: "Payment", continue: "Continue", pay: "Pay for order", sandbox: "Sandbox payment", sandboxInfo: "Development-only sandbox; confirmation is disabled unless an operator enables it.", total: "Order total", signInToPay: "Sign in to continue to payment", secureNote: "Your account session is protected; payment details are handled by the payment provider.", emptyCart: "Your cart is empty.", empty: "No published presentations yet.", seller: "Seller", license: "License terms", details: "View details", back: "Back to marketplace", more: "Load 10 more", signIn: "Sign in to checkout", sell: "Sell a presentation", choose: "Choose a presentation", price: "Price (UZS)", description: "Listing description", terms: "License terms", publish: "Publish listing", myListings: "My listings", published: "Listing published", saved: "Preference saved", pending: "Order created but payment is pending. Sandbox confirmation is disabled; no purchase was completed.", complete: "Sandbox checkout complete", error: "Could not complete the request. Please try again.", noDecks: "Create a presentation before publishing.", demo: "Demo catalog — sample items only. Purchases are not available in demo mode.", demoPaid: "Demo only: no order or payment was created." },
  ru: { shop: "Маркетплейс презентаций", intro: "Покупайте и продавайте редактируемые презентации.", category: "Категория", all: "Все категории", search: "Поиск презентаций", add: "В корзину", remove: "Удалить", cart: "Корзина", checkout: "Оформление", payment: "Оплата", continue: "Продолжить", pay: "Оплатить заказ", sandbox: "Тестовая оплата", sandboxInfo: "Тестовый режим для разработки; подтверждение отключено, если оператор его не включил.", total: "Итого", signInToPay: "Войдите, чтобы перейти к оплате", secureNote: "Сессия защищена; платёжные данные обрабатываются платёжным провайдером.", emptyCart: "Корзина пока пуста.", empty: "Пока нет опубликованных презентаций.", seller: "Продавец", license: "Условия лицензии", details: "Подробнее", back: "Назад в маркетплейс", more: "Загрузить ещё 10", signIn: "Войдите для оформления", sell: "Продать презентацию", choose: "Выберите презентацию", price: "Цена (UZS)", description: "Описание объявления", terms: "Условия лицензии", publish: "Опубликовать", myListings: "Мои объявления", published: "Объявление опубликовано", saved: "Настройка сохранена", pending: "Заказ создан, оплата ожидает подтверждения. Тестовая оплата отключена; покупка не завершена.", complete: "Оплата в песочнице завершена", error: "Не удалось выполнить запрос. Попробуйте ещё раз.", noDecks: "Сначала создайте презентацию.", demo: "Демо-каталог — примеры. Покупки недоступны в демо-режиме.", demoPaid: "Демо: заказ и платёж не создавались." },
  uz: { shop: "Taqdimotlar marketpleysi", intro: "Tahrirlanadigan taqdimotlarni koʻring va soting.", category: "Turkum", all: "Barcha turkumlar", search: "Taqdimotlarni qidirish", add: "Savatga qoʻshish", remove: "Oʻchirish", cart: "Savat", checkout: "Buyurtmani rasmiylashtirish", payment: "Toʻlov", continue: "Davom etish", pay: "Buyurtma uchun toʻlash", sandbox: "Sinov toʻlovi", sandboxInfo: "Ishlab chiqish uchun sinov rejimi; operator yoqmaguncha tasdiqlash ishlamaydi.", total: "Jami", signInToPay: "Toʻlov uchun tizimga kiring", secureNote: "Hisob sessiyangiz himoyalangan; toʻlov maʼlumotlarini provayder qayta ishlaydi.", emptyCart: "Savatingiz boʻsh.", empty: "Hozircha chop etilgan taqdimotlar yoʻq.", seller: "Sotuvchi", license: "Litsenziya shartlari", details: "Batafsil", back: "Marketpleysga qaytish", more: "Yana 10 tasini yuklash", signIn: "Xarid uchun tizimga kiring", sell: "Taqdimot sotish", choose: "Taqdimotni tanlang", price: "Narxi (UZS)", description: "Eʼlon tavsifi", terms: "Litsenziya shartlari", publish: "Eʼlon qilish", myListings: "Eʼlonlarim", published: "Eʼlon chop etildi", saved: "Sozlama saqlandi", pending: "Buyurtma yaratildi, lekin toʻlov tasdiqlanmadi. Sinov toʻlovi oʻchiq; xarid yakunlanmadi.", complete: "Sinov toʻlovi yakunlandi", error: "Soʻrovni bajarib boʻlmadi. Qayta urinib koʻring.", noDecks: "Avval taqdimot yarating.", demo: "Namoyish katalogi — namunaviy mahsulotlar. Xaridlar mavjud emas.", demoPaid: "Namoyish: buyurtma va toʻlov yaratilmagan." },
};

const demoMode = import.meta.env.VITE_MARKETPLACE_DEMO === "true";

function formatPrice(priceTiyin: number, currency: string, locale: Locale) {
  const numberLocale = locale === "ru" ? "ru-RU" : locale === "uz" ? "uz-UZ" : "en-US";
  return `${(priceTiyin / 100).toLocaleString(numberLocale)} ${currency}`;
}

export function Marketplace({ locale, token, presentations, onSession, onExpired, onRequireAuth }: Props) {
  const t = categoryNames[locale];
  const [categories, setCategories] = useState<Category[]>([]);
  const [category, setCategory] = useState("");
  const [items, setItems] = useState<Product[]>([]);
  const [page, setPage] = useState(0);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState("");
  const [detail, setDetail] = useState<ProductDetail | null>(null);
  const [cart, setCart] = useState<Product[]>([]);
  const [stage, setStage] = useState<MarketplaceStage>("shop");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const [sellerListings, setSellerListings] = useState<Listing[]>([]);
  const [selectedPresentation, setSelectedPresentation] = useState("");
  const [listingDescription, setListingDescription] = useState("");
  const [licenseTerms, setLicenseTerms] = useState("");
  const [price, setPrice] = useState("10000");
  const [listingCategory, setListingCategory] = useState("other");
  const [search, setSearch] = useState("");
  const checkoutKeys = useRef(new Map<string, string>());
  const translatedCategory = (slug: string) => {
    const category = categories.find((item) => item.slug === slug);
    if (locale === "ru") return category?.nameRu ?? ({ business: "Бизнес", education: "Образование", marketing: "Маркетинг", technology: "Технологии", other: "Другое" }[slug] ?? category?.name ?? slug);
    if (locale === "uz") return category?.nameUz ?? ({ business: "Biznes", education: "Ta’lim", marketing: "Marketing", technology: "Texnologiya", other: "Boshqa" }[slug] ?? category?.name ?? slug);
    return category?.name ?? slug;
  };

  useEffect(() => {
    let active = true;
    if (demoMode) {
      setCategories(demoCategories);
      return () => { active = false; };
    }
    fetch(`${API_URL}/api/v1/catalog/categories`)
      .then((r) => r.ok ? r.json() as Promise<Category[]> : [])
      .then((result) => { if (active) setCategories(result); })
      .catch(() => {});
    if (token) {
      authorizedFetch("/api/v1/catalog/preferences", token, {}, onSession, onExpired)
        .then(async (r) => {
          if (!r.ok) return;
          const preference = await r.json() as { preferredCategory: string | null };
          if (active && preference.preferredCategory) setCategory(preference.preferredCategory);
        }).catch(() => {});
    }
    return () => { active = false; };
  }, [token]);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError("");
    if (demoMode) {
      const result = demoCatalogPage(0, 10, category);
      setItems(result.items);
      setTotal(result.total);
      setPage(0);
      setLoading(false);
      return () => { active = false; };
    }
    const query = new URLSearchParams({ page: "0", size: "10" });
    if (category) query.set("category", category);
    fetch(`${API_URL}/api/v1/catalog?${query}`)
      .then(async (r) => {
        if (!r.ok) throw new Error(t.error);
        return r.json() as Promise<{ items: Product[]; page: number; total: number }>;
      })
      .then((result) => {
        if (!active) return;
        setItems(result.items);
        setTotal(result.total);
        setPage(0);
      })
      .catch(() => { if (active) setError(t.error); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [category]);

  useEffect(() => {
    if (!token) return;
    authorizedFetch("/api/v1/seller/listings", token, {}, onSession, onExpired)
      .then(async (r) => { if (r.ok) setSellerListings(await r.json() as Listing[]); })
      .catch(() => {});
  }, [token]);

  const visibleItems = useMemo(() => items.filter((item) =>
    `${item.title} ${item.description} ${item.sellerName}`.toLocaleLowerCase().includes(search.toLocaleLowerCase())), [items, search]);

  async function loadMore() {
    if (demoMode) {
      const result = demoCatalogPage(page + 1, 10, category);
      setItems((current) => [...current, ...result.items]);
      setPage(result.page);
      setTotal(result.total);
      return;
    }
    setLoadingMore(true);
    try {
      const query = new URLSearchParams({ page: String(page + 1), size: "10" });
      if (category) query.set("category", category);
      const response = await fetch(`${API_URL}/api/v1/catalog?${query}`);
      if (!response.ok) throw new Error();
      const result = await response.json() as { items: Product[]; page: number; total: number };
      setItems((current) => [...current, ...result.items]);
      setPage(result.page);
      setTotal(result.total);
    } catch { setError(t.error); } finally { setLoadingMore(false); }
  }

  async function showDetail(item: Product) {
    if (demoMode) {
      const result = demoProductDetails.get(item.listingId);
      if (result) setDetail(result);
      return;
    }
    try {
      const response = await fetch(`${API_URL}/api/v1/catalog/${item.listingId}`);
      if (!response.ok) throw new Error();
      setDetail(await response.json() as ProductDetail);
    } catch { setError(t.error); }
  }

  async function checkout() {
    if (!token) { onRequireAuth(); return; }
    if (!cart.length) return;
    if (demoMode) {
      setNotice(t.demoPaid);
      return;
    }
    setBusy(true);
    setNotice("");
    try {
      for (const product of cart) {
        if (!checkoutKeys.current.has(product.listingId)) {
          checkoutKeys.current.set(product.listingId, crypto.randomUUID());
        }
      }
      let confirmed = 0;
      for (const product of cart) {
        const key = checkoutKeys.current.get(product.listingId)!;
        const orderResponse = await authorizedFetch("/api/v1/orders", token, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ listingId: product.listingId, idempotencyKey: key }),
        }, onSession, onExpired);
        if (!orderResponse.ok) throw new Error();
        const order = await orderResponse.json() as Order;
        const paymentResponse = await authorizedFetch(`/api/v1/orders/${order.id}/sandbox-confirm`, token, { method: "POST" }, onSession, onExpired);
        if (!paymentResponse.ok) {
          setNotice(t.pending);
          return;
        }
        checkoutKeys.current.delete(product.listingId);
        confirmed++;
      }
      setNotice(confirmed ? t.complete : t.pending);
      if (confirmed) {
        setCart((current) => current.filter((item) => checkoutKeys.current.has(item.listingId)));
        setStage("shop");
      }
    } catch {
      setError(t.error);
    } finally { setBusy(false); }
  }

  async function publishListing(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!token) { onRequireAuth(); return; }
    if (!selectedPresentation) return;
    setBusy(true);
    setError("");
    try {
      const draftResponse = await authorizedFetch("/api/v1/seller/listings", token, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          presentationId: selectedPresentation,
          presentationVersion: presentations.find((p) => p.id === selectedPresentation)?.currentVersion,
          priceTiyin: Math.round(Number(price) * 100),
          description: listingDescription,
          licenseTerms,
          category: listingCategory,
        }),
      }, onSession, onExpired);
      if (!draftResponse.ok) throw new Error();
      const draft = await draftResponse.json() as Listing;
      const publishResponse = await authorizedFetch(`/api/v1/seller/listings/${draft.id}/publish`, token, { method: "POST" }, onSession, onExpired);
      if (!publishResponse.ok) throw new Error();
      setNotice(t.published);
      const listing = await publishResponse.json() as Listing;
      setSellerListings((current) => [listing, ...current]);
    } catch { setError(t.error); } finally { setBusy(false); }
  }

  async function changeCategory(value: string) {
    setCategory(value);
    if (!token) return;
    const response = await authorizedFetch("/api/v1/catalog/preferences", token, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ preferredCategory: value || null }),
    }, onSession, onExpired);
    if (response.ok) setNotice(t.saved);
  }

  const cartTotal = cart.reduce((sum, item) => sum + item.priceTiyin, 0);

  if (detail) return (
    <section className="marketplace-page">
      <button className="text-button" type="button" onClick={() => setDetail(null)}><ArrowLeft size={16} />{t.back}</button>
      <div className="market-detail">
        <div className="market-card-art"><BookOpen size={42} /></div>
        <div>
          <span className="market-category">{translatedCategory(detail.category)}</span>
          <h1>{detail.title}</h1>
          <p>{detail.description}</p>
          <p><strong>{t.seller}:</strong> {detail.sellerName}</p>
          <p><strong>{t.license}:</strong> {detail.licenseTerms}</p>
          <strong className="market-price">{formatPrice(detail.priceTiyin, detail.currency, locale)}</strong>
          <button className="primary-button" type="button" onClick={() => { setCart((c) => c.some((p) => p.listingId === detail.listingId) ? c : [...c, detail]); setDetail(null); setStage("cart"); }}>{t.add}</button>
        </div>
      </div>
    </section>
  );

  if (stage === "cart" || stage === "checkout" || stage === "payment") return (
    <section className="marketplace-page" aria-labelledby="marketplace-title">
      <button className="text-button" type="button" onClick={() => setStage("shop")}><ArrowLeft size={16} />{t.back}</button>
      <div className="market-checkout-page">
        <div className="market-checkout-heading">
          <span className="eyebrow"><ShoppingBag size={14} />{t.cart}</span>
          <h1 id="marketplace-title">{stage === "cart" ? t.cart : stage === "checkout" ? t.checkout : t.payment}</h1>
        </div>
        <div className="market-checkout-steps" aria-label={`${t.cart} · ${t.checkout} · ${t.payment}`}>
          {(["cart", "checkout", "payment"] as const).map((step, index) => (
            <div className={stage === step ? "market-step market-step-active" : "market-step"} key={step}>
              <span>{index + 1}</span>{t[step]}
            </div>
          ))}
        </div>
        {cart.length === 0 ? <p className="empty-state">{t.emptyCart}</p> : (
          <>
            <div className="market-cart-lines">
              {cart.map((item) => (
                <article className="market-cart-line" key={item.listingId}>
                  <div className="market-cart-art"><BookOpen size={22} /></div>
                  <div><strong>{item.title}</strong><small>{t.seller}: {item.sellerName}</small></div>
                  <strong>{formatPrice(item.priceTiyin, item.currency, locale)}</strong>
                  {stage === "cart" && <button className="text-button" type="button" onClick={() => setCart((current) => current.filter((entry) => entry.listingId !== item.listingId))}>{t.remove}</button>}
                </article>
              ))}
            </div>
            <div className="market-order-total"><span>{t.total}</span><strong>{formatPrice(cartTotal, cart[0]?.currency ?? "UZS", locale)}</strong></div>
            {stage === "cart" && <button className="primary-button" type="button" onClick={() => setStage("checkout")}>{t.continue}</button>}
            {stage === "checkout" && (
              <div className="market-checkout-panel">
                <h2>{t.checkout}</h2>
                <p>{t.secureNote}</p>
                <button className="primary-button" type="button" onClick={() => setStage("payment")}>{t.continue}</button>
              </div>
            )}
            {stage === "payment" && (
              <div className="market-checkout-panel">
                <h2>{t.payment}</h2>
                <label className="market-payment-option">
                  <input type="radio" name="payment-provider" checked readOnly />
                  <span><strong>{t.sandbox}</strong><small>{t.sandboxInfo}</small></span>
                </label>
                {notice && <p className="market-notice" role="status">{notice}</p>}
                {error && <p className="form-error" role="alert">{error}</p>}
                <button className="primary-button" disabled={busy} type="button" onClick={() => void checkout()}>
                  {busy ? <LoaderCircle className="spin-icon" size={15} /> : null}
                  {token ? t.pay : t.signInToPay}
                </button>
              </div>
            )}
            {stage !== "payment" && notice && <p className="market-notice" role="status">{notice}</p>}
          </>
        )}
      </div>
    </section>
  );

  return (
    <section className="marketplace-page" aria-labelledby="marketplace-title">
      <div className="marketplace-heading">
        <div><span className="eyebrow"><Store size={14} />{t.shop}</span><h1 id="marketplace-title">{t.shop}</h1><p>{t.intro}</p></div>
      </div>
      {demoMode && <p className="market-demo-banner" role="status">{t.demo}</p>}
      <div className="market-toolbar">
        <input aria-label={t.search} placeholder={t.search} value={search} onChange={(e) => setSearch(e.target.value)} />
        <label>{t.category}<select value={category} onChange={(e) => void changeCategory(e.target.value)}><option value="">{t.all}</option>{categories.map((c) => <option key={c.slug} value={c.slug}>{translatedCategory(c.slug)}</option>)}</select></label>
        <button className="cart-button" type="button" onClick={() => setStage("cart")}><ShoppingBag size={17} />{t.cart} ({cart.length})</button>
      </div>
      {notice && <p className="market-notice" role="status"><Check size={16} />{notice}</p>}
      {error && <p className="form-error" role="alert">{error}</p>}
      <div className="market-grid">
        {loading && Array.from({ length: 10 }, (_, i) => <div key={i} className="market-skeleton" aria-hidden="true"><div /><span /><span /></div>)}
        {!loading && visibleItems.map((item) => <article className="market-card" key={item.listingId}>
          <div className="market-card-art"><BookOpen size={30} /></div>
          <div className="market-card-copy"><span className="market-category">{translatedCategory(item.category)}</span><h2>{item.title}</h2><p>{item.description}</p><small>{t.seller}: {item.sellerName}</small><strong className="market-price">{formatPrice(item.priceTiyin, item.currency, locale)}</strong>
            <div className="market-card-actions"><button type="button" className="text-button" onClick={() => void showDetail(item)}>{t.details}<ArrowRight size={14} /></button><button type="button" className="primary-button" onClick={() => setCart((c) => c.some((p) => p.listingId === item.listingId) ? c : [...c, item])}>{t.add}</button></div>
          </div>
        </article>)}
      </div>
      {!loading && visibleItems.length === 0 && <p className="empty-state">{t.empty}</p>}
      {items.length < total && <button className="secondary-button market-more" disabled={loadingMore} type="button" onClick={() => void loadMore()}>{loadingMore && <LoaderCircle className="spin-icon" size={16} />}{t.more}</button>}
      <div className="seller-panel">
        <h2><Store size={19} />{t.sell}</h2>
        {token ? presentations.length ? <form className="seller-form" onSubmit={(event) => void publishListing(event)}>
          <label>{t.choose}<select required value={selectedPresentation} onChange={(e) => setSelectedPresentation(e.target.value)}><option value="">—</option>{presentations.map((p) => <option key={p.id} value={p.id}>{p.title} · v{p.currentVersion}</option>)}</select></label>
          <label>{t.category}<select value={listingCategory} onChange={(e) => setListingCategory(e.target.value)}>{categories.map((c) => <option key={c.slug} value={c.slug}>{translatedCategory(c.slug)}</option>)}</select></label>
          <label>{t.price}<input type="number" min="1" step="1" required value={price} onChange={(e) => setPrice(e.target.value)} /></label>
          <label>{t.description}<textarea required maxLength={20000} value={listingDescription} onChange={(e) => setListingDescription(e.target.value)} /></label>
          <label>{t.terms}<textarea required maxLength={20000} value={licenseTerms} onChange={(e) => setLicenseTerms(e.target.value)} /></label>
          <button className="primary-button" type="submit" disabled={busy}>{t.publish}</button>
        </form> : <p>{t.noDecks}</p> : <button className="secondary-button" type="button" onClick={onRequireAuth}>{t.signIn}</button>}
        {sellerListings.length > 0 && <div className="seller-listings"><h3>{t.myListings}</h3>{sellerListings.map((item) => <div key={item.id}><span>{item.title}</span><span>{item.status}</span></div>)}</div>}
      </div>
    </section>
  );
}
