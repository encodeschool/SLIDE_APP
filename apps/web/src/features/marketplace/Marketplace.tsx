import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { ArrowLeft, ArrowRight, BookOpen, Check, Download, Filter, LoaderCircle, LockKeyhole, Search, ShoppingBag, SlidersHorizontal, Store, X } from "lucide-react";
import { API_URL, authorizedFetch } from "../../shared/api/client";
import type { AuthResponse, ExportFormat, ExportJobResponse, Locale, PresentationSummary } from "../../shared/types";
import { SlidePreviewCarousel } from "./SlidePreviewCarousel";
import { demoCatalogPage, demoCategories, demoProductDetails } from "./demoCatalog";
import type { Category, Product, ProductDetail, Purchase, PurchaseContent, PreviewSlide } from "./marketplaceTypes";
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
}

const categoryNames = {
  en: { shop: "Presentation marketplace", intro: "Discover and sell editable presentations.", category: "Category", all: "All categories", search: "Search presentations", add: "Add to cart", added: "Added", remove: "Remove", cart: "Cart", checkout: "Checkout", payment: "Payment", continue: "Continue", pay: "Pay for order", sandbox: "Sandbox payment", sandboxInfo: "Development-only sandbox; confirmation is disabled unless an operator enables it.", total: "Order total", signInToPay: "Sign in to continue to payment", secureNote: "Your account session is protected; payment details are handled by the payment provider.", emptyCart: "Your cart is empty.", empty: "No published presentations yet.", seller: "Seller", license: "License terms", details: "View details", back: "Back to marketplace", more: "Load 10 more", signIn: "Sign in to checkout", sell: "Sell a presentation", choose: "Choose a presentation", price: "Price (UZS)", description: "Listing description", terms: "License terms", publish: "Publish listing", myListings: "My listings", published: "Listing published", saved: "Preference saved", pending: "Order created but payment is pending. Sandbox confirmation is disabled; no purchase was completed.", complete: "Purchase complete", error: "Could not complete the request. Please try again.", noDecks: "Create a presentation before publishing.", demo: "Demo catalog — sample items only. Purchases are not available in demo mode.", demoPaid: "Demo only: no order or payment was created." },
  ru: { shop: "Маркетплейс презентаций", intro: "Покупайте и продавайте редактируемые презентации.", category: "Категория", all: "Все категории", search: "Поиск презентаций", add: "В корзину", added: "Добавлено", remove: "Удалить", cart: "Корзина", checkout: "Оформление", payment: "Оплата", continue: "Продолжить", pay: "Оплатить заказ", sandbox: "Тестовая оплата", sandboxInfo: "Тестовый режим для разработки; подтверждение отключено, если оператор его не включил.", total: "Итого", signInToPay: "Войдите, чтобы перейти к оплате", secureNote: "Сессия защищена; платёжные данные обрабатываются платёжным провайдером.", emptyCart: "Корзина пока пуста.", empty: "Пока нет опубликованных презентаций.", seller: "Продавец", license: "Условия лицензии", details: "Подробнее", back: "Назад в маркетплейс", more: "Загрузить ещё 10", signIn: "Войдите для оформления", sell: "Продать презентацию", choose: "Выберите презентацию", price: "Цена (UZS)", description: "Описание объявления", terms: "Условия лицензии", publish: "Опубликовать", myListings: "Мои объявления", published: "Объявление опубликовано", saved: "Настройка сохранена", pending: "Заказ создан, оплата ожидает подтверждения. Тестовая оплата отключена; покупка не завершена.", complete: "Покупка завершена", error: "Не удалось выполнить запрос. Попробуйте ещё раз.", noDecks: "Сначала создайте презентацию.", demo: "Демо-каталог — примеры. Покупки недоступны в демо-режиме.", demoPaid: "Демо: заказ и платёж не создавались." },
  uz: { shop: "Taqdimotlar marketpleysi", intro: "Tahrirlanadigan taqdimotlarni koʻring va soting.", category: "Turkum", all: "Barcha turkumlar", search: "Taqdimotlarni qidirish", add: "Savatga qoʻshish", added: "Qoʻshildi", remove: "Oʻchirish", cart: "Savat", checkout: "Buyurtmani rasmiylashtirish", payment: "Toʻlov", continue: "Davom etish", pay: "Buyurtma uchun toʻlash", sandbox: "Sinov toʻlovi", sandboxInfo: "Ishlab chiqish uchun sinov rejimi; operator yoqmaguncha tasdiqlash ishlamaydi.", total: "Jami", signInToPay: "Toʻlov uchun tizimga kiring", secureNote: "Hisob sessiyangiz himoyalangan; toʻlov maʼlumotlarini provayder qayta ishlaydi.", emptyCart: "Savatingiz boʻsh.", empty: "Hozircha chop etilgan taqdimotlar yoʻq.", seller: "Sotuvchi", license: "Litsenziya shartlari", details: "Batafsil", back: "Marketpleysga qaytish", more: "Yana 10 tasini yuklash", signIn: "Xarid uchun tizimga kiring", sell: "Taqdimot sotish", choose: "Taqdimotni tanlang", price: "Narxi (UZS)", description: "Eʼlon tavsifi", terms: "Litsenziya shartlari", publish: "Eʼlon qilish", myListings: "Eʼlonlarim", published: "Eʼlon chop etildi", saved: "Sozlama saqlandi", pending: "Buyurtma yaratildi, lekin toʻlov tasdiqlanmadi. Sinov toʻlovi oʻchiq; xarid yakunlanmadi.", complete: "Xarid yakunlandi", error: "Soʻrovni bajarib boʻlmadi. Qayta urinib koʻring.", noDecks: "Avval taqdimot yarating.", demo: "Namoyish katalogi — namunaviy mahsulotlar. Xaridlar mavjud emas.", demoPaid: "Namoyish: buyurtma va toʻlov yaratilmagan." },
};

