import { translations, type Locale } from "./translations";

export { translations };
export type { Locale, Translations } from "./translations";

const localeOrder: readonly Locale[] = ["uz", "en", "ru"];
const localeStorageKey = "slideforge.locale";

export function readLocalePreference(): Locale {
  try {
    const stored = window.localStorage.getItem(localeStorageKey);
    if (stored === "en" || stored === "ru" || stored === "uz") return stored;
  } catch (error) {
    console.warn("Could not read the saved language preference.", error);
  }
  return "uz";
}

export function saveLocalePreference(locale: Locale): void {
  try {
    window.localStorage.setItem(localeStorageKey, locale);
  } catch (error) {
    console.warn("Could not save the language preference.", error);
  }
}

export function nextLocale(current: Locale): Locale {
  const index = localeOrder.indexOf(current);
  return localeOrder[(index + 1) % localeOrder.length];
}

export const marketplaceCategoryTranslations = {
  en: {
    marketplace: "Marketplace",
    title: "Marketplace categories",
    intro: "Create and manage the categories shown in every storefront language.",
    slug: "URL slug",
    nameEn: "English name",
    nameRu: "Russian name",
    nameUz: "Uzbek name",
    add: "Add category",
    adding: "Adding…",
    status: "Status",
    action: "Action",
    active: "Active",
    inactive: "Inactive",
    deactivate: "Deactivate",
    activate: "Activate",
    empty: "No categories yet.",
    error: "Could not load or update categories.",
    sessionExpired: "Session expired. Sign in again.",
  },
  ru: {
    marketplace: "Маркетплейс",
    title: "Категории маркетплейса",
    intro: "Создавайте и управляйте категориями на всех языках магазина.",
    slug: "Код категории",
    nameEn: "Название на английском",
    nameRu: "Название на русском",
    nameUz: "Название на узбекском",
    add: "Добавить категорию",
    adding: "Добавление…",
    status: "Статус",
    action: "Действие",
    active: "Активна",
    inactive: "Неактивна",
    deactivate: "Отключить",
    activate: "Включить",
    empty: "Категорий пока нет.",
    error: "Не удалось загрузить или изменить категории.",
    sessionExpired: "Сессия истекла. Войдите снова.",
  },
  uz: {
    marketplace: "Marketpleys",
    title: "Marketpleys turkumlari",
    intro: "Dökonning barça tillarida körsatiladigan turkumlarni boşqaring.",
    slug: "Turkum kodi",
    nameEn: "Inglizça nomi",
    nameRu: "Rusça nomi",
    nameUz: "Özbekça nomi",
    add: "Turkum qöşiş",
    adding: "Qöşilmoqda…",
    status: "Holati",
    action: "Amal",
    active: "Faol",
    inactive: "Faol emas",
    deactivate: "Faolsizlantiriş",
    activate: "Faollaştiriş",
    empty: "Hozirça turkumlar yöq.",
    error: "Turkumlarni yuklab yoki özgartirib bölmadi.",
    sessionExpired: "Sessiya muddati tugadi. Qayta kiring.",
  },
} satisfies Record<Locale, Record<string, string>>;

export const marketplaceMonitoringTranslations = {
  en: {
    marketplace: "Marketplace",
    title: "Seller listings",
    intro: "Monitor seller listings and suspend or restore catalog visibility.",
    loading: "Loading…",
    empty: "No listings yet.",
    loadError: "Could not load listings.",
    updateError: "Could not update listing.",
    actionError: "Action failed.",
    sessionExpired: "Session expired. Sign in again.",
    presentation: "Presentation",
    seller: "Seller",
    category: "Category",
    price: "Price",
    status: "Status",
    action: "Action",
    suspend: "Suspend",
    publish: "Publish",
    publishedStatus: "Published",
    suspendedStatus: "Suspended",
    archivedStatus: "Archived",
    rejectedStatus: "Rejected",
    pendingStatus: "Pending",
  },
  ru: {
    marketplace: "Маркетплейс",
    title: "Объявления продавцов",
    intro: "Просмотр и модерация опубликованных и ожидающих объявлений.",
    loading: "Загрузка…",
    empty: "Объявлений пока нет.",
    loadError: "Не удалось загрузить объявления.",
    updateError: "Не удалось изменить объявление.",
    actionError: "Ошибка действия.",
    sessionExpired: "Сессия истекла. Войдите снова.",
    presentation: "Презентация",
    seller: "Продавец",
    category: "Категория",
    price: "Цена",
    status: "Статус",
    action: "Действие",
    suspend: "Приостановить",
    publish: "Опубликовать",
    publishedStatus: "Опубликовано",
    suspendedStatus: "Приостановлено",
    archivedStatus: "В архиве",
    rejectedStatus: "Отклонено",
    pendingStatus: "Ожидает",
  },
  uz: {
    marketplace: "Marketpleys",
    title: "Sotuvçi eʼlonlari",
    intro: "Sotuvçilar eʼlonlarini kuzating va katalogda körinişini boşqaring.",
    loading: "Yuklanmoqda…",
    empty: "Hozirça eʼlonlar yöq.",
    loadError: "Eʼlonlarni yuklab bölmadi.",
    updateError: "Eʼlonni yangilab bölmadi.",
    actionError: "Amalni bajarib bölmadi.",
    sessionExpired: "Sessiya muddati tugadi. Qayta kiring.",
    presentation: "Taqdimot",
    seller: "Sotuvçi",
    category: "Turkum",
    price: "Narxi",
    status: "Holati",
    action: "Amal",
    suspend: "Töxtatiş",
    publish: "Çop etiş",
    publishedStatus: "Çop etilgan",
    suspendedStatus: "Töxtatilgan",
    archivedStatus: "Arxivlangan",
    rejectedStatus: "Rad etilgan",
    pendingStatus: "Kutilmoqda",
  },
} satisfies Record<Locale, Record<string, string>>;
