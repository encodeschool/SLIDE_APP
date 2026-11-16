import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { ArrowDownWideNarrow, ArrowLeft, ArrowRight, BookOpen, Check, CircleDollarSign, CreditCard, Download, Filter, Layers3, LoaderCircle, LockKeyhole, Plus, RotateCcw, Search, ShieldCheck, ShoppingBag, SlidersHorizontal, Store, Tag, X } from "lucide-react";
import { API_URL, authorizedFetch } from "../../shared/api/client";
import type { AuthResponse, ExportFormat, ExportJobResponse, Locale, PresentationSummary } from "../../shared/types";
import { SlidePreviewCarousel } from "./SlidePreviewCarousel";
import { demoCatalogPage, demoCategories, demoProductDetails } from "./demoCatalog";
import type { Category, Product, ProductDetail, Purchase, PurchaseContent, PreviewSlide } from "./marketplaceTypes";
import { browseLabels, categoryNames, marketplaceCategoryFallbacks, publishDialogCopy, purchaseActionLabels } from "../../i18n/marketplace";
type Listing = {
  id: string;
  title: string;
  description: string;
  status: string;
  currentVersion: number;
  priceTiyin: number;
};
type Order = { id: string; status: string; totalTiyin: number; currency: string };
type MarketplaceStage = "shop" | "cart" | "checkout" | "payment" | "purchases";
type MarketplaceDetailTab = "overview" | "slides" | "license";
type SellerWorkType = "presentation" | "document" | "coursework" | "worksheet" | "design" | "other";

const maximumLocalFileSize = 25 * 1024 * 1024;

interface Props {
  locale: Locale;
  token: string | null;
  accountId: string | null;
  initialStage: "shop" | "purchases";
  walletBalanceTiyin: number | null;
  presentations: PresentationSummary[];
  onSession: (session: AuthResponse) => void;
  onExpired: () => void;
  onRequireAuth: () => void;
  onRequestTopUp: () => void;
  onRefreshWallet: () => Promise<void>;
  onRefreshPresentations: () => Promise<void>;
  cartInNavigation?: boolean;
  cartOpenRequest?: number;
  onCartOpenHandled?: () => void;
  onCartCountChange?: (count: number) => void;
}

const demoMode = import.meta.env.VITE_MARKETPLACE_DEMO === "true";
const MARKETPLACE_STORAGE_KEY = "slideforge.marketplace-state";
const LEGACY_MARKETPLACE_STORAGE_KEY = MARKETPLACE_STORAGE_KEY;
const MARKETPLACE_STORAGE_VERSION = 1;

