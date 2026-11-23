export type Locale = "en" | "bn";

const dictionaries = {
  en: {
    home: "Home",
    explore: "Explore",
    myLibrary: "My Library",
    profile: "Profile",
    settings: "Settings",
    search: "Search",
    login: "Log in",
    register: "Create account",
  },
  bn: {
    home: "হোম",
    explore: "অনুসন্ধান",
    myLibrary: "আমার লাইব্রেরি",
    profile: "প্রোফাইল",
    settings: "সেটিংস",
    search: "অনুসন্ধান",
    login: "লগ ইন",
    register: "অ্যাকাউন্ট তৈরি",
  },
} as const;

export function getLocale(): Locale {
  if (typeof window === "undefined") return "en";
  const value = window.localStorage.getItem("library_locale");
  return value === "bn" ? "bn" : "en";
}

export function setLocale(locale: Locale) {
  if (typeof window !== "undefined") window.localStorage.setItem("library_locale", locale);
}

export function t(key: keyof typeof dictionaries.en, locale: Locale = getLocale()) {
  return dictionaries[locale]?.[key] ?? dictionaries.en[key];
}