const browseLabels = {
  en: {
    bannerTitle: "Ideas, ready for their next chapter.",
    bannerSubtitle: "Find a polished starting point for your next presentation.",
    searchAction: "Search",
    filters: "Filters",
    sort: "Sort by",
    latest: "Recently added",
    priceLow: "Price: low to high",
    priceHigh: "Price: high to low",
    minPrice: "Minimum · UZS",
    maxPrice: "Maximum · UZS",
    apply: "Apply filters",
    reset: "Reset",
    invalidRange: "Enter a valid price range.",
    purchases: "My purchases",
    noPurchases: "Your completed purchases will appear here.",
    openPurchase: "Open presentation",
    ready: "Purchased and ready to use",
    loading: "Loading purchases…",
    liveUnavailable: "Live payment methods are not connected yet.",
    liveMethods: "Not available yet",
    walletBalance: "Wallet balance",
    payFromBalance: "Pay from balance",
    topUpBalance: "Top up balance",
    insufficientBalance: "Your balance is too low. Add funds to finish this purchase.",
    sandboxWalletNotice: "Top-ups are simulated in sandbox mode. No real payment is made.",
  },
  ru: {
    bannerTitle: "Идеи для вашей следующей главы.",
    bannerSubtitle: "Найдите основу для сильной презентации.",
    searchAction: "Поиск",
    filters: "Фильтры",
    sort: "Сортировка",
    latest: "Сначала новые",
    priceLow: "Сначала дешевле",
    priceHigh: "Сначала дороже",
    minPrice: "Минимум · UZS",
    maxPrice: "Максимум · UZS",
    apply: "Применить фильтры",
    reset: "Сбросить",
    invalidRange: "Укажите корректный диапазон цены.",
    purchases: "Мои покупки",
    noPurchases: "Здесь появятся завершённые покупки.",
    openPurchase: "Открыть презентацию",
    ready: "Покупка доступна",
    loading: "Загрузка покупок…",
    liveUnavailable: "Онлайн-оплата пока не подключена.",
    liveMethods: "Пока недоступно",
    walletBalance: "Баланс кошелька",
    payFromBalance: "Оплатить с баланса",
    topUpBalance: "Пополнить баланс",
    insufficientBalance: "Недостаточно средств. Пополните баланс, чтобы завершить покупку.",
    sandboxWalletNotice: "Пополнение симулируется в тестовом режиме. Реальная оплата не выполняется.",
  },
  uz: {
    bannerTitle: "Keyingi gʻoyangiz uchun ilhom.",
    bannerSubtitle: "Yangi taqdimotingiz uchun tayyor asosni toping.",
    searchAction: "Qidirish",
    filters: "Filtrlar",
    sort: "Saralash",
    latest: "Yangi qoʻshilganlar",
    priceLow: "Arzonidan qimmatiga",
    priceHigh: "Qimmatidan arzoniga",
    minPrice: "Eng kam · UZS",
    maxPrice: "Eng koʻp · UZS",
    apply: "Filtrlarni qoʻllash",
    reset: "Tozalash",
    invalidRange: "Toʻgʻri narx oraligʻini kiriting.",
    purchases: "Xaridlarim",
    noPurchases: "Yakunlangan xaridlaringiz shu yerda koʻrinadi.",
    openPurchase: "Taqdimotni ochish",
    ready: "Xarid foydalanishga tayyor",
    loading: "Xaridlar yuklanmoqda…",
    liveUnavailable: "Onlayn toʻlov usullari hali ulanmagan.",
    liveMethods: "Hozircha mavjud emas",
    walletBalance: "Hamyon balansi",
    payFromBalance: "Balansdan toʻlash",
    topUpBalance: "Balansni toʻldirish",
    insufficientBalance: "Balansda mablagʻ yetarli emas. Xaridni yakunlash uchun balansni toʻldiring.",
    sandboxWalletNotice: "Balans sinov rejimida toʻldiriladi. Haqiqiy toʻlov olinmaydi.",
  },
};