type SavedMarketplaceState = {
  cart: Product[];
  stage: MarketplaceStage;
  category: string;
  search: string;
  sort: string;
  minPriceTiyin: number | null;
  maxPriceTiyin: number | null;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function restoreProduct(value: unknown): Product | null {
  if (!isRecord(value)) return null;
  const listingId = value.listingId;
  const listingVersionId = value.listingVersionId;
  const title = value.title;
  const sellerId = value.sellerId;
  const sellerName = value.sellerName;
  const priceTiyin = value.priceTiyin;
  const version = value.version;
  const currency = value.currency;
  const publishedAt = value.publishedAt;
  const category = value.category;
  const slideCount = value.slideCount;
  if (
    typeof listingId !== "string" || !listingId || listingId.length > 120 ||
    typeof listingVersionId !== "string" || !listingVersionId || listingVersionId.length > 120 ||
    typeof title !== "string" || !title || title.length > 300 ||
    typeof sellerId !== "string" || sellerId.length > 120 ||
    typeof sellerName !== "string" || sellerName.length > 200 ||
    typeof priceTiyin !== "number" || !Number.isSafeInteger(priceTiyin) || priceTiyin < 0 ||
    typeof version !== "number" || !Number.isSafeInteger(version) || version < 1 ||
    typeof currency !== "string" || !/^[A-Z]{3}$/.test(currency) ||
    typeof publishedAt !== "string" || publishedAt.length > 80 ||
    typeof category !== "string" || category.length > 100 ||
    (slideCount !== undefined &&
      (typeof slideCount !== "number" || !Number.isSafeInteger(slideCount) || slideCount < 1))
  ) return null;

  const description = typeof value.description === "string" ? value.description.slice(0, 4000) : "";
  const previewSlides = Array.isArray(value.previewSlides)
    ? value.previewSlides.slice(0, 2).flatMap((slide): PreviewSlide[] => {
      if (!isRecord(slide)) return [];
      if (
        typeof slide.slideNumber !== "number" ||
        typeof slide.title !== "string" ||
        !Array.isArray(slide.text) ||
        !slide.text.every((line) => typeof line === "string") ||
        typeof slide.backgroundColor !== "string" ||
        typeof slide.accentColor !== "string"
      ) return [];
      return [{
        slideNumber: slide.slideNumber,
        title: slide.title.slice(0, 300),
        text: slide.text.slice(0, 20).map((line) => line.slice(0, 1000)),
        backgroundColor: slide.backgroundColor.slice(0, 32),
        accentColor: slide.accentColor.slice(0, 32),
      }];
    })
    : undefined;

  return {
    listingId,
    listingVersionId,
    title,
    description,
    sellerId,
    sellerName,
    version,
    priceTiyin,
    currency,
    publishedAt,
    category,
    slideCount: typeof slideCount === "number"
      ? Math.max(slideCount, previewSlides?.length ?? 0)
      : previewSlides?.length ?? 0,
    ...(previewSlides ? { previewSlides } : {}),
  };
}

function readMarketplaceState(storageKey: string): SavedMarketplaceState {
  const fallback: SavedMarketplaceState = {
    cart: [],
    stage: "shop",
    category: "",
    search: "",
    sort: "latest",
    minPriceTiyin: null,
    maxPriceTiyin: null,
  };
  try {
    window.localStorage.removeItem(LEGACY_MARKETPLACE_STORAGE_KEY);
    const raw = window.localStorage.getItem(storageKey);
    if (!raw) return fallback;
    const parsed: unknown = JSON.parse(raw);
    if (!isRecord(parsed) || parsed.version !== MARKETPLACE_STORAGE_VERSION) return fallback;
    const cart = Array.isArray(parsed.cart)
      ? parsed.cart.slice(0, 50).flatMap((item) => {
        const product = restoreProduct(item);
        return product ? [product] : [];
      })
      : [];
    const allowedStages: MarketplaceStage[] = ["shop", "cart", "checkout", "payment"];
    const stage = allowedStages.includes(parsed.stage as MarketplaceStage)
      ? parsed.stage as MarketplaceStage
      : "shop";
    const validPrice = (value: unknown) =>
      typeof value === "number" && Number.isSafeInteger(value) && value >= 0 ? value : null;
    return {
      cart,
      stage: cart.length === 0 && stage !== "shop" ? "shop" : stage,
      category: typeof parsed.category === "string" ? parsed.category.slice(0, 100) : "",
      search: typeof parsed.search === "string" ? parsed.search.slice(0, 200) : "",
      sort: parsed.sort === "price_asc" || parsed.sort === "price_desc" ? parsed.sort : "latest",
      minPriceTiyin: validPrice(parsed.minPriceTiyin),
      maxPriceTiyin: validPrice(parsed.maxPriceTiyin),
    };
  } catch {
    // Storage may be disabled, unavailable, or contain malformed JSON.
    return fallback;
  }
}

function formatPrice(priceTiyin: number, currency: string, locale: Locale) {
  const numberLocale = locale === "ru" ? "ru-RU" : locale === "uz" ? "uz-UZ" : "en-US";
  return `${(priceTiyin / 100).toLocaleString(numberLocale)} ${currency}`;
}

export function Marketplace({
  locale,
  token,
  accountId,
  initialStage,
  walletBalanceTiyin,
  presentations,
  onSession,
  onExpired,
  onRequireAuth,
  onRequestTopUp,
  onRefreshWallet,
  onRefreshPresentations,
  cartInNavigation = false,
  cartOpenRequest,
  onCartOpenHandled,
  onCartCountChange,
}: Props) {
  const t = categoryNames[locale];
  const b = { ...browseLabels[locale], ...purchaseActionLabels[locale] };
  const publishCopy = publishDialogCopy[locale];
  const storageKey = `${MARKETPLACE_STORAGE_KEY}:${accountId ?? "anonymous"}`;
  const [categories, setCategories] = useState<Category[]>([]);
  const [savedState] = useState(() => {
    const saved = readMarketplaceState(storageKey);
    if (!accountId) return saved;
    const guestCart = readMarketplaceState(`${MARKETPLACE_STORAGE_KEY}:anonymous`).cart;
    const savedListingIds = new Set(saved.cart.map((product) => product.listingId));
    return {
      ...saved,
      cart: [...saved.cart, ...guestCart.filter((product) => !savedListingIds.has(product.listingId))].slice(0, 50),
    };
  });
  const [category, setCategory] = useState(savedState.category);
  const [items, setItems] = useState<Product[]>([]);
  const [page, setPage] = useState(0);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState("");
  const [detail, setDetail] = useState<ProductDetail | null>(null);
  const [detailTab, setDetailTab] = useState<MarketplaceDetailTab>("overview");
  const [cart, setCart] = useState<Product[]>(savedState.cart);
  const [stage, setStage] = useState<MarketplaceStage>(initialStage === "purchases" ? "purchases" : savedState.stage);
  const [searchOpen, setSearchOpen] = useState(false);
  const [filterOpen, setFilterOpen] = useState(false);
  const [sort, setSort] = useState(savedState.sort);
  const [minPriceTiyin, setMinPriceTiyin] = useState<number | null>(savedState.minPriceTiyin);
  const [maxPriceTiyin, setMaxPriceTiyin] = useState<number | null>(savedState.maxPriceTiyin);
  const [draftCategory, setDraftCategory] = useState("");
  const [draftSort, setDraftSort] = useState("latest");
  const [draftMinimum, setDraftMinimum] = useState("");
  const [draftMaximum, setDraftMaximum] = useState("");
  const [filterError, setFilterError] = useState("");
  const [notice, setNotice] = useState("");
  const [cartToast, setCartToast] = useState("");
  const [busy, setBusy] = useState(false);
  const [sellerListings, setSellerListings] = useState<Listing[]>([]);
  const [selectedPresentation, setSelectedPresentation] = useState("");
  const [listingDescription, setListingDescription] = useState("");
  const [licenseTerms, setLicenseTerms] = useState("");
  const [price, setPrice] = useState("10000");
  const [listingCategory, setListingCategory] = useState("");
  const [sellerWorkType, setSellerWorkType] = useState<SellerWorkType>("presentation");
  const [stagedWorkFile, setStagedWorkFile] = useState<File | null>(null);
  const [workFileError, setWorkFileError] = useState("");
  const [search, setSearch] = useState(savedState.search);
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [purchasesLoading, setPurchasesLoading] = useState(false);
  const [purchaseContent, setPurchaseContent] = useState<PurchaseContent | null>(null);
  const [purchaseExportFormat, setPurchaseExportFormat] = useState<ExportFormat | null>(null);
  const [purchaseExportError, setPurchaseExportError] = useState("");
  const [purchaseExportMessage, setPurchaseExportMessage] = useState("");
  const checkoutKeys = useRef(new Map<string, string>());
  const loadMoreRef = useRef<HTMLDivElement | null>(null);
  const loadMoreLock = useRef(false);
  const sellerDialogRef = useRef<HTMLDialogElement | null>(null);
  const [sellerDialogOpen, setSellerDialogOpen] = useState(false);
  const translatedCategory = (slug: string) => {
    const category = categories.find((item) => item.slug === slug);
    if (locale === "ru") return category?.nameRu ?? marketplaceCategoryFallbacks.ru[slug] ?? category?.name ?? slug;
    if (locale === "uz") return category?.nameUz ?? marketplaceCategoryFallbacks.uz[slug] ?? category?.name ?? slug;
    return category?.name ?? slug;
  };
  const lockedCarouselCopy = (slideCount: number, slides?: PreviewSlide[]) => {
    const previewCount = Math.max(1, Math.min(slides?.length ?? 0, 2));
    const lockedCount = Math.max(0, slideCount - previewCount);
    return {
      slideCount,
      lockedLabel: b.lockedSlides.replace("{count}", String(lockedCount)),
      lockedMessage: b.lockedNote,
      purchaseLabel: b.purchaseToUnlock,
    };
  };

  useEffect(() => {
    try {
      // Persist only public catalog metadata and browsing/wizard state. Never
      // store auth/session data, seller form values, orders, or payment data.
      window.localStorage.setItem(storageKey, JSON.stringify({
        version: MARKETPLACE_STORAGE_VERSION,
        cart: cart.map((product) => restoreProduct(product)).filter((product): product is Product => product !== null),
        stage: cart.length === 0 && stage !== "shop" && stage !== "purchases" ? "shop" : stage === "purchases" ? "shop" : stage,
        category,
        search,
        sort,
        minPriceTiyin,
        maxPriceTiyin,
      }));
    } catch {
      // Storage quota/security failures must not interrupt marketplace use.
    }
  }, [cart, stage, category, search, sort, minPriceTiyin, maxPriceTiyin, storageKey]);

  useEffect(() => {
    onCartCountChange?.(cart.length);
  }, [cart.length, onCartCountChange]);

  useEffect(() => () => onCartCountChange?.(0), [onCartCountChange]);

  useEffect(() => {
    if (cartOpenRequest === undefined || cartOpenRequest === 0) return;
    setStage("cart");
    onCartOpenHandled?.();
  }, [cartOpenRequest, onCartOpenHandled]);

  useEffect(() => {
    if (!cartToast) return;
    const timeout = window.setTimeout(() => setCartToast(""), 3000);
    return () => window.clearTimeout(timeout);
  }, [cartToast]);

  useEffect(() => {
    if (!accountId) return;
    const guestKey = `${MARKETPLACE_STORAGE_KEY}:anonymous`;
    const guestState = readMarketplaceState(guestKey);
    if (!guestState.cart.length) return;
    try {
      window.localStorage.setItem(guestKey, JSON.stringify({ ...guestState, cart: [] }));
    } catch {
      // Guest cart transfer is best-effort; the signed-in cart is still usable in memory.
    }
  }, [accountId]);

  useEffect(() => {
    let active = true;
    if (demoMode) {
      setCategories(demoCategories);
      setListingCategory((current) =>
        demoCategories.some((item) => item.slug === current) ? current : demoCategories[0]?.slug ?? "",
      );
      return () => { active = false; };
    }
    async function loadCategories() {
      let result: Category[];
      try {
        const response = await fetch(`${API_URL}/api/v1/catalog/categories`);
        if (!response.ok) throw new Error(t.error);
        result = await response.json() as Category[];
        if (!Array.isArray(result)) throw new Error(t.error);
      } catch {
        if (active) {
          setCategories([]);
          setCategory("");
          setListingCategory("");
          setError(t.error);
        }
        return;
      }
      if (!active) return;
      setCategories(result);
      setCategory((current) =>
        current && result.some((item) => item.slug === current) ? current : "",
      );
      setListingCategory((current) =>
        result.some((item) => item.slug === current) ? current : result[0]?.slug ?? "",
      );
      if (token) {
        try {
          const response = await authorizedFetch("/api/v1/catalog/preferences", token, {}, onSession, onExpired);
          if (!response.ok) return;
          const preference = await response.json() as { preferredCategory: string | null };
          if (active && preference.preferredCategory && result.some((item) => item.slug === preference.preferredCategory)) {
            setCategory(preference.preferredCategory);
          }
        } catch {
          // A saved preference is optional; the public catalog remains usable.
        }
      }
    }
    void loadCategories();
    return () => { active = false; };
  }, [token, t.error]);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError("");
    if (demoMode) {
      const result = demoCatalogPage(0, 10, category, minPriceTiyin, maxPriceTiyin, sort);
      setItems(result.items);
      setTotal(result.total);
      setPage(0);
      setLoading(false);
      return () => { active = false; };
    }
    const query = new URLSearchParams({ page: "0", size: "10" });
    if (category) query.set("category", category);
    if (minPriceTiyin !== null) query.set("minPriceTiyin", String(minPriceTiyin));
    if (maxPriceTiyin !== null) query.set("maxPriceTiyin", String(maxPriceTiyin));
    query.set("sort", sort);
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
  }, [category, minPriceTiyin, maxPriceTiyin, sort]);

  useEffect(() => {
    if (!token) return;
    authorizedFetch("/api/v1/seller/listings", token, {}, onSession, onExpired)
      .then(async (r) => { if (r.ok) setSellerListings(await r.json() as Listing[]); })
      .catch(() => {});
  }, [token]);

  useEffect(() => {
    const dialog = sellerDialogRef.current;
    if (sellerDialogOpen && dialog && !dialog.open) dialog.showModal();
    if (!sellerDialogOpen && dialog?.open) dialog.close();
  }, [sellerDialogOpen]);

  const visibleItems = useMemo(() => items.filter((item) =>
    `${item.title} ${item.description} ${item.sellerName}`.toLocaleLowerCase().includes(search.toLocaleLowerCase())), [items, search]);

  async function loadMore() {
    if (loadMoreLock.current || items.length >= total) return;
    loadMoreLock.current = true;
    setLoadingMore(true);
    setError("");
    try {
      if (demoMode) {
        const result = demoCatalogPage(page + 1, 10, category, minPriceTiyin, maxPriceTiyin, sort);
        setItems((current) => [...current, ...result.items]);
        setPage(result.page);
        setTotal(result.total);
        return;
      }
      const query = new URLSearchParams({ page: String(page + 1), size: "10" });
      if (category) query.set("category", category);
      if (minPriceTiyin !== null) query.set("minPriceTiyin", String(minPriceTiyin));
      if (maxPriceTiyin !== null) query.set("maxPriceTiyin", String(maxPriceTiyin));
      query.set("sort", sort);
      const response = await fetch(`${API_URL}/api/v1/catalog?${query}`);
      if (!response.ok) throw new Error();
      const result = await response.json() as { items: Product[]; page: number; total: number };
      setItems((current) => [...current, ...result.items]);
      setPage(result.page);
      setTotal(result.total);
    } catch {
      setError(t.error);
    } finally {
      loadMoreLock.current = false;
      setLoadingMore(false);
    }
  }

  useEffect(() => {
    const sentinel = loadMoreRef.current;
    if (!sentinel || loading || loadingMore || error || items.length >= total || visibleItems.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) void loadMore();
      },
      { rootMargin: "320px 0px" },
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [items.length, total, loading, loadingMore, error, visibleItems.length, page, category, minPriceTiyin, maxPriceTiyin, sort]);

  async function showDetail(item: Product) {
    if (demoMode) {
      const result = demoProductDetails.get(item.listingId);
      if (result) {
        setDetailTab("overview");
        setDetail(result);
      }
      return;
    }
    try {
      const response = await fetch(`${API_URL}/api/v1/catalog/${item.listingId}`);
      if (!response.ok) throw new Error();
      setDetailTab("overview");
      setDetail(await response.json() as ProductDetail);
    } catch { setError(t.error); }
  }

  function showFilters() {
    setDraftCategory(category);
    setDraftSort(sort);
    setDraftMinimum(minPriceTiyin === null ? "" : String(minPriceTiyin / 100));
    setDraftMaximum(maxPriceTiyin === null ? "" : String(maxPriceTiyin / 100));
    setFilterError("");
    setFilterOpen(true);
  }

  function applyFilters() {
    const minAmount = draftMinimum.trim() ? Number(draftMinimum) : null;
    const maxAmount = draftMaximum.trim() ? Number(draftMaximum) : null;
    if ((minAmount !== null && (!Number.isFinite(minAmount) || minAmount < 0))
      || (maxAmount !== null && (!Number.isFinite(maxAmount) || maxAmount < 0))
      || (minAmount !== null && maxAmount !== null && minAmount > maxAmount)) {
      setFilterError(b.invalidRange);
      return;
    }
    setMinPriceTiyin(minAmount === null ? null : Math.round(minAmount * 100));
    setMaxPriceTiyin(maxAmount === null ? null : Math.round(maxAmount * 100));
    setSort(draftSort);
    void changeCategory(draftCategory);
    setFilterOpen(false);
  }

  function resetFilters() {
    setMinPriceTiyin(null);
    setMaxPriceTiyin(null);
    setSort("latest");
    setDraftMinimum("");
    setDraftMaximum("");
    setDraftSort("latest");
    setDraftCategory("");
    setFilterError("");
    void changeCategory("");
    setFilterOpen(false);
  }

  async function loadPurchases() {
    if (!token) {
      onRequireAuth();
      return;
    }
    setPurchasesLoading(true);
    setError("");
    try {
      const response = await authorizedFetch("/api/v1/purchases", token, {}, onSession, onExpired);
      if (!response.ok) throw new Error(t.error);
      setPurchases(await response.json() as Purchase[]);
    } catch { setError(t.error); } finally { setPurchasesLoading(false); }
  }

  useEffect(() => {
    if (stage === "purchases") void loadPurchases();
  }, [stage, token]);

  async function openPurchase(purchase: Purchase) {
    if (!token) {
      onRequireAuth();
      return;
    }
    setPurchaseExportError("");
    setPurchaseExportMessage("");
    try {
      const response = await authorizedFetch(`/api/v1/purchases/${purchase.entitlementId}/content`, token, {}, onSession, onExpired);
      if (!response.ok) throw new Error(t.error);
      setPurchaseContent(await response.json() as PurchaseContent);
    } catch { setError(t.error); }
  }

  function returnToMarketplace() {
    setPurchaseContent(null);
    setPurchaseExportError("");
    setPurchaseExportMessage("");
    if (window.location.hash === "#purchases") {
      window.location.hash = "#marketplace";
    } else {
      setStage("shop");
    }
  }

  function showPurchases() {
    setPurchaseContent(null);
    if (window.location.hash !== "#purchases") {
      window.location.hash = "#purchases";
    } else {
      setStage("purchases");
    }
  }

  function previewSlidesFromDocument(content: PurchaseContent): PreviewSlide[] {
    return (content.document.slides ?? []).map((slide, index) => {
      const text = (slide.elements ?? [])
        .filter((element) => element.type === "text" && element.text?.trim())
        .map((element) => element.text!.trim());
      const title = slide.title?.trim() || text.shift() || `Slide ${index + 1}`;
      return {
        slideNumber: index + 1,
        title,
        text: text.slice(0, 3),
        backgroundColor: slide.backgroundColor ?? "#F3F5F1",
        accentColor: slide.accentColor ?? "#28765D",
      };
    });
  }

  async function downloadPurchased(format: ExportFormat) {
    if (!token || !purchaseContent || purchaseExportFormat) return;
    const purchased = purchaseContent;
    setPurchaseExportFormat(format);
    setPurchaseExportError("");
    setPurchaseExportMessage(b.exporting);
    try {
      const enqueueResponse = await authorizedFetch(
        `/api/v1/purchases/${purchased.entitlementId}/exports`,
        token,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ format }),
        },
        onSession,
        onExpired,
      );
      if (!enqueueResponse.ok) {
        const problem = await enqueueResponse.json().catch(() => null) as { detail?: string } | null;
        throw new Error(problem?.detail ?? b.exportFailed);
      }

      let job = await enqueueResponse.json() as ExportJobResponse;
      void onRefreshPresentations().catch(() => setError(t.error));
      for (let attempt = 0; job.status === "QUEUED" || job.status === "RUNNING"; attempt++) {
        if (attempt >= 120) throw new Error(b.exportTimedOut);
        await new Promise((resolve) => window.setTimeout(resolve, 1000));
        const statusResponse = await authorizedFetch(
          `/api/v1/exports/${job.id}`,
          token,
          {},
          onSession,
          onExpired,
        );
        if (!statusResponse.ok) {
          const problem = await statusResponse.json().catch(() => null) as { detail?: string } | null;
          throw new Error(problem?.detail ?? b.exportFailed);
        }
        job = await statusResponse.json() as ExportJobResponse;
      }
      if (job.status !== "SUCCEEDED" || !job.downloadUrl) throw new Error(b.exportFailed);

      const fileResponse = await authorizedFetch(job.downloadUrl, token, {}, onSession, onExpired);
      if (!fileResponse.ok) {
        const problem = await fileResponse.json().catch(() => null) as { detail?: string } | null;
        throw new Error(problem?.detail ?? b.exportFailed);
      }
      const fileUrl = URL.createObjectURL(await fileResponse.blob());
      const link = document.createElement("a");
      const safeTitle = purchased.title.replace(/[\u0000-\u001f<>:"/\\|?*]+/g, "-").trim() || "presentation";
      link.href = fileUrl;
      link.download = `${safeTitle}.${format}`;
      link.click();
      window.setTimeout(() => URL.revokeObjectURL(fileUrl), 1000);
      setPurchaseExportMessage(b.exportReady);
    } catch (error) {
      setPurchaseExportMessage("");
      setPurchaseExportError(error instanceof Error ? error.message : b.exportFailed);
    } finally {
      setPurchaseExportFormat(null);
    }
  }

  async function checkout() {
    if (!token) { onRequireAuth(); return; }
    if (!cart.length) return;
    if (demoMode) {
      setNotice(t.demoPaid);
      return;
    }
    if (walletBalanceTiyin === null || cart.some((product) => product.currency !== "UZS")) {
      setError(t.error);
      return;
    }
    if (walletBalanceTiyin < cartTotal) {
      setNotice(b.insufficientBalance);
      onRequestTopUp();
      return;
    }
    setBusy(true);
    setNotice("");
    setError("");
    const paidListingIds = new Set<string>();
    let insufficientBalance = false;
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
        const paymentResponse = await authorizedFetch(`/api/v1/orders/${order.id}/wallet-pay`, token, { method: "POST" }, onSession, onExpired);
        if (paymentResponse.status === 402) {
          insufficientBalance = true;
          break;
        }
        if (!paymentResponse.ok) {
          throw new Error();
        }
        checkoutKeys.current.delete(product.listingId);
        paidListingIds.add(product.listingId);
        confirmed++;
      }
      if (confirmed) {
        setCart((current) => current.filter((item) => !paidListingIds.has(item.listingId)));
        setPurchaseContent(null);
        await onRefreshWallet();
        const allItemsPaid = paidListingIds.size === cart.length;
        if (allItemsPaid && window.location.hash !== "#purchases") {
          window.location.hash = "#purchases";
        } else {
          setStage(allItemsPaid ? "purchases" : "payment");
        }
      }
      if (insufficientBalance) {
        setNotice(b.insufficientBalance);
        onRequestTopUp();
        await onRefreshWallet();
      } else {
        setNotice(confirmed ? t.complete : t.pending);
      }
    } catch {
      if (paidListingIds.size) {
        setCart((current) => current.filter((item) => !paidListingIds.has(item.listingId)));
        await onRefreshWallet();
      }
      setError(t.error);
    } finally { setBusy(false); }
  }

  async function publishListing(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (sellerWorkType !== "presentation") return;
    if (!token) { onRequireAuth(); return; }
    if (!selectedPresentation) return;
    if (!categories.some((item) => item.slug === listingCategory)) {
      setError(t.error);
      return;
    }
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
      setSellerDialogOpen(false);
    } catch { setError(t.error); } finally { setBusy(false); }
  }

  function stageWorkFile(file: File | undefined) {
    setWorkFileError("");
    if (!file) return;
    if (file.size > maximumLocalFileSize) {
      setStagedWorkFile(null);
      setWorkFileError(publishCopy.fileTooLarge);
      return;
    }
    setStagedWorkFile(file);
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

  function addToCart(product: Product) {
    setCart((current) => current.some((item) => item.listingId === product.listingId)
      ? current
      : [...current, product]);
    setCartToast(t.added);
  }

  const cartAddedToast = cartToast && (
    <div className="market-cart-toast" role="status" aria-live="polite">
      <Check size={17} aria-hidden="true" />
      <span>{cartToast}</span>
    </div>
  );

  if (detail) {
    const visibleSlideCount = Math.min(detail.previewSlides?.length ?? 0, 2);
    const totalSlideCount = Number.isSafeInteger(detail.slideCount) && detail.slideCount > 0
      ? detail.slideCount
      : visibleSlideCount;
    const lockedSlideCount = Math.max(0, totalSlideCount - visibleSlideCount);
    return (
      <section className="marketplace-page market-detail-page" aria-labelledby="market-detail-title">
        {cartAddedToast}
        <button className="text-button" type="button" onClick={() => setDetail(null)}><ArrowLeft size={16} />{t.back}</button>
        <div className="market-detail">
          <div className="market-detail-main">
            <div className="market-detail-preview">
              <SlidePreviewCarousel
                title={detail.title}
                slides={detail.previewSlides?.slice(0, 2) ?? []}
                locale={locale}
                categoryTag={translatedCategory(detail.category)}
                {...lockedCarouselCopy(totalSlideCount, detail.previewSlides)}
                onPurchase={() => { addToCart(detail); setDetail(null); setStage("cart"); }}
              />
              <p className="market-preview-count">
                {b.previewCount.replace("{visible}", String(visibleSlideCount)).replace("{total}", String(totalSlideCount))}
              </p>
            </div>

            <header className="market-detail-heading">
              <span className="market-category"><Tag size={12} aria-hidden="true" />{translatedCategory(detail.category)}</span>
              <h1 id="market-detail-title">{detail.title}</h1>
              <div className="market-detail-meta">
                <span><Layers3 size={15} aria-hidden="true" />{totalSlideCount} {b.slideUnit}</span>
                <span><BookOpen size={15} aria-hidden="true" />v{detail.version}</span>
              </div>
            </header>

            <div className="market-detail-seller">
              <span className="market-detail-seller-icon"><Store size={18} aria-hidden="true" /></span>
              <span><small>{t.seller}</small><strong>{detail.sellerName}</strong></span>
            </div>

            <nav className="market-detail-tabs" aria-label={b.detailSections}>
              <button type="button" aria-pressed={detailTab === "overview"} onClick={() => setDetailTab("overview")}>{b.detailOverview}</button>
              <button type="button" aria-pressed={detailTab === "slides"} onClick={() => setDetailTab("slides")}>{b.detailSlideOutline}</button>
              <button type="button" aria-pressed={detailTab === "license"} onClick={() => setDetailTab("license")}>{b.detailLicense}</button>
            </nav>

            <section className="market-detail-panel" aria-live="polite">
              {detailTab === "overview" && <p>{detail.description}</p>}
              {detailTab === "slides" && (
                <>
                  <h2>{b.detailSlideOutline}</h2>
                  {detail.previewSlides?.slice(0, 2).length ? (
                    <ol className="market-detail-slide-outline">
                      {detail.previewSlides.slice(0, 2).map((slide) => (
                        <li key={slide.slideNumber}>
                          <span>{String(slide.slideNumber).padStart(2, "0")}</span>
                          <strong>{slide.title}</strong>
                        </li>
                      ))}
                    </ol>
                  ) : <p>{detail.description}</p>}
                  {lockedSlideCount > 0 && (
                    <div className="market-detail-locked-note">
                      <LockKeyhole size={16} aria-hidden="true" />
                      <span>{b.lockedSlides.replace("{count}", String(lockedSlideCount))}. {b.lockedNote}</span>
                      <button className="secondary-button" type="button" onClick={() => { addToCart(detail); setDetail(null); setStage("cart"); }}>
                        <ShoppingBag size={14} aria-hidden="true" />{b.purchaseToUnlock}
                      </button>
                    </div>
                  )}
                </>
              )}
              {detailTab === "license" && <><h2>{b.detailLicense}</h2><p>{detail.licenseTerms}</p></>}
            </section>
          </div>

          <aside className="market-detail-purchase-card" aria-label={b.buyNow}>
            <span className="market-detail-purchase-label">{b.buyNow}</span>
            <strong className="market-detail-price">{formatPrice(detail.priceTiyin, detail.currency, locale)}</strong>
            <button className="primary-button" type="button" onClick={() => { addToCart(detail); setDetail(null); setStage("checkout"); }}>
              <CreditCard size={16} aria-hidden="true" />{b.buyNow}
            </button>
            <button className="secondary-button" type="button" onClick={() => addToCart(detail)}>
              {cart.some((product) => product.listingId === detail.listingId)
                ? <><Check size={15} aria-hidden="true" />{t.added}</>
                : <><ShoppingBag size={15} aria-hidden="true" />{t.add}</>}
            </button>
            {lockedSlideCount > 0 && (
              <p className="market-detail-purchase-lock"><LockKeyhole size={15} aria-hidden="true" />{b.lockedNote}</p>
            )}
            <p className="market-detail-secure-note"><ShieldCheck size={16} aria-hidden="true" />{t.secureNote}</p>
          </aside>
        </div>
      </section>
    );
  }

  if (stage === "cart" || stage === "checkout" || stage === "payment") return (
    <section className="marketplace-page market-order-page" aria-labelledby="marketplace-title">
      {cartAddedToast}
      <button className="text-button market-order-back" type="button" onClick={() => setStage("shop")}><ArrowLeft size={16} aria-hidden="true" />{t.back}</button>
      <div className="market-checkout-page">
        <div className="market-checkout-heading">
          <span className="eyebrow"><ShoppingBag size={14} aria-hidden="true" />{t.cart}</span>
          <h1 id="marketplace-title">{stage === "cart" ? t.cart : stage === "checkout" ? t.checkout : t.payment}</h1>
          {cart.length > 0 && <p>{b.checkoutIntro}</p>}
        </div>
        <div className="market-checkout-steps" aria-label={`${t.cart} · ${t.checkout} · ${t.payment}`}>
          {(["cart", "checkout", "payment"] as const).map((step, index) => {
            const activeIndex = stage === "cart" ? 0 : stage === "checkout" ? 1 : 2;
            const isComplete = index < activeIndex;
            return (
              <div
                className={`market-step${stage === step ? " market-step-active" : ""}${isComplete ? " market-step-complete" : ""}`}
                key={step}
                aria-current={stage === step ? "step" : undefined}
              >
                <span>{isComplete ? <Check size={14} aria-hidden="true" /> : index + 1}</span>
                {t[step]}
              </div>
            );
          })}
        </div>
        {cart.length === 0 ? (
          <div className="market-empty-cart">
            <span className="market-empty-cart-icon"><ShoppingBag size={24} aria-hidden="true" /></span>
            <h2>{t.emptyCart}</h2>
            <p>{b.emptyCartDescription}</p>
            <button className="primary-button" type="button" onClick={() => setStage("shop")}>
              <ArrowLeft size={15} aria-hidden="true" />{b.continueShopping}
            </button>
          </div>
        ) : (
          <div className="market-order-layout">
            <div className="market-order-content">
              <div className="market-cart-lines" aria-label={b.orderSummary}>
                {cart.map((item) => (
                  <article className="market-cart-line" key={item.listingId}>
                    <div className="market-cart-line-preview"><SlidePreviewCarousel title={item.title} slides={item.previewSlides} locale={locale} compact categoryTag={translatedCategory(item.category)} {...lockedCarouselCopy(item.slideCount, item.previewSlides)} /></div>
                    <div className="market-cart-line-copy">
                      <strong>{item.title}</strong>
                      <small>{t.seller}: {item.sellerName}</small>
                      <small>{item.slideCount} {b.slideUnit} · v{item.version}</small>
                    </div>
                    <strong className="market-cart-line-price">{formatPrice(item.priceTiyin, item.currency, locale)}</strong>
                    {stage === "cart" && <button className="text-button market-remove-button" type="button" aria-label={`${t.remove}: ${item.title}`} onClick={() => setCart((current) => current.filter((entry) => entry.listingId !== item.listingId))}><X size={15} aria-hidden="true" />{t.remove}</button>}
                  </article>
                ))}
              </div>
              {stage === "checkout" && (
                <section className="market-checkout-panel market-review-panel" aria-labelledby="market-review-title">
                  <span className="market-panel-icon"><ShieldCheck size={18} aria-hidden="true" /></span>
                  <div>
                    <h2 id="market-review-title">{t.checkout}</h2>
                    <p>{b.checkoutIntro}</p>
                    <p className="market-review-secure-note">{t.secureNote}</p>
                  </div>
                </section>
              )}
              {stage === "payment" && (
                <section className="market-checkout-panel market-payment-panel" aria-labelledby="market-payment-title">
                  <div className="market-payment-heading">
                    <span className="market-panel-icon"><CreditCard size={18} aria-hidden="true" /></span>
                    <div><h2 id="market-payment-title">{t.payment}</h2><p>{b.walletBalance}</p></div>
                  </div>
                  <div className="market-wallet-option" aria-label={b.walletMethod}>
                    <span className="market-wallet-option-icon"><CircleDollarSign size={19} aria-hidden="true" /></span>
                    <span className="market-wallet-option-copy"><strong>{b.walletMethod}</strong><small>{b.walletBalance}</small></span>
                    <strong className="market-wallet-option-balance">{walletBalanceTiyin === null ? "—" : formatPrice(walletBalanceTiyin, "UZS", locale)}</strong>
                  </div>
                  {!demoMode && walletBalanceTiyin !== null && walletBalanceTiyin < cartTotal && (
                    <p className="market-payment-warning" role="status"><CircleDollarSign size={15} aria-hidden="true" />{b.insufficientBalance}</p>
                  )}
                  <div className="market-unavailable-methods">
                    <span>{b.additionalMethods}</span>
                    <p>{b.liveUnavailable}</p>
                  </div>
                  <p className="market-sandbox-notice"><ShieldCheck size={15} aria-hidden="true" />{b.sandboxWalletNotice}</p>
                </section>
              )}
              {notice && <p className="market-notice" role="status">{notice}</p>}
              {error && <p className="form-error" role="alert">{error}</p>}
            </div>
            <aside className="market-order-summary" aria-labelledby="market-order-summary-title">
              <div className="market-order-summary-heading">
                <span className="market-panel-icon"><ShoppingBag size={18} aria-hidden="true" /></span>
                <div>
                  <h2 id="market-order-summary-title">{b.orderSummary}</h2>
                  <p>{b.itemsCount.replace("{count}", String(cart.length))}</p>
                </div>
              </div>
              <div className="market-order-summary-items">
                {cart.map((item) => (
                  <div className="market-order-summary-item" key={item.listingId}>
                    <span title={item.title}>{item.title}</span>
                    <strong>{formatPrice(item.priceTiyin, item.currency, locale)}</strong>
                  </div>
                ))}
              </div>
              <div className="market-order-total"><span>{t.total}</span><strong>{formatPrice(cartTotal, cart[0]?.currency ?? "UZS", locale)}</strong></div>
              <button
                className="primary-button market-order-continue"
                disabled={stage === "payment" && (busy || (token !== null && !demoMode && walletBalanceTiyin === null))}
                type="button"
                onClick={() => {
                  if (stage === "cart") setStage("checkout");
                  else if (stage === "checkout") setStage("payment");
                  else if (!token) void checkout();
                  else if (!demoMode && walletBalanceTiyin !== null && walletBalanceTiyin < cartTotal) onRequestTopUp();
                  else void checkout();
                }}
              >
                {stage === "payment" && busy && <LoaderCircle className="spin-icon" size={16} aria-hidden="true" />}
                {stage === "cart" || stage === "checkout"
                  ? <>{t.continue}<ArrowRight size={16} aria-hidden="true" /></>
                  : token
                    ? !demoMode && walletBalanceTiyin !== null && walletBalanceTiyin < cartTotal ? <>{b.topUpBalance}<ArrowRight size={16} aria-hidden="true" /></> : <><CreditCard size={16} aria-hidden="true" />{b.payFromBalance}</>
                    : <>{t.signInToPay}<ArrowRight size={16} aria-hidden="true" /></>}
              </button>
              {stage !== "payment" && <button className="text-button market-continue-shopping" type="button" onClick={() => setStage("shop")}><ArrowLeft size={14} aria-hidden="true" />{b.continueShopping}</button>}
              <p className="market-order-secure-note"><ShieldCheck size={15} aria-hidden="true" />{t.secureNote}</p>
            </aside>
          </div>
        )}
      </div>
    </section>
  );

  if (stage === "purchases") return (
    <section className="marketplace-page" aria-labelledby="marketplace-title">
      <button className="text-button" type="button" onClick={returnToMarketplace}><ArrowLeft size={16} />{t.back}</button>
      <div className="market-checkout-page">
        <div className="market-checkout-heading">
          <span className="eyebrow"><ShoppingBag size={14} />{b.purchases}</span>
          <h1 id="marketplace-title">{b.purchases}</h1>
        </div>
        {notice && <p className="market-notice" role="status"><Check size={16} />{notice}</p>}
        {purchaseContent ? (
          <div className="market-purchased-deck">
            <button className="text-button" type="button" onClick={() => {
              setPurchaseContent(null);
              setPurchaseExportError("");
              setPurchaseExportMessage("");
            }}><ArrowLeft size={16} />{b.purchases}</button>
            <SlidePreviewCarousel title={purchaseContent.title} slides={previewSlidesFromDocument(purchaseContent)} locale={locale} />
            <p className="market-notice"><Check size={16} />{b.ready}</p>
            <div className="market-export-actions" aria-busy={purchaseExportFormat !== null}>
              <button className="primary-button" type="button" disabled={purchaseExportFormat !== null} onClick={() => void downloadPurchased("pptx")}>
                {purchaseExportFormat === "pptx" ? <LoaderCircle className="spin-icon" size={16} aria-hidden="true" /> : <Download size={16} aria-hidden="true" />}
                {purchaseExportFormat === "pptx" ? b.exporting : b.downloadPptx}
              </button>
              <button className="secondary-button" type="button" disabled={purchaseExportFormat !== null} onClick={() => void downloadPurchased("pdf")}>
                {purchaseExportFormat === "pdf" ? <LoaderCircle className="spin-icon" size={16} aria-hidden="true" /> : <Download size={16} aria-hidden="true" />}
                {purchaseExportFormat === "pdf" ? b.exporting : b.downloadPdf}
              </button>
            </div>
            {purchaseExportMessage && <p className="market-export-message" role="status">{purchaseExportMessage}</p>}
            {purchaseExportError && <p className="form-error" role="alert">{purchaseExportError}</p>}
          </div>
        ) : purchasesLoading ? (
          <p role="status">{b.loading}</p>
        ) : purchases.length === 0 ? (
          <p className="empty-state">{b.noPurchases}</p>
        ) : (
          <div className="market-purchases-list">
            {purchases.map((purchase) => (
              <article className="market-purchase-card" key={purchase.entitlementId}>
                <SlidePreviewCarousel title={purchase.title} slides={purchase.previewSlides} locale={locale} compact />
                <h2>{purchase.title}</h2>
                <p>{t.seller}: {purchase.sellerName} · {purchase.slideCount} {b.slideUnit}</p>
                <strong>{formatPrice(purchase.priceTiyin, purchase.currency, locale)}</strong>
                <button className="primary-button" type="button" onClick={() => void openPurchase(purchase)}>{b.openPurchase}</button>
              </article>
            ))}
          </div>
        )}
        {error && <p className="form-error" role="alert">{error}</p>}
      </div>
    </section>
  );

  return (
    <section className="marketplace-page" aria-labelledby="marketplace-title">
      {cartAddedToast}
      <div className="marketplace-banner">
        <div>
          <span className="eyebrow"><Store size={14} />{t.shop}</span>
          <h1 id="marketplace-title">{b.bannerTitle}</h1>
          <p>{b.bannerSubtitle}</p>
        </div>
        <BookOpen size={42} aria-hidden="true" />
      </div>
      {demoMode && <p className="market-demo-banner" role="status">{t.demo}</p>}
      <nav className="market-toolbar" aria-label={t.shop}>
        {searchOpen ? (
          <div className="market-search-control">
            <Search size={16} aria-hidden="true" />
            <input autoFocus aria-label={t.search} placeholder={t.search} value={search} onChange={(e) => setSearch(e.target.value)} />
            <button type="button" aria-label={t.remove} onClick={() => { setSearch(""); setSearchOpen(false); }}><X size={15} /></button>
          </div>
        ) : (
          <button className="cart-button" type="button" onClick={() => setSearchOpen(true)}><Search size={16} />{b.searchAction}</button>
        )}
        <button className="cart-button" type="button" onClick={showFilters}><SlidersHorizontal size={16} />{b.filters}{(category || sort !== "latest" || minPriceTiyin !== null || maxPriceTiyin !== null) && <span className="market-filter-count">!</span>}</button>
        {token && <button className="cart-button" type="button" onClick={showPurchases}><BookOpen size={16} />{b.purchases}</button>}
        <button className="cart-button market-publish-action" type="button" onClick={() => {
          if (!token) { onRequireAuth(); return; }
          setSellerDialogOpen(true);
        }}><Plus size={16} aria-hidden="true" /><span>{t.sell}</span></button>
        {!cartInNavigation && <button className="cart-button market-cart-action" type="button" onClick={() => setStage("cart")} aria-label={cart.length ? `${t.cart}, ${cart.length}` : t.cart}><ShoppingBag size={17} /><span>{t.cart}</span>{cart.length > 0 && <span className="market-cart-badge" aria-hidden="true">{cart.length}</span>}</button>}
      </nav>
      {(category || sort !== "latest" || minPriceTiyin !== null || maxPriceTiyin !== null) && (
        <div className="market-active-filters">
          {category && <span>{translatedCategory(category)}</span>}
          {sort !== "latest" && <span>{sort === "price_asc" ? b.priceLow : b.priceHigh}</span>}
          {(minPriceTiyin !== null || maxPriceTiyin !== null) && <span>{minPriceTiyin === null ? "0" : (minPriceTiyin / 100).toLocaleString()}–{maxPriceTiyin === null ? "∞" : (maxPriceTiyin / 100).toLocaleString()} UZS</span>}
        </div>
      )}
      {notice && <p className="market-notice" role="status"><Check size={16} />{notice}</p>}
      {error && <p className="form-error" role="alert">{error}</p>}
      <div className="market-grid">
        {loading && Array.from({ length: 10 }, (_, i) => <div key={i} className="market-skeleton" aria-hidden="true"><div /><span /><span /></div>)}
        {!loading && visibleItems.map((item) => {
          const visibleSlideCount = Math.min(item.previewSlides?.length ?? 0, 2);
          const totalSlideCount = Number.isSafeInteger(item.slideCount) && item.slideCount > 0
            ? item.slideCount
            : visibleSlideCount;
          const lockedSlideCount = Math.max(0, totalSlideCount - visibleSlideCount);
          return <article
            className="market-card"
            key={item.listingId}
            role="group"
            tabIndex={0}
            aria-label={`${t.details}: ${item.title}`}
            aria-keyshortcuts="Enter Space"
            onClick={() => void showDetail(item)}
            onKeyDown={(event) => {
              if (event.target !== event.currentTarget || (event.key !== "Enter" && event.key !== " ")) return;
              event.preventDefault();
              void showDetail(item);
            }}
          >
            <SlidePreviewCarousel
              title={item.title}
              slides={item.previewSlides?.slice(0, 2) ?? []}
              locale={locale}
              compact
              categoryTag={translatedCategory(item.category)}
              {...lockedCarouselCopy(totalSlideCount, item.previewSlides)}
              onPurchase={() => { addToCart(item); setStage("cart"); }}
            />
            <div className="market-card-copy">
              <span className="market-category"><Tag size={12} aria-hidden="true" />{translatedCategory(item.category)}</span>
              <h2>{item.title}</h2>
              <p>{item.description}</p>
              <small>{t.seller}: {item.sellerName}</small>
              <small className="market-preview-count">
                {b.previewCount.replace("{visible}", String(visibleSlideCount)).replace("{total}", String(totalSlideCount))}
              </small>
              {lockedSlideCount > 0 && (
                <span className="market-card-lock-note">
                  <small className="market-locked-count"><LockKeyhole size={12} />{b.lockedSlides.replace("{count}", String(lockedSlideCount))}</small>
                  <small>{b.lockedNote}</small>
                </span>
              )}
              <strong className="market-price">{formatPrice(item.priceTiyin, item.currency, locale)}</strong>
              <div className="market-card-actions">
                <button type="button" className="primary-button" aria-label={`${t.add}: ${item.title}`} onClick={(event) => { event.stopPropagation(); addToCart(item); }}>
                  {cart.some((product) => product.listingId === item.listingId) ? <><Check size={15} />{t.added}</> : <><ShoppingBag size={15} aria-hidden="true" />{t.add}</>}
                </button>
              </div>
            </div>
          </article>;
        })}
      </div>
      {!loading && visibleItems.length === 0 && <p className="empty-state">{t.empty}</p>}
      <div className="market-load-sentinel" ref={loadMoreRef} aria-hidden="true" />
      {loadingMore && <p className="market-loading-more" role="status"><LoaderCircle className="spin-icon" size={16} aria-hidden="true" />{t.more}</p>}
      {items.length < total && <button className="secondary-button market-more" disabled={loadingMore} type="button" onClick={() => void loadMore()}>{loadingMore && <LoaderCircle className="spin-icon" size={16} />}{t.more}</button>}
      {filterOpen && (
        <div className="market-filter-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) setFilterOpen(false); }}>
          <section className="market-filter-drawer" role="dialog" aria-modal="true" aria-labelledby="market-filter-title">
            <div className="market-filter-heading">
              <div><span className="eyebrow"><Filter size={14} />{b.filters}</span><h2 id="market-filter-title">{b.filters}</h2></div>
              <button type="button" aria-label={publishCopy.close} onClick={() => setFilterOpen(false)}><X size={18} /></button>
            </div>
            <div>
              <label className="market-filter-field">
                <span className="market-filter-field-label"><Tag size={15} aria-hidden="true" />{t.category}</span>
                <select value={draftCategory} onChange={(event) => setDraftCategory(event.target.value)}><option value="">{t.all}</option>{categories.map((item) => <option key={item.slug} value={item.slug}>{translatedCategory(item.slug)}</option>)}</select>
              </label>
              <label className="market-filter-field">
                <span className="market-filter-field-label"><ArrowDownWideNarrow size={15} aria-hidden="true" />{b.sort}</span>
                <select value={draftSort} onChange={(event) => setDraftSort(event.target.value)}><option value="latest">{b.latest}</option><option value="price_asc">{b.priceLow}</option><option value="price_desc">{b.priceHigh}</option></select>
              </label>
              <div className="market-filter-price-group">
                <div className="market-filter-field-label"><CircleDollarSign size={15} aria-hidden="true" />{b.minPrice} / {b.maxPrice}</div>
                <div className="market-price-filters">
                <label>{b.minPrice}<input inputMode="decimal" value={draftMinimum} onChange={(event) => setDraftMinimum(event.target.value)} /></label>
                <label>{b.maxPrice}<input inputMode="decimal" value={draftMaximum} onChange={(event) => setDraftMaximum(event.target.value)} /></label>
                </div>
              </div>
            </div>
            {filterError && <p className="form-error" role="alert">{filterError}</p>}
            <div className="market-filter-actions"><button className="text-button" type="button" onClick={resetFilters}><RotateCcw size={15} aria-hidden="true" />{b.reset}</button><button className="primary-button" type="button" onClick={applyFilters}><Check size={15} aria-hidden="true" />{b.apply}</button></div>
          </section>
        </div>
      )}
      <dialog ref={sellerDialogRef} className="seller-dialog" aria-labelledby="seller-dialog-title" onClose={() => {
        setSellerDialogOpen(false);
        setStagedWorkFile(null);
        setWorkFileError("");
      }}>
        <div className="seller-dialog-heading">
          <div>
            <span className="eyebrow"><Store size={14} aria-hidden="true" />{t.shop}</span>
            <h2 id="seller-dialog-title">{t.sell}</h2>
            <p>{publishCopy.prompt}</p>
          </div>
          <button className="seller-dialog-close" type="button" aria-label={publishCopy.close} onClick={() => setSellerDialogOpen(false)}><X size={18} aria-hidden="true" /></button>
        </div>
        <form className="seller-form" onSubmit={(event) => void publishListing(event)}>
          <label>{publishCopy.workType}
            <select value={sellerWorkType} onChange={(event) => {
              setSellerWorkType(event.target.value as SellerWorkType);
              setStagedWorkFile(null);
              setWorkFileError("");
            }}>
              <option value="presentation">{publishCopy.presentation}</option>
              <option value="document">{publishCopy.document}</option>
              <option value="coursework">{publishCopy.coursework}</option>
              <option value="worksheet">{publishCopy.worksheet}</option>
              <option value="design">{publishCopy.design}</option>
              <option value="other">{publishCopy.other}</option>
            </select>
          </label>
          {sellerWorkType === "presentation" ? (
            presentations.length ? (
              <label>{publishCopy.choose}<select required value={selectedPresentation} onChange={(e) => setSelectedPresentation(e.target.value)}><option value="">—</option>{presentations.map((p) => <option key={p.id} value={p.id}>{p.title} · v{p.currentVersion}</option>)}</select></label>
            ) : <p className="seller-dialog-empty">{t.noDecks}</p>
          ) : (
            <div className="seller-file-work">
              <label
                className="seller-file-drop"
                onDragOver={(event) => event.preventDefault()}
                onDrop={(event) => {
                  event.preventDefault();
                  stageWorkFile(event.dataTransfer.files[0]);
                }}
              >
                <span>{publishCopy.filePrompt}</span>
                <input
                  type="file"
                  onChange={(event) => {
                    stageWorkFile(event.currentTarget.files?.[0]);
                    event.currentTarget.value = "";
                  }}
                />
              </label>
              {stagedWorkFile && <p className="seller-file-selected" role="status">{publishCopy.fileSelected}: {stagedWorkFile.name} · {publishCopy.fileSize}: {(stagedWorkFile.size / (1024 * 1024)).toFixed(2)} MB</p>}
              {workFileError && <p className="form-error" role="alert">{workFileError}</p>}
              <p className="seller-file-notice">{publishCopy.localOnly}</p>
              <p className="seller-file-blocked">{publishCopy.blockedPublish}</p>
            </div>
          )}
          <label>{t.category}<select required value={listingCategory} onChange={(e) => setListingCategory(e.target.value)}><option value="">—</option>{categories.map((c) => <option key={c.slug} value={c.slug}>{translatedCategory(c.slug)}</option>)}</select></label>
          <label>{t.price}<input type="number" min="1" step="1" required value={price} onChange={(e) => setPrice(e.target.value)} /></label>
          <label>{t.description}<textarea required maxLength={20000} value={listingDescription} onChange={(e) => setListingDescription(e.target.value)} /></label>
          <label>{t.terms}<textarea required maxLength={20000} value={licenseTerms} onChange={(e) => setLicenseTerms(e.target.value)} /></label>
          <button className="primary-button" type="submit" disabled={busy || sellerWorkType !== "presentation" || !presentations.length || !categories.some((item) => item.slug === listingCategory)}>{t.publish}</button>
        </form>
        {sellerListings.length > 0 && <div className="seller-listings"><h3>{t.myListings}</h3>{sellerListings.map((item) => <div key={item.id}><span>{item.title}</span><span>{item.status}</span></div>)}</div>}
      </dialog>
    </section>
  );
}
