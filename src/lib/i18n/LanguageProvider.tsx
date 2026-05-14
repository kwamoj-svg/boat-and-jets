"use client";

import { createContext, useContext, useEffect, useState, useCallback } from "react";
import {
  DEFAULT_LOCALE,
  LOCALES,
  type Locale,
  lookup,
} from "./dictionaries";

interface LanguageContextValue {
  locale: Locale;
  setLocale: (l: Locale) => void;
  t: (key: string, vars?: Record<string, string | number>) => string;
}

const LanguageContext = createContext<LanguageContextValue | null>(null);

const STORAGE_KEY = "veliqa.locale";
const COOKIE_KEY = "NEXT_LOCALE";

function readInitialLocale(): Locale {
  if (typeof window === "undefined") return DEFAULT_LOCALE;
  // 1) localStorage (user's last choice)
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved && (LOCALES as string[]).includes(saved)) return saved as Locale;
  } catch { /* ignore */ }
  // 2) Browser language
  const nav = window.navigator?.language?.toLowerCase() || "";
  for (const l of LOCALES) {
    if (nav.startsWith(l)) return l;
  }
  return DEFAULT_LOCALE;
}

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  // Start with default so SSR matches; client adjusts on mount
  const [locale, setLocaleState] = useState<Locale>(DEFAULT_LOCALE);

  useEffect(() => {
    const initial = readInitialLocale();
    if (initial !== locale) setLocaleState(initial);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const setLocale = useCallback((l: Locale) => {
    setLocaleState(l);
    try {
      localStorage.setItem(STORAGE_KEY, l);
      document.cookie = `${COOKIE_KEY}=${l}; path=/; max-age=31536000; SameSite=Lax`;
      // Update <html lang>
      document.documentElement.lang = l;
    } catch { /* ignore */ }
  }, []);

  const t = useCallback(
    (key: string, vars?: Record<string, string | number>) => lookup(locale, key, vars),
    [locale]
  );

  return (
    <LanguageContext.Provider value={{ locale, setLocale, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useT() {
  const ctx = useContext(LanguageContext);
  if (!ctx) {
    // Fallback when used outside provider — just default-locale lookup
    return {
      locale: DEFAULT_LOCALE,
      setLocale: () => {},
      t: (key: string, vars?: Record<string, string | number>) =>
        lookup(DEFAULT_LOCALE, key, vars),
    };
  }
  return ctx;
}
