"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Sparkles, Clock, TrendingUp } from "lucide-react";

interface SearchInputProps {
  size?: "default" | "large";
  initialValue?: string;
  autoFocus?: boolean;
  onDropdownChange?: (open: boolean) => void;
}

// Multilingual example queries — shown as autocomplete suggestions
const EXAMPLE_QUERIES = [
  // German
  { text: "Segelboot chartern Kroatien 4 Personen", lang: "de" },
  { text: "Katamaran mieten Mallorca unter 5000€", lang: "de" },
  { text: "Yacht kaufen Mittelmeer", lang: "de" },
  { text: "Motorboot Ibiza Party 20 Gäste", lang: "de" },
  { text: "Gulet mieten Türkei 8 Personen Woche", lang: "de" },
  { text: "Familienboot Griechenland 6 Kabinen", lang: "de" },
  { text: "Luxusyacht Dubai 12 Gäste", lang: "de" },
  // English
  { text: "Catamaran charter Greece 8 guests under €10,000", lang: "en" },
  { text: "Luxury yacht Miami weekend", lang: "en" },
  { text: "Sailing boat Croatia family vacation", lang: "en" },
  { text: "Superyacht Monaco Grand Prix", lang: "en" },
  { text: "Houseboat Amsterdam 4 people", lang: "en" },
  { text: "Boat rental Amalfi Coast Italy", lang: "en" },
  { text: "Catamaran BVI all inclusive crewed", lang: "en" },
  // French
  { text: "Location catamaran Corse 6 personnes", lang: "fr" },
  { text: "Yacht luxe Saint-Tropez", lang: "fr" },
  { text: "Voilier location Grèce pas cher", lang: "fr" },
  // Spanish
  { text: "Alquiler barco Ibiza 10 personas", lang: "es" },
  { text: "Catamarán alquiler Mallorca semanal", lang: "es" },
  // Italian
  { text: "Noleggio barca Sardegna 8 persone", lang: "it" },
  { text: "Yacht lusso Costiera Amalfitana", lang: "it" },
];

// Rotating placeholder texts in multiple languages
const PLACEHOLDERS = [
  "Describe your perfect boat experience...",
  "Beschreibe dein perfektes Boot-Erlebnis...",
  "Katamaran chartern Kroatien 8 Personen...",
  "Luxury yacht charter Greece under €20,000...",
  "Location voilier Corse 6 personnes...",
  "Segelboot mieten Mallorca Familie...",
  "Superyacht Dubai 12 guests...",
  "Alquiler catamarán Ibiza 10 personas...",
  "Motor yacht buy Mediterranean...",
  "Gulet mieten Türkei 2 Wochen...",
];

