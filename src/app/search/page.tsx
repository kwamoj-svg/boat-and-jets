"use client";

import { useEffect, useState, useCallback, Suspense } from "react";
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
} from "lucide-react";
import type { ExtractedListing } from "@/lib/claude-ai";

interface ParsedQuery {
  intent: string;
  region?: string;
  country?: string;
  budget_max?: number;
  currency: string;
  boat_type?: string;
  guests?: number;
  date?: string;
  style?: string;
  keywords: string[];
  corrected_query?: string;
}

type FilterKey = "charter" | "sale" | "luxury" | "family" | "under50k";
type SortKey = "match" | "price_asc" | "price_desc" | "guests" | "length";

const FILTERS: { key: FilterKey; label: string }[] = [
  { key: "charter", label: "Charter" },
  { key: "sale", label: "Kaufen" },
  { key: "luxury", label: "Luxury" },
  { key: "family", label: "Family" },
  { key: "under50k", label: "Under €50k" },
];

const SORTS: { key: SortKey; label: string }[] = [
  { key: "match", label: "Best Match" },
  { key: "price_asc", label: "Price: Low → High" },
  { key: "price_desc", label: "Price: High → Low" },
  { key: "guests", label: "Most Guests" },
  { key: "length", label: "Longest" },
];

function getPrice(l: ExtractedListing): number {
  return l.price_per_week || l.sale_price || (l.price_per_day ? l.price_per_day * 7 : 0);
}

function applyFilters(
  listings: ExtractedListing[],
  active: Set<FilterKey>
): ExtractedListing[] {
  if (active.size === 0) return listings;
  return listings.filter((l) => {
    const all = `${l.type} ${l.name} ${l.description} ${l.match_reasons?.join(" ")} ${l.ai_summary}`.toLowerCase();

    for (const f of active) {
      switch (f) {
        case "charter":
          if (!all.includes("charter") && !all.includes("rent") && !all.includes("hire") && !all.includes("mieten"))
            return false;
          break;
        case "sale":
          if (!l.sale_price && !all.includes("sale") && !all.includes("buy") && !all.includes("kauf"))
            return false;
          break;
        case "luxury":
          if ((l.luxury_level ?? 0) < 4 && !all.includes("luxury") && !all.includes("luxus"))
            return false;
          break;
        case "family":
          if ((l.guests ?? 0) < 6 && !all.includes("family") && !all.includes("familie"))
            return false;
          break;
        case "under50k": {
          const price = getPrice(l);
          if (price === 0 || price > 50000) return false;
          break;
        }
      }
    }
    return true;
  });
}

function applySorting(listings: ExtractedListing[], sort: SortKey): ExtractedListing[] {
  const sorted = [...listings];
  switch (sort) {
    case "match":
      sorted.sort((a, b) => (b.match_score ?? 0) - (a.match_score ?? 0));
      break;
    case "price_asc":
      sorted.sort((a, b) => (getPrice(a) || Infinity) - (getPrice(b) || Infinity));
      break;
    case "price_desc":
      sorted.sort((a, b) => (getPrice(b) || 0) - (getPrice(a) || 0));
      break;
    case "guests":
      sorted.sort((a, b) => (b.guests ?? 0) - (a.guests ?? 0));
      break;
    case "length":
      sorted.sort((a, b) => (b.length_ft ?? 0) - (a.length_ft ?? 0));
      break;
  }
  return sorted;
}

