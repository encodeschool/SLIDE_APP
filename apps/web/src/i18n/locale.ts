export type Locale = "en" | "ru" | "uz";

export const DEFAULT_LOCALE: Locale = "uz";

const localeOrder: readonly Locale[] = ["uz", "en", "ru"];
const localeStorageKey = "slideforge.locale";

export function readLocalePreference(): Locale {
  try {
    const stored = window.localStorage.getItem(localeStorageKey);
    if (stored === "en" || stored === "ru" || stored === "uz") return stored;
  } catch (error) {
    console.warn("Could not read the saved language preference.", error);
  }
  return DEFAULT_LOCALE;
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