export function SearchInput({ size = "default", initialValue = "", autoFocus = false, onDropdownChange }: SearchInputProps) {
  const [query, setQuery] = useState(initialValue);
  const [focused, setFocused] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [placeholderIdx, setPlaceholderIdx] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  // Rotate placeholder text
  useEffect(() => {
    if (query) return;
    const interval = setInterval(() => {
      setPlaceholderIdx((i) => (i + 1) % PLACEHOLDERS.length);
    }, 3000);
    return () => clearInterval(interval);
  }, [query]);

  const handleSubmit = useCallback(() => {
    const trimmed = query.trim();
    if (!trimmed) return;
    setShowSuggestions(false);
    router.push(`/search?q=${encodeURIComponent(trimmed)}`);
  }, [query, router]);

  const handleSelect = useCallback((text: string) => {
    setQuery(text);
    setShowSuggestions(false);
    router.push(`/search?q=${encodeURIComponent(text)}`);
  }, [router]);

  // Filter suggestions based on input
  const suggestions = query.length >= 2
    ? EXAMPLE_QUERIES.filter((eq) =>
        eq.text.toLowerCase().includes(query.toLowerCase()) ||
        query.toLowerCase().split(" ").some((word) =>
          word.length >= 2 && eq.text.toLowerCase().includes(word)
        )
      ).slice(0, 6)
    : [];

  // Show trending when focused with empty/short query
  const trendingQueries = EXAMPLE_QUERIES.slice(0, 5);

  const dropdownVisible = showSuggestions && focused && (suggestions.length > 0 || query.length < 2);
  useEffect(() => {
    onDropdownChange?.(dropdownVisible);
  }, [dropdownVisible, onDropdownChange]);

  const isLarge = size === "large";

  return (
    <div
      className={`
        relative w-full group
        ${focused ? "scale-[1.01]" : "scale-100"}
        transition-transform duration-300 ease-out
      `}
    >
      <div
        className={`
          relative flex items-center w-full rounded-2xl
          bg-white/[0.06] border
          ${focused ? "border-gold/40 shadow-[0_0_30px_rgba(200,165,90,0.08)]" : "border-white/[0.08]"}
          hover:border-white/[0.12]
          transition-all duration-300
          ${isLarge ? "px-6 py-5" : "px-4 py-3"}
        `}
        onClick={() => inputRef.current?.focus()}
      >
        <Sparkles
          className={`${isLarge ? "w-5 h-5" : "w-4 h-4"} text-gold/60 mr-3 flex-shrink-0`}
        />
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setShowSuggestions(true);
          }}
          onFocus={() => {
            setFocused(true);
            setShowSuggestions(true);
          }}
          onBlur={() => {
            setFocused(false);
            setTimeout(() => setShowSuggestions(false), 200);
          }}
          onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
          placeholder={PLACEHOLDERS[placeholderIdx]}
          autoFocus={autoFocus}
          className={`
            flex-1 bg-transparent outline-none
            text-white placeholder:text-gray-500
            ${isLarge ? "text-lg md:text-xl" : "text-base"}
          `}
        />
        <button
          onClick={handleSubmit}
          disabled={!query.trim()}
          className={`
            flex-shrink-0 ml-3 rounded-xl
            gold-gradient text-navy font-medium
            disabled:opacity-30 disabled:cursor-not-allowed
            hover:shadow-[0_0_20px_rgba(200,165,90,0.3)]
            active:scale-95
            transition-all duration-200
            ${isLarge ? "px-6 py-3 text-base" : "px-4 py-2 text-sm"}
          `}
        >
          <span className="hidden sm:inline mr-2">Discover</span>
          <ArrowRight className={`${isLarge ? "w-5 h-5" : "w-4 h-4"} inline`} />
        </button>
      </div>

      {/* Suggestions dropdown */}
      {showSuggestions && focused && (
        <div className="absolute left-0 right-0 top-full mt-2 z-50 rounded-2xl bg-[#1a2332] border border-white/[0.08] shadow-2xl overflow-hidden">
          {suggestions.length > 0 ? (
            <>
              <div className="px-4 py-2 text-xs text-gray-500 uppercase tracking-wider border-b border-white/[0.04]">
                Vorschläge
              </div>
              {suggestions.map((s, i) => (
                <button
                  key={i}
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => handleSelect(s.text)}
                  className="w-full text-left px-4 py-3 text-sm text-gray-300 hover:bg-white/[0.04] hover:text-white flex items-center gap-3 transition-colors"
                >
                  <Sparkles className="w-3.5 h-3.5 text-gold/40 shrink-0" />
                  <span>{s.text}</span>
                  <span className="ml-auto text-xs text-gray-600 uppercase">{s.lang}</span>
                </button>
              ))}
            </>
          ) : query.length < 2 ? (
            <>
              <div className="px-4 py-2 text-xs text-gray-500 uppercase tracking-wider border-b border-white/[0.04] flex items-center gap-2">
                <TrendingUp className="w-3 h-3" />
                Beliebte Suchen
              </div>
              {trendingQueries.map((s, i) => (
                <button
                  key={i}
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => handleSelect(s.text)}
                  className="w-full text-left px-4 py-3 text-sm text-gray-300 hover:bg-white/[0.04] hover:text-white flex items-center gap-3 transition-colors"
                >
                  <Clock className="w-3.5 h-3.5 text-gray-600 shrink-0" />
                  <span>{s.text}</span>
                  <span className="ml-auto text-xs text-gray-600 uppercase">{s.lang}</span>
                </button>
              ))}
            </>
          ) : null}
        </div>
      )}

      {focused && (
        <div className="absolute inset-0 -z-10 rounded-2xl bg-gold/[0.03] blur-xl" />
      )}
    </div>
  );
}
