"use client";

import { useState, useRef, useEffect } from "react";
import { Globe, Check } from "lucide-react";
import { useT } from "@/lib/i18n/LanguageProvider";
import { LOCALES, LOCALE_NAMES, LOCALE_FLAGS, type Locale } from "@/lib/i18n/dictionaries";

export function LanguageSwitcher() {
  const { locale, setLocale } = useT();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-sm text-gray-400 hover:text-gold-light hover:bg-white/5 transition-colors"
        aria-label="Sprache wechseln / Change language"
      >
        <Globe className="w-4 h-4" />
        <span className="hidden md:inline text-xs uppercase">{locale}</span>
        <span className="md:hidden">{LOCALE_FLAGS[locale]}</span>
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-44 bg-navy/95 backdrop-blur-md border border-white/10 rounded-xl shadow-2xl overflow-hidden z-50">
          {LOCALES.map((l: Locale) => (
            <button
              key={l}
              onClick={() => {
                setLocale(l);
                setOpen(false);
              }}
              className={`w-full px-3 py-2 flex items-center gap-3 text-sm hover:bg-white/5 transition-colors ${
                l === locale ? "text-gold" : "text-gray-300"
              }`}
            >
              <span className="text-base">{LOCALE_FLAGS[l]}</span>
              <span className="flex-1 text-left">{LOCALE_NAMES[l]}</span>
              {l === locale && <Check className="w-3.5 h-3.5" />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
