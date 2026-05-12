"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Sparkles, Clock, TrendingUp, MapPin, Ship } from "lucide-react";
import { getSuggestions, type Suggestion } from "@/lib/search-suggestions";

interface SearchInputProps {
  size?: "default" | "large";
  initialValue?: string;
  autoFocus?: boolean;
  onDropdownChange?: (open: boolean) => void;
}

// Multilingual example queries — shown as trending when no query
const EXAMPLE_QUERIES = [
  { text: "Segelboot chartern Kroatien 4 Personen", lang: "de" },
  { text: "Katamaran mieten Mallorca unter 5000€", lang: "de" },
  { text: "Yacht kaufen Mittelmeer", lang: "de" },
  { text: "Motorboot Ibiza Party 20 Gäste", lang: "de" },
  { text: "Gulet mieten Türkei 8 Personen Woche", lang: "de" },
];

// Rotating placeholder texts
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

function SuggestionIcon({ icon }: { icon: Suggestion["icon"] }) {
  switch (icon) {
    case "map":
      return <MapPin className="w-3.5 h-3.5 text-gold/50 shrink-0" />;
    case "ship":
      return <Ship className="w-3.5 h-3.5 text-ocean-light/60 shrink-0" />;
    case "sparkles":
      return <Sparkles className="w-3.5 h-3.5 text-gold/40 shrink-0" />;
  }
}

function CategoryLabel({ category }: { category: Suggestion["category"] }) {
  const labels: Record<Suggestion["category"], string> = {
    destination: "Ziel",
    type: "Bootstyp",
    popular: "Beliebt",
  };
  return (
    <span className="ml-auto text-[10px] text-gray-600 uppercase tracking-wider px-1.5 py-0.5 rounded bg-white/[0.03]">
      {labels[category]}
    </span>
  );
}

/**
 * Highlight matching portions of the suggestion text.
 */
function HighlightedText({ text, query }: { text: string; query: string }) {
  if (!query.trim()) return <span>{text}</span>;

  const words = query.toLowerCase().trim().split(/\s+/).filter((w) => w.length >= 2);
  if (words.length === 0) return <span>{text}</span>;

  // Build a regex matching any query word
  const escaped = words.map((w) => w.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
  const regex = new RegExp(`(${escaped.join("|")})`, "gi");

  const parts = text.split(regex);
  return (
    <span>
      {parts.map((part, i) =>
        regex.test(part) ? (
          <span key={i} className="text-gold font-medium">
            {part}
          </span>
        ) : (
          <span key={i}>{part}</span>
        )
      )}
    </span>
  );
}

export function SearchInput({ size = "default", initialValue = "", autoFocus = false, onDropdownChange }: SearchInputProps) {
  const [query, setQuery] = useState(initialValue);
  const [focused, setFocused] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [placeholderIdx, setPlaceholderIdx] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  // Rotate placeholder text
  useEffect(() => {
    if (query) return;
    const interval = setInterval(() => {
      setPlaceholderIdx((i) => (i + 1) % PLACEHOLDERS.length);
    }, 3000);
    return () => clearInterval(interval);
  }, [query]);

  // Close on click outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setShowSuggestions(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSubmit = useCallback(() => {
    const trimmed = query.trim();
    if (!trimmed) return;
    setShowSuggestions(false);
    router.push(`/search?q=${encodeURIComponent(trimmed)}`);
  }, [query, router]);

  const handleSelect = useCallback((text: string) => {
    setQuery(text);
    setShowSuggestions(false);
    setActiveIndex(-1);
    router.push(`/search?q=${encodeURIComponent(text)}`);
  }, [router]);

  // Get smart suggestions from our module
  const suggestions: Suggestion[] = query.length >= 1 ? getSuggestions(query) : [];

  // Show trending when focused with empty query
  const trendingQueries = EXAMPLE_QUERIES.slice(0, 5);

  const dropdownVisible = showSuggestions && focused && (suggestions.length > 0 || query.length < 1);
  useEffect(() => {
    onDropdownChange?.(dropdownVisible);
  }, [dropdownVisible, onDropdownChange]);

  // Items currently shown in dropdown
  const dropdownItems = suggestions.length > 0 ? suggestions : [];
  const showTrending = query.length < 1 && focused && showSuggestions;

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Escape") {
        setShowSuggestions(false);
        setActiveIndex(-1);
        return;
      }

      if (!dropdownVisible) {
        if (e.key === "Enter") handleSubmit();
        return;
      }

      const itemCount = showTrending ? trendingQueries.length : dropdownItems.length;

      if (e.key === "ArrowDown") {
        e.preventDefault();
        setActiveIndex((prev) => (prev + 1) % itemCount);
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setActiveIndex((prev) => (prev <= 0 ? itemCount - 1 : prev - 1));
      } else if (e.key === "Enter") {
        e.preventDefault();
        if (activeIndex >= 0) {
          const selected = showTrending
            ? trendingQueries[activeIndex]?.text
            : dropdownItems[activeIndex]?.text;
          if (selected) handleSelect(selected);
        } else {
          handleSubmit();
        }
      }
    },
    [dropdownVisible, activeIndex, dropdownItems, showTrending, trendingQueries, handleSelect, handleSubmit]
  );

  // Reset active index when suggestions change
  useEffect(() => {
    setActiveIndex(-1);
  }, [query]);

  const isLarge = size === "large";

  return (
    <div
      ref={containerRef}
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
          }}
          onKeyDown={handleKeyDown}
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
      {dropdownVisible && (
        <div className="absolute left-0 right-0 top-full mt-2 z-50 rounded-2xl bg-[#0f1a2e]/95 backdrop-blur-xl border border-white/[0.08] shadow-2xl overflow-hidden animate-fade-in">
          {suggestions.length > 0 ? (
            <>
              <div className="px-4 py-2 text-xs text-gray-500 uppercase tracking-wider border-b border-white/[0.04]">
                Vorschläge
              </div>
              {suggestions.map((s, i) => (
                <button
                  key={`${s.text}-${i}`}
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => handleSelect(s.text)}
                  onMouseEnter={() => setActiveIndex(i)}
                  className={`
                    w-full text-left px-4 py-3 text-sm text-gray-300
                    flex items-center gap-3 transition-colors
                    ${activeIndex === i ? "bg-white/[0.06] text-white" : "hover:bg-white/[0.04] hover:text-white"}
                  `}
                >
                  <SuggestionIcon icon={s.icon} />
                  <span className="flex-1">
                    <HighlightedText text={s.text} query={query} />
                  </span>
                  <CategoryLabel category={s.category} />
                </button>
              ))}
            </>
          ) : showTrending ? (
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
                  onMouseEnter={() => setActiveIndex(i)}
                  className={`
                    w-full text-left px-4 py-3 text-sm text-gray-300
                    flex items-center gap-3 transition-colors
                    ${activeIndex === i ? "bg-white/[0.06] text-white" : "hover:bg-white/[0.04] hover:text-white"}
                  `}
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