function SearchContent() {
  const searchParams = useSearchParams();
  const q = searchParams.get("q") ?? "";

  const [listings, setListings] = useState<ExtractedListing[]>([]);
  const [parsed, setParsed] = useState<ParsedQuery | null>(null);
  const [stage, setStage] = useState<string>("");
  const [stageMessage, setStageMessage] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [totalFound, setTotalFound] = useState(0);
  const [platformsSearched, setPlatformsSearched] = useState(0);
  const [pagesAnalyzed, setPagesAnalyzed] = useState(0);

  const [activeFilters, setActiveFilters] = useState<Set<FilterKey>>(new Set());
  const [sortBy, setSortBy] = useState<SortKey>("match");
  const [showSortMenu, setShowSortMenu] = useState(false);

  const startStream = useCallback(async (query: string, signal: AbortSignal) => {
    setLoading(true);
    setListings([]);
    setParsed(null);
    setError(null);
    setStage("");
    setStageMessage("");
    setTotalFound(0);
    setActiveFilters(new Set());
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
                case "stage":
                  setStage(data.stage);
                  setStageMessage(data.message);
                  break;
                case "parsed":
                  setParsed(data);
                  break;
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
            } catch {
              // skip malformed JSON
            }
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

  const filtered = applyFilters(listings, activeFilters);
  const sorted = applySorting(filtered, sortBy);
  const hasResults = listings.length > 0;

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

        {/* Loading state (before any results arrive) */}
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
                {[parsed.boat_type, parsed.country || parsed.region, parsed.intent]
                  .filter(Boolean)
                  .join(" · ")}
              </p>
            )}
          </div>
        )}

        {/* Error */}
        {error && !hasResults && (
          <div className="text-center py-24">
            <p className="text-red-400 mb-4">{error}</p>
            <button
              onClick={() => window.location.reload()}
              className="px-6 py-2 rounded-xl bg-gold/10 border border-gold/20 text-gold-light text-sm hover:bg-gold/20 transition-colors"
            >
              Try again
            </button>
          </div>
        )}

        {/* Results */}
        {hasResults && (
          <>
            <div className="mb-6">
              <h1 className="text-2xl sm:text-3xl font-light text-white mb-1">
                <span className="text-gold">{totalFound || listings.length}</span>{" "}
                boats discovered
              </h1>
              <p className="text-gray-400 text-sm">
                {platformsSearched > 0 ? (
                  <>
                    Searched <span className="text-gray-300">{platformsSearched} platforms</span>,
                    analyzed <span className="text-gray-300">{pagesAnalyzed} pages</span> for
                    &ldquo;{q}&rdquo;
                  </>
                ) : (
                  <>Live AI-powered results for &ldquo;{q}&rdquo;</>
                )}
                {loading && (
                  <span className="ml-2 text-gold/60 animate-pulse">
                    — still searching...
                  </span>
                )}
              </p>
            </div>

            {/* Spell correction */}
            {parsed?.corrected_query && (
              <div className="mb-5 px-4 py-3 rounded-xl bg-gold/[0.06] border border-gold/20 text-sm">
                <span className="text-gray-400">Showing results for </span>
                <span className="text-gold-light font-medium">
                  &ldquo;{parsed.corrected_query}&rdquo;
                </span>
                <span className="text-gray-500 ml-2">
                  (original: &ldquo;{q}&rdquo;)
                </span>
              </div>
            )}

            {/* AI Query Insight */}
            {parsed && <QueryInsight parsed={parsed} />}

            {/* Filters + Sort bar */}
            <div className="flex items-center justify-between gap-3 mb-6">
              <div className="flex items-center gap-2 overflow-x-auto pb-1 flex-1">
                <button
                  onClick={() => setActiveFilters(new Set())}
                  className={`flex items-center gap-2 px-4 py-2 rounded-xl border text-sm transition-colors shrink-0 ${
                    activeFilters.size === 0
                      ? "bg-gold/10 border-gold/30 text-gold-light"
                      : "bg-white/[0.04] border-white/[0.08] text-gray-300 hover:border-gold/20"
                  }`}
                >
                  <SlidersHorizontal className="w-4 h-4" />
                  All
                </button>
                {FILTERS.map((f) => {
                  const isActive = activeFilters.has(f.key);
                  return (
                    <button
                      key={f.key}
                      onClick={() => {
                        setActiveFilters((prev) => {
                          const next = new Set(prev);
                          if (next.has(f.key)) next.delete(f.key);
                          else next.add(f.key);
                          return next;
                        });
                      }}
                      className={`px-4 py-2 rounded-xl border text-sm transition-colors shrink-0 ${
                        isActive
                          ? "bg-gold/10 border-gold/30 text-gold-light"
                          : "bg-white/[0.04] border-white/[0.08] text-gray-300 hover:border-gold/20 hover:text-gold-light"
                      }`}
                    >
                      {f.label}
                    </button>
                  );
                })}
              </div>

              {/* Sort dropdown */}
              <div className="relative shrink-0">
                <button
                  onClick={() => setShowSortMenu((v) => !v)}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/[0.04] border border-white/[0.08] text-sm text-gray-300 hover:border-gold/20 transition-colors"
                >
                  <ArrowUpDown className="w-4 h-4" />
                  <span className="hidden sm:inline">
                    {SORTS.find((s) => s.key === sortBy)?.label}
                  </span>
                </button>
                {showSortMenu && (
                  <div className="absolute right-0 top-full mt-2 z-50 w-48 py-2 rounded-xl bg-navy-lighter border border-white/[0.08] shadow-xl">
                    {SORTS.map((s) => (
                      <button
                        key={s.key}
                        onClick={() => {
                          setSortBy(s.key);
                          setShowSortMenu(false);
                        }}
                        className={`w-full text-left px-4 py-2 text-sm transition-colors ${
                          sortBy === s.key
                            ? "text-gold-light bg-gold/10"
                            : "text-gray-300 hover:bg-white/[0.04]"
                        }`}
                      >
                        {s.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Active filter pills */}
            {activeFilters.size > 0 && (
              <div className="flex items-center gap-2 mb-4">
                <span className="text-sm text-gray-500">
                  {sorted.length} of {listings.length} results
                </span>
                <button
                  onClick={() => setActiveFilters(new Set())}
                  className="flex items-center gap-1 text-xs text-gold/60 hover:text-gold-light transition-colors"
                >
                  <X className="w-3 h-3" />
                  Clear all
                </button>
              </div>
            )}

            {/* Results grid */}
            {sorted.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {sorted.map((listing, i) => (
                  <ListingCard
                    key={(listing.source_url || "") + listing.name + i}
                    listing={listing}
                    index={i}
                  />
                ))}
              </div>
            ) : (
              <div className="text-center py-16 text-gray-400">
                <p className="mb-3">No results match the selected filters.</p>
                <button
                  onClick={() => setActiveFilters(new Set())}
                  className="px-5 py-2 rounded-xl bg-gold/10 border border-gold/20 text-gold-light text-sm hover:bg-gold/20 transition-colors"
                >
                  Clear filters
                </button>
              </div>
            )}
          </>
        )}

        {/* No results after loading complete */}
        {!loading && !error && !hasResults && q && (
          <div className="text-center py-24 text-gray-400">
            No results found. Try a different search.
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