const purchaseActionLabels = {
  en: {
    slideUnit: "slides",
    previewCount: "Previewing {visible} of {total} slides",
    lockedSlides: "{count} more slides are locked",
    lockedNote: "Purchase to unlock the complete presentation and downloads.",
    purchaseToUnlock: "Purchase to unlock",
    downloadPptx: "Download PPTX",
    downloadPdf: "Download PDF",
    exporting: "Preparing download…",
    exportReady: "Download started. A copy is saved in My presentations.",
    exportFailed: "Could not prepare the download. Please try again.",
    exportTimedOut: "This export is taking longer than expected. Check Purchases again shortly.",
  },
  ru: {
    slideUnit: "слайдов",
    previewCount: "Предпросмотр: {visible} из {total} слайдов",
    lockedSlides: "Ещё {count} слайдов закрыты",
    lockedNote: "Купите презентацию, чтобы открыть все слайды и скачивание.",
    purchaseToUnlock: "Купить и открыть",
    downloadPptx: "Скачать PPTX",
    downloadPdf: "Скачать PDF",
    exporting: "Готовим файл…",
    exportReady: "Скачивание началось. Копия сохранена в разделе презентаций.",
    exportFailed: "Не удалось подготовить файл. Попробуйте ещё раз.",
    exportTimedOut: "Экспорт занимает больше времени. Проверьте покупки чуть позже.",
  },
  uz: {
    slideUnit: "slayd",
    previewCount: "{total} slayddan {visible} tasi koʻrsatilmoqda",
    lockedSlides: "Yana {count} ta slayd qulflangan",
    lockedNote: "Barcha slaydlar va fayllarni ochish uchun taqdimotni xarid qiling.",
    purchaseToUnlock: "Xarid qilib ochish",
    downloadPptx: "PPTX yuklab olish",
    downloadPdf: "PDF yuklab olish",
    exporting: "Fayl tayyorlanmoqda…",
    exportReady: "Yuklab olish boshlandi. Nusxa taqdimotlaringizga saqlandi.",
    exportFailed: "Faylni tayyorlab boʻlmadi. Qayta urinib koʻring.",
    exportTimedOut: "Eksport uzoqroq davom etmoqda. Xaridlar boʻlimini keyinroq tekshiring.",
  },
};

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
    ? value.previewSlides.slice(0, 3).flatMap((slide): PreviewSlide[] => {
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
}: Props) {
  const t = categoryNames[locale];
  const b = { ...browseLabels[locale], ...purchaseActionLabels[locale] };
  const storageKey = `${MARKETPLACE_STORAGE_KEY}:${accountId ?? "anonymous"}`;
  const [categories, setCategories] = useState<Category[]>([]);
  const [savedState] = useState(() => readMarketplaceState(storageKey));
  const [category, setCategory] = useState(savedState.category);
  const [items, setItems] = useState<Product[]>([]);
  const [page, setPage] = useState(0);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState("");
  const [detail, setDetail] = useState<ProductDetail | null>(null);
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
  const [busy, setBusy] = useState(false);
  const [sellerListings, setSellerListings] = useState<Listing[]>([]);
  const [selectedPresentation, setSelectedPresentation] = useState("");
  const [listingDescription, setListingDescription] = useState("");
  const [licenseTerms, setLicenseTerms] = useState("");
  const [price, setPrice] = useState("10000");
  const [listingCategory, setListingCategory] = useState("");
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
  const translatedCategory = (slug: string) => {
    const category = categories.find((item) => item.slug === slug);
    if (locale === "ru") return category?.nameRu ?? ({ business: "Бизнес", education: "Образование", marketing: "Маркетинг", technology: "Технологии", other: "Другое" }[slug] ?? category?.name ?? slug);
    if (locale === "uz") return category?.nameUz ?? ({ business: "Biznes", education: "Ta’lim", marketing: "Marketing", technology: "Texnologiya", other: "Boshqa" }[slug] ?? category?.name ?? slug);
    return category?.name ?? slug;
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
      if (result) setDetail(result);
      return;
    }
    try {
      const response = await fetch(`${API_URL}/api/v1/catalog/${item.listingId}`);
      if (!response.ok) throw new Error();
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

  function addToCart(product: Product) {
    setCart((current) => current.some((item) => item.listingId === product.listingId)
      ? current
      : [...current, product]);
    setNotice(t.added);
  }

  if (detail) {
    const visibleSlideCount = Math.min(detail.previewSlides?.length ?? 0, 3);
    const totalSlideCount = Number.isSafeInteger(detail.slideCount) && detail.slideCount > 0
      ? detail.slideCount
      : visibleSlideCount;
    const lockedSlideCount = Math.max(0, totalSlideCount - visibleSlideCount);
    return (
      <section className="marketplace-page">
        <button className="text-button" type="button" onClick={() => setDetail(null)}><ArrowLeft size={16} />{t.back}</button>
        <div className="market-detail">
          <div className="market-detail-preview">
            <SlidePreviewCarousel title={detail.title} slides={detail.previewSlides?.slice(0, 3) ?? []} locale={locale} />
            <p className="market-preview-count">
              {b.previewCount.replace("{visible}", String(visibleSlideCount)).replace("{total}", String(totalSlideCount))}
            </p>
            {lockedSlideCount > 0 && (
              <div className="market-locked-preview">
                <div className="market-locked-thumbnails" aria-hidden="true">
                  {[0, 1, 2].map((slide) => <span key={slide}><LockKeyhole size={15} /></span>)}
                </div>
                <div>
                  <strong><LockKeyhole size={14} />{b.lockedSlides.replace("{count}", String(lockedSlideCount))}</strong>
                  <p>{b.lockedNote}</p>
                  <button className="secondary-button" type="button" onClick={() => { addToCart(detail); setDetail(null); setStage("cart"); }}>
                    {b.purchaseToUnlock}
                  </button>
                </div>
              </div>
            )}
          </div>
          <div>
            <span className="market-category">{translatedCategory(detail.category)}</span>
            <h1>{detail.title}</h1>
            <p>{detail.description}</p>
            <div className="market-seller-card"><Store size={17} /><div><small>{t.seller}</small><strong>{detail.sellerName}</strong></div></div>
            <p><strong>{t.license}:</strong> {detail.licenseTerms}</p>
            <strong className="market-price">{formatPrice(detail.priceTiyin, detail.currency, locale)}</strong>
            <button className="primary-button" type="button" onClick={() => { addToCart(detail); setDetail(null); setStage("cart"); }}>{t.add}</button>
          </div>
        </div>
      </section>
    );
  }

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
                  <div className="market-cart-line-preview"><SlidePreviewCarousel title={item.title} slides={item.previewSlides} locale={locale} compact /></div>
                  <div className="market-cart-line-copy"><strong>{item.title}</strong><small>{t.seller}: {item.sellerName}</small></div>
                  <strong>{formatPrice(item.priceTiyin, item.currency, locale)}</strong>
                  {stage === "cart" && <button className="text-button market-remove-button" type="button" aria-label={`${t.remove}: ${item.title}`} onClick={() => setCart((current) => current.filter((entry) => entry.listingId !== item.listingId))}><X size={15} aria-hidden="true" />{t.remove}</button>}
                </article>
              ))}
            </div>
            <div className="market-order-total"><span>{t.total}</span><strong>{formatPrice(cartTotal, cart[0]?.currency ?? "UZS", locale)}</strong></div>
            {stage === "cart" && <button className="primary-button" type="button" onClick={() => setStage("checkout")}>{t.continue}</button>}
            {stage === "checkout" && (
              <div className="market-checkout-panel">
                {cart[0] && <SlidePreviewCarousel title={cart[0].title} slides={cart[0].previewSlides} locale={locale} compact />}
                <h2>{t.checkout}</h2>
                <p>{t.secureNote}</p>
                <button className="primary-button" type="button" onClick={() => setStage("payment")}>{t.continue}</button>
              </div>
            )}
            {stage === "payment" && (
              <div className="market-checkout-panel">
                {cart[0] && <SlidePreviewCarousel title={cart[0].title} slides={cart[0].previewSlides} locale={locale} compact />}
                <h2>{t.payment}</h2>
                <p className="market-wallet-balance">
                  {b.walletBalance}: {walletBalanceTiyin === null ? "—" : formatPrice(walletBalanceTiyin, "UZS", locale)}
                </p>
                <p className="market-sandbox-notice">{b.sandboxWalletNotice}</p>
                {notice && <p className="market-notice" role="status">{notice}</p>}
                {error && <p className="form-error" role="alert">{error}</p>}
                <button className="primary-button" disabled={busy || (!demoMode && walletBalanceTiyin === null)} type="button" onClick={() => void checkout()}>
                  {busy ? <LoaderCircle className="spin-icon" size={15} /> : null}
                  {token
                    ? !demoMode && walletBalanceTiyin !== null && walletBalanceTiyin < cartTotal ? b.topUpBalance : b.payFromBalance
                    : t.signInToPay}
                </button>
              </div>
            )}
            {stage !== "payment" && notice && <p className="market-notice" role="status">{notice}</p>}
          </>
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
      <div className="marketplace-banner">
        <div>
          <span className="eyebrow"><Store size={14} />{t.shop}</span>
          <h1 id="marketplace-title">{b.bannerTitle}</h1>
          <p>{b.bannerSubtitle}</p>
        </div>
        <BookOpen size={42} aria-hidden="true" />
      </div>
      {demoMode && <p className="market-demo-banner" role="status">{t.demo}</p>}
      <div className="market-toolbar">
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
        <button className="cart-button market-cart-action" type="button" onClick={() => setStage("cart")} aria-label={cart.length ? `${t.cart}, ${cart.length}` : t.cart}><ShoppingBag size={17} /><span>{t.cart}</span>{cart.length > 0 && <span className="market-cart-badge" aria-hidden="true">{cart.length}</span>}</button>
      </div>
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
          const visibleSlideCount = Math.min(item.previewSlides?.length ?? 0, 3);
          const totalSlideCount = Number.isSafeInteger(item.slideCount) && item.slideCount > 0
            ? item.slideCount
            : visibleSlideCount;
          const lockedSlideCount = Math.max(0, totalSlideCount - visibleSlideCount);
          return <article className="market-card" key={item.listingId}>
            <SlidePreviewCarousel title={item.title} slides={item.previewSlides?.slice(0, 3) ?? []} locale={locale} compact />
            <div className="market-card-copy">
              <span className="market-category">{translatedCategory(item.category)}</span>
              <h2>{item.title}</h2>
              <p>{item.description}</p>
              <small>{t.seller}: {item.sellerName}</small>
              <small className="market-preview-count">
                {b.previewCount.replace("{visible}", String(visibleSlideCount)).replace("{total}", String(totalSlideCount))}
              </small>
              {lockedSlideCount > 0 && <small className="market-locked-count"><LockKeyhole size={12} />{b.lockedSlides.replace("{count}", String(lockedSlideCount))}</small>}
              <strong className="market-price">{formatPrice(item.priceTiyin, item.currency, locale)}</strong>
              <div className="market-card-actions">
                <button type="button" className="text-button" onClick={() => void showDetail(item)}>{t.details}<ArrowRight size={14} /></button>
                <button type="button" className="primary-button" aria-label={`${t.add}: ${item.title}`} onClick={() => addToCart(item)}>
                  {cart.some((product) => product.listingId === item.listingId) ? <><Check size={15} />{t.added}</> : t.add}
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
            <div className="market-filter-heading"><div><span className="eyebrow"><Filter size={14} />{b.filters}</span><h2 id="market-filter-title">{b.filters}</h2></div><button type="button" aria-label={b.reset} onClick={() => setFilterOpen(false)}><X size={18} /></button></div>
            <label>{t.category}<select value={draftCategory} onChange={(event) => setDraftCategory(event.target.value)}><option value="">{t.all}</option>{categories.map((item) => <option key={item.slug} value={item.slug}>{translatedCategory(item.slug)}</option>)}</select></label>
            <label>{b.sort}<select value={draftSort} onChange={(event) => setDraftSort(event.target.value)}><option value="latest">{b.latest}</option><option value="price_asc">{b.priceLow}</option><option value="price_desc">{b.priceHigh}</option></select></label>
            <div className="market-price-filters">
              <label>{b.minPrice}<input inputMode="decimal" value={draftMinimum} onChange={(event) => setDraftMinimum(event.target.value)} /></label>
              <label>{b.maxPrice}<input inputMode="decimal" value={draftMaximum} onChange={(event) => setDraftMaximum(event.target.value)} /></label>
            </div>
            {filterError && <p className="form-error" role="alert">{filterError}</p>}
            <div className="market-filter-actions"><button className="text-button" type="button" onClick={resetFilters}>{b.reset}</button><button className="primary-button" type="button" onClick={applyFilters}>{b.apply}</button></div>
          </section>
        </div>
      )}
      <div className="seller-panel">
        <h2><Store size={19} />{t.sell}</h2>
        {token ? presentations.length ? <form className="seller-form" onSubmit={(event) => void publishListing(event)}>
          <label>{t.choose}<select required value={selectedPresentation} onChange={(e) => setSelectedPresentation(e.target.value)}><option value="">—</option>{presentations.map((p) => <option key={p.id} value={p.id}>{p.title} · v{p.currentVersion}</option>)}</select></label>
          <label>{t.category}<select required value={listingCategory} onChange={(e) => setListingCategory(e.target.value)}><option value="">—</option>{categories.map((c) => <option key={c.slug} value={c.slug}>{translatedCategory(c.slug)}</option>)}</select></label>
          <label>{t.price}<input type="number" min="1" step="1" required value={price} onChange={(e) => setPrice(e.target.value)} /></label>
          <label>{t.description}<textarea required maxLength={20000} value={listingDescription} onChange={(e) => setListingDescription(e.target.value)} /></label>
          <label>{t.terms}<textarea required maxLength={20000} value={licenseTerms} onChange={(e) => setLicenseTerms(e.target.value)} /></label>
          <button className="primary-button" type="submit" disabled={busy || !categories.some((item) => item.slug === listingCategory)}>{t.publish}</button>
        </form> : <p>{t.noDecks}</p> : <button className="secondary-button" type="button" onClick={onRequireAuth}>{t.signIn}</button>}
        {sellerListings.length > 0 && <div className="seller-listings"><h3>{t.myListings}</h3>{sellerListings.map((item) => <div key={item.id}><span>{item.title}</span><span>{item.status}</span></div>)}</div>}
      </div>
    </section>
  );
}
