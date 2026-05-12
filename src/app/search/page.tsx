"use client";

import { useEffect, useState, useCallback, useMemo, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { Navbar } from "@/components/Navbar";
import { SearchInput } from "@/components/SearchInput";
import { QueryInsight } from "@/components/QueryInsight";
import { ListingCard } from "@/components/ListingCard";
import { SearchLoading } from "@/components/SearchLoading";
import {
  SlidersHorizontal,
  ArrowUpDown,
  X,
  ChevronDown,
  Ship,
  Users,
  MapPin,
  Euro,
  Ruler,
  Anchor,
  UserCheck,
  Search,
} from "lucide-react";
import type { ExtractedListing } from "@/lib/claude-ai";

interface ParsedQuery {
  intent: string;
  region?: string;
  country?: string;
  city?: string;
  budget_max?: number;
  budget_per_day?: number;
  currency: string;
  boat_type?: string;
  guests?: number;
  date?: string;
  style?: string;
  keywords: string[];
  corrected_query?: string;
  optimized_search_query?: string;
}

interface LocationData {
  address: string;
  lat: number;
  lng: number;
  marinas: { name: string; address: string; rating?: number }[];
}

type SortKey = "match" | "price_asc" | "price_desc" | "guests" | "length";

const SORTS: { key: SortKey; label: string }[] = [
  { key: "match", label: "Best Match" },
  { key: "price_asc", label: "Preis: Niedrig → Hoch" },
  { key: "price_desc", label: "Preis: Hoch → Niedrig" },
  { key: "guests", label: "Meiste Gäste" },
  { key: "length", label: "Größte Boote" },
];

const BOAT_TYPES = ["motor", "sailing", "catamaran", "superyacht", "speedboat", "gulet"];
const PRICE_RANGES = [
  { label: "Alle Preise", min: 0, max: Infinity },
  { label: "Unter €5.000/W", min: 0, max: 5000 },
  { label: "€5.000 – €15.000/W", min: 5000, max: 15000 },
  { label: "€15.000 – €50.000/W", min: 15000, max: 50000 },
  { label: "€50.000 – €100.000/W", min: 50000, max: 100000 },
  { label: "Über €100.000/W", min: 100000, max: Infinity },
];
const GUEST_RANGES = [
  { label: "Alle", min: 0 },
  { label: "1–4 Gäste", min: 1, max: 4 },
  { label: "5–8 Gäste", min: 5, max: 8 },
  { label: "9–12 Gäste", min: 9, max: 12 },
  { label: "13+ Gäste", min: 13 },
];
const LENGTH_RANGES = [
  { label: "Alle Längen", min: 0, max: Infinity },
  { label: "Unter 10m", min: 0, max: 32.8 },
  { label: "10–15m", min: 32.8, max: 49.2 },
  { label: "15–20m", min: 49.2, max: 65.6 },
  { label: "20–30m", min: 65.6, max: 98.4 },
  { label: "Über 30m", min: 98.4, max: Infinity },
];
const CABIN_RANGES = [
  { label: "Alle", min: 0, max: Infinity },
  { label: "1–2 Kabinen", min: 1, max: 2 },
  { label: "3–4 Kabinen", min: 3, max: 4 },
  { label: "5+ Kabinen", min: 5, max: Infinity },
];
const CREW_OPTIONS = [
  { label: "Alle", value: "all" },
  { label: "Mit Crew", value: "with" },
  { label: "Ohne Crew", value: "without" },
];

function getPrice(l: ExtractedListing): number {
  return l.price_per_week || (l.price_per_day ? l.price_per_day * 7 : 0) || l.sale_price || 0;
}

function applySorting(listings: ExtractedListing[], sort: SortKey): ExtractedListing[] {
  const sorted = [...listings];
  switch (sort) {
    case "match": sorted.sort((a, b) => (b.match_score ?? 0) - (a.match_score ?? 0)); break;
    case "price_asc": sorted.sort((a, b) => (getPrice(a) || Infinity) - (getPrice(b) || Infinity)); break;
    case "price_desc": sorted.sort((a, b) => (getPrice(b) || 0) - (getPrice(a) || 0)); break;
    case "guests": sorted.sort((a, b) => (b.guests ?? 0) - (a.guests ?? 0)); break;
    case "length": sorted.sort((a, b) => (b.length_ft ?? 0) - (a.length_ft ?? 0)); break;
  }
  return sorted;
}

function DropdownFilter({ label, icon, options, value, onChange }: {
  label: string;
  icon: React.ReactNode;
  options: { label: string; value: string }[];
  value: string;
  onChange: (v: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const selected = options.find(o => o.value === value);
  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className={`flex items-center gap-2 px-3 py-2 rounded-xl border text-sm transition-colors shrink-0 ${
          value !== "all"
            ? "bg-gold/10 border-gold/30 text-gold-light"
            : "bg-white/[0.04] border-white/[0.08] text-gray-300 hover:border-gold/20"
        }`}
      >
        {icon}
        <span className="hidden sm:inline">{selected?.label || label}</span>
        <ChevronDown className="w-3 h-3" />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute left-0 top-full mt-1 z-50 w-52 py-1 rounded-xl bg-[#1a2332] border border-white/[0.1] shadow-2xl">
            {options.map((opt) => (
              <button
                key={opt.value}
                onClick={() => { onChange(opt.value); setOpen(false); }}
                className={`w-full text-left px-4 py-2 text-sm transition-colors ${
                  value === opt.value ? "text-gold-light bg-gold/10" : "text-gray-300 hover:bg-white/[0.04]"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function SearchContent() {
  const searchParams = useSearchParams();
  const q = searchParams.get("q") ?? "";

  const [listings, setListings] = useState<ExtractedListing[]>([]);
  const [parsed, setParsed] = useState<ParsedQuery | null>(null);
  const [stageMessage, setStageMessage] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [totalFound, setTotalFound] = useState(0);
  const [platformsSearched, setPlatformsSearched] = useState(0);
  const [pagesAnalyzed, setPagesAnalyzed] = useState(0);
  const [locationData, setLocationData] = useState<LocationData | null>(null);

  // Filters
  const [intent, setIntent] = useState("all");
  const [boatType, setBoatType] = useState("all");
  const [priceRange, setPriceRange] = useState("all");
  const [guestRange, setGuestRange] = useState("all");
  const [lengthRange, setLengthRange] = useState("all");
  const [cabinRange, setCabinRange] = useState("all");
  const [locationFilter, setLocationFilter] = useState("");
  const [crewFilter, setCrewFilter] = useState("all");
  const [sortBy, setSortBy] = useState<SortKey>("match");
  const [showSortMenu, setShowSortMenu] = useState(false);

  const resetFilters = () => {
    setIntent("all");
    setBoatType("all");
    setPriceRange("all");
    setGuestRange("all");
    setLengthRange("all");
    setCabinRange("all");
    setLocationFilter("");
    setCrewFilter("all");
  };

  const hasActiveFilters = intent !== "all" || boatType !== "all" || priceRange !== "all" || guestRange !== "all" || lengthRange !== "all" || cabinRange !== "all" || locationFilter !== "" || crewFilter !== "all";

  const startStream = useCallback(async (query: string, signal: AbortSignal) => {
    setLoading(true);
    setListings([]);
    setParsed(null);
    setError(null);
    setStageMessage("");
    setTotalFound(0);
    setPlatformsSearched(0);
    setPagesAnalyzed(0);
    setLocationData(null);
    resetFilters();
    setSortBy("match");

    try {
      const res = await fetch(`/api/search?q=${encodeURIComponent(query)}`, { signal });
      if (!res.ok || !res.body) {
        setError("Search failed. Please try again.");
        setLoading(false);
        return;
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        let currentEvent = "";
        for (const line of lines) {
          if (line.startsWith("event: ")) {
            currentEvent = line.slice(7);
          } else if (line.startsWith("data: ") && currentEvent) {
            try {
              const data = JSON.parse(line.slice(6));
              switch (currentEvent) {
                case "stage": setStageMessage(data.message); break;
                case "parsed": setParsed(data); break;
                case "location": setLocationData(data); break;
                case "listing":
                  setListings((prev) => [...prev, data]);
                  setLoading(false);
                  break;
                case "done":
                  setTotalFound(data.total_found);
                  setPlatformsSearched(data.platforms_searched || 0);
                  setPagesAnalyzed(data.pages_analyzed || 0);
                  setLoading(false);
                  break;
                case "error":
                  setError(data.error);
                  setLoading(false);
                  break;
              }
            } catch { /* skip */ }
            currentEvent = "";
          }
        }
      }
    } catch (e) {
      if (e instanceof Error && e.name !== "AbortError") {
        setError("Search failed. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!q) return;
    const controller = new AbortController();
    startStream(q, controller.signal);
    return () => controller.abort();
  }, [q, startStream]);

  // Apply filters
  const filtered = useMemo(() => {
    let result = [...listings];

    // Intent filter
    if (intent === "charter") {
      result = result.filter(l => {
        const all = `${l.type} ${l.description} ${l.ai_summary} ${l.match_reasons?.join(" ")}`.toLowerCase();
        return all.includes("charter") || all.includes("rent") || all.includes("hire") || all.includes("mieten") || !!l.price_per_week || !!l.price_per_day;
      });
    } else if (intent === "buy") {
      result = result.filter(l => {
        const all = `${l.description} ${l.ai_summary} ${l.match_reasons?.join(" ")}`.toLowerCase();
        return all.includes("sale") || all.includes("buy") || all.includes("kauf") || !!l.sale_price;
      });
    }

    // Boat type
    if (boatType !== "all") {
      result = result.filter(l => (l.type || "").toLowerCase() === boatType);
    }

    // Price range
    if (priceRange !== "all") {
      const range = PRICE_RANGES[parseInt(priceRange)];
      if (range) {
        result = result.filter(l => {
          const p = getPrice(l);
          return p > 0 && p >= range.min && p <= range.max;
        });
      }
    }

    // Guest range
    if (guestRange !== "all") {
      const range = GUEST_RANGES[parseInt(guestRange)];
      if (range) {
        result = result.filter(l => {
          const g = l.guests ?? 0;
          if (g === 0) return false;
          if (range.max) return g >= range.min && g <= range.max;
          return g >= range.min;
        });
      }
    }

    // Length range
    if (lengthRange !== "all") {
      const range = LENGTH_RANGES[parseInt(lengthRange)];
      if (range) {
        result = result.filter(l => {
          const len = l.length_ft ?? 0;
          if (len === 0) return false;
          return len >= range.min && len <= range.max;
        });
      }
    }

    // Cabin range
    if (cabinRange !== "all") {
      const range = CABIN_RANGES[parseInt(cabinRange)];
      if (range) {
        result = result.filter(l => {
          const c = l.cabins ?? 0;
          if (c === 0) return false;
          return c >= range.min && c <= range.max;
        });
      }
    }

    // Location filter (text match on country, region, port)
    if (locationFilter.trim()) {
      const search = locationFilter.trim().toLowerCase();
      result = result.filter(l => {
        const loc = `${l.country || ""} ${l.region || ""} ${l.port || ""}`.toLowerCase();
        return loc.includes(search);
      });
    }

    // Crew filter
    if (crewFilter !== "all") {
      result = result.filter(l => {
        if (crewFilter === "with") return !!l.crew && l.crew > 0;
        if (crewFilter === "without") return !l.crew || l.crew === 0;
        return true;
      });
    }

    return applySorting(result, sortBy);
  }, [listings, intent, boatType, priceRange, guestRange, lengthRange, cabinRange, locationFilter, crewFilter, sortBy]);

  const hasResults = listings.length > 0;

  // Get unique countries and types from results for dynamic filter options
  const availableTypes = useMemo(() => {
    const types = new Set(listings.map(l => (l.type || "").toLowerCase()).filter(Boolean));
    return Array.from(types);
  }, [listings]);

  return (
    <main className="relative min-h-screen bg-navy">
      <div className="fixed inset-0 -z-10">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--color-navy-light)_0%,_var(--color-navy)_70%)]" />
      </div>

      <Navbar showSearch searchQuery={q} />

      <div className="pt-24 pb-16 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        <div className="sm:hidden mb-6">
          <SearchInput initialValue={q} />
        </div>

        {/* Loading */}
        {loading && !hasResults && (
          <div className="flex flex-col items-center justify-center py-24">
            <div className="relative mb-8">
              <div className="w-16 h-16 rounded-full border-2 border-gold/20 border-t-gold animate-spin" />
            </div>
            <p className="text-gold-light text-lg font-light mb-2 animate-pulse">
              {stageMessage || "Starting search..."}
            </p>
            {parsed && (
              <p className="text-gray-500 text-sm">
                {[parsed.boat_type, parsed.country || parsed.region, parsed.intent].filter(Boolean).join(" · ")}
              </p>
            )}
          </div>
        )}

        {/* Error */}
        {error && !hasResults && (
          <div className="text-center py-24">
            <p className="text-red-400 mb-4">{error}</p>
            <button onClick={() => window.location.reload()} className="px-6 py-2 rounded-xl bg-gold/10 border border-gold/20 text-gold-light text-sm hover:bg-gold/20 transition-colors">
              Try again
            </button>
          </div>
        )}

        {/* Results */}
        {hasResults && (
          <>
            {/* Header */}
            <div className="mb-5">
              <h1 className="text-2xl sm:text-3xl font-light text-white mb-1">
                <span className="text-gold">{totalFound || listings.length}</span> boats discovered
              </h1>
              <p className="text-gray-400 text-sm">
                {platformsSearched > 0 ? (
                  <>
                    Searched <span className="text-gray-300">{platformsSearched} platforms</span>,
                    analyzed <span className="text-gray-300">{pagesAnalyzed} pages</span>
                  </>
                ) : (
                  <>AI-powered results</>
                )}
                {" "}for &ldquo;{q}&rdquo;
                {loading && <span className="ml-2 text-gold/60 animate-pulse">— still searching...</span>}
              </p>
            </div>

            {/* Spell correction */}
            {parsed?.corrected_query && (
              <div className="mb-4 px-4 py-2.5 rounded-xl bg-gold/[0.06] border border-gold/20 text-sm">
                <span className="text-gray-400">Ergebnisse für </span>
                <span className="text-gold-light font-medium">&ldquo;{parsed.corrected_query}&rdquo;</span>
                <span className="text-gray-500 ml-2">(Original: &ldquo;{q}&rdquo;)</span>
              </div>
            )}

            {parsed && <QueryInsight parsed={parsed} />}

            {/* Location & nearby marinas */}
            {locationData && locationData.marinas.length > 0 && (
              <div className="flex flex-wrap items-center gap-2 mb-5">
                <span className="text-xs text-gray-500 uppercase tracking-wider mr-1">
                  <MapPin className="w-3 h-3 inline mr-1" />
                  Marinas:
                </span>
                {locationData.marinas.slice(0, 4).map((m, i) => (
                  <span key={i} className="text-xs px-2.5 py-1 rounded-full bg-blue-500/10 text-blue-300 border border-blue-500/15">
                    {m.name}{m.rating ? ` ★${m.rating}` : ""}
                  </span>
                ))}
              </div>
            )}

            {/* Filter bar */}
            <div className="flex flex-wrap items-center gap-2 mb-5">
              {/* Intent */}
              <div className="flex rounded-xl overflow-hidden border border-white/[0.08]">
                {[
                  { key: "all", label: "Alle" },
                  { key: "charter", label: "Charter" },
                  { key: "buy", label: "Kaufen" },
                ].map((opt) => (
                  <button
                    key={opt.key}
                    onClick={() => setIntent(opt.key)}
                    className={`px-4 py-2 text-sm transition-colors ${
                      intent === opt.key
                        ? "bg-gold/10 text-gold-light"
                        : "bg-white/[0.02] text-gray-400 hover:text-gray-200"
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>

              {/* Boat type */}
              <DropdownFilter
                label="Bootstyp"
                icon={<Ship className="w-4 h-4" />}
                value={boatType}
                onChange={setBoatType}
                options={[
                  { label: "Alle Typen", value: "all" },
                  ...availableTypes.map(t => ({ label: t.charAt(0).toUpperCase() + t.slice(1), value: t })),
                  ...BOAT_TYPES.filter(t => !availableTypes.includes(t)).map(t => ({ label: t.charAt(0).toUpperCase() + t.slice(1), value: t })),
                ]}
              />

              {/* Price range */}
              <DropdownFilter
                label="Preis"
                icon={<Euro className="w-4 h-4" />}
                value={priceRange}
                onChange={setPriceRange}
                options={[
                  { label: "Alle Preise", value: "all" },
                  ...PRICE_RANGES.slice(1).map((r, i) => ({ label: r.label, value: String(i + 1) })),
                ]}
              />

              {/* Guest range */}
              <DropdownFilter
                label="Gäste"
                icon={<Users className="w-4 h-4" />}
                value={guestRange}
                onChange={setGuestRange}
                options={[
                  { label: "Alle Größen", value: "all" },
                  ...GUEST_RANGES.slice(1).map((r, i) => ({ label: r.label, value: String(i + 1) })),
                ]}
              />

              {/* Length range */}
              <DropdownFilter
                label="Länge"
                icon={<Ruler className="w-4 h-4" />}
                value={lengthRange}
                onChange={setLengthRange}
                options={[
                  { label: "Alle Längen", value: "all" },
                  ...LENGTH_RANGES.slice(1).map((r, i) => ({ label: r.label, value: String(i + 1) })),
                ]}
              />

              {/* Cabins range */}
              <DropdownFilter
                label="Kabinen"
                icon={<Anchor className="w-4 h-4" />}
                value={cabinRange}
                onChange={setCabinRange}
                options={[
                  { label: "Alle", value: "all" },
                  ...CABIN_RANGES.slice(1).map((r, i) => ({ label: r.label, value: String(i + 1) })),
                ]}
              />

              {/* Crew filter */}
              <DropdownFilter
                label="Crew"
                icon={<UserCheck className="w-4 h-4" />}
                value={crewFilter}
                onChange={setCrewFilter}
                options={CREW_OPTIONS}
              />

              {/* Location filter */}
              <div className="relative">
                <div className={`flex items-center gap-2 px-3 py-2 rounded-xl border text-sm transition-colors ${
                  locationFilter
                    ? "bg-gold/10 border-gold/30"
                    : "bg-white/[0.04] border-white/[0.08] hover:border-gold/20"
                }`}>
                  <MapPin className="w-4 h-4 text-gray-400 shrink-0" />
                  <input
                    type="text"
                    value={locationFilter}
                    onChange={(e) => setLocationFilter(e.target.value)}
                    placeholder="Ort filtern..."
                    className="bg-transparent border-none outline-none text-sm text-gray-300 placeholder-gray-500 w-24 sm:w-32"
                  />
                  {locationFilter && (
                    <button onClick={() => setLocationFilter("")} className="text-gray-500 hover:text-gray-300">
                      <X className="w-3 h-3" />
                    </button>
                  )}
                </div>
              </div>

              {/* Clear filters */}
              {hasActiveFilters && (
                <button
                  onClick={resetFilters}
                  className="flex items-center gap-1 px-3 py-2 text-xs text-gold/60 hover:text-gold-light transition-colors"
                >
                  <X className="w-3 h-3" />
                  Filter zurücksetzen
                </button>
              )}

              {/* Spacer */}
              <div className="flex-1" />

              {/* Sort */}
              <div className="relative">
                <button
                  onClick={() => setShowSortMenu(!showSortMenu)}
                  className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white/[0.04] border border-white/[0.08] text-sm text-gray-300 hover:border-gold/20 transition-colors"
                >
                  <ArrowUpDown className="w-4 h-4" />
                  <span className="hidden sm:inline">{SORTS.find(s => s.key === sortBy)?.label}</span>
                </button>
                {showSortMenu && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setShowSortMenu(false)} />
                    <div className="absolute right-0 top-full mt-1 z-50 w-52 py-1 rounded-xl bg-[#1a2332] border border-white/[0.1] shadow-2xl">
                      {SORTS.map((s) => (
                        <button
                          key={s.key}
                          onClick={() => { setSortBy(s.key); setShowSortMenu(false); }}
                          className={`w-full text-left px-4 py-2 text-sm transition-colors ${
                            sortBy === s.key ? "text-gold-light bg-gold/10" : "text-gray-300 hover:bg-white/[0.04]"
                          }`}
                        >
                          {s.label}
                        </button>
                      ))}
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Results count badge */}
            {hasActiveFilters && (
              <div className="flex items-center gap-2 mb-4">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-gold/10 border border-gold/20 text-sm text-gold-light">
                  <SlidersHorizontal className="w-3.5 h-3.5" />
                  {filtered.length} von {listings.length} Ergebnissen
                </span>
              </div>
            )}

            {/* Grid */}
            {filtered.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filtered.map((listing, i) => (
                  <ListingCard key={(listing.source_url || "") + listing.name + i} listing={listing} index={i} />
                ))}
              </div>
            ) : (
              <div className="text-center py-16 text-gray-400">
                <p className="mb-3">Keine Ergebnisse für diese Filter.</p>
                <button onClick={resetFilters} className="px-5 py-2 rounded-xl bg-gold/10 border border-gold/20 text-gold-light text-sm hover:bg-gold/20 transition-colors">
                  Filter zurücksetzen
                </button>
              </div>
            )}
          </>
        )}

        {!loading && !error && !hasResults && q && (
          <div className="text-center py-24 text-gray-400">
            Keine Ergebnisse gefunden. Versuche eine andere Suche.
          </div>
        )}
      </div>
    </main>
  );
}

export default function SearchPage() {
  return (
    <Suspense fallback={<SearchLoading />}>
      <SearchContent />
    </Suspense>
  );
}
