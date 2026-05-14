"use client";

import { useState, useEffect, useCallback } from "react";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { ListingCard } from "@/components/ListingCard";
import {
  Ship, Loader2, SlidersHorizontal, ArrowUpDown, X, ChevronDown,
  Ruler, MapPin, Euro, Calendar, Gauge, Search,
} from "lucide-react";
import type { ExtractedListing } from "@/lib/claude-ai";

const BOAT_TYPES = [
  { value: "", label: "Alle Typen" },
  { value: "sailboat", label: "Segelboot" },
  { value: "catamaran", label: "Katamaran" },
  { value: "motorboat", label: "Motorboot" },
  { value: "yacht", label: "Yacht" },
  { value: "superyacht", label: "Superyacht" },
  { value: "speedboat", label: "Speedboot" },
];

const COUNTRIES = [
  { value: "", label: "Alle Länder" },
  { value: "Germany", label: "Deutschland" },
  { value: "Italy", label: "Italien" },
  { value: "Spain", label: "Spanien" },
  { value: "France", label: "Frankreich" },
  { value: "Croatia", label: "Kroatien" },
  { value: "Greece", label: "Griechenland" },
  { value: "Turkey", label: "Türkei" },
  { value: "Netherlands", label: "Niederlande" },
  { value: "UK", label: "Großbritannien" },
  { value: "USA", label: "USA" },
  { value: "UAE", label: "VAE" },
];

const CONDITIONS = [
  { value: "", label: "Jeder Zustand" },
  { value: "new", label: "Neu" },
  { value: "like_new", label: "Wie neu" },
  { value: "good", label: "Gut" },
  { value: "fair", label: "Gebraucht" },
  { value: "project", label: "Projekt" },
];

const PRICE_RANGES = [
  { value: "", label: "Alle Preise" },
  { value: "50000", label: "Bis 50.000 €" },
  { value: "100000", label: "Bis 100.000 €" },
  { value: "250000", label: "Bis 250.000 €" },
  { value: "500000", label: "Bis 500.000 €" },
  { value: "1000000", label: "Bis 1.000.000 €" },
  { value: "99999999", label: "Über 1.000.000 €" },
];

const LENGTH_RANGES = [
  { value: "", label: "Alle Längen" },
  { value: "8", label: "Bis 8 m" },
  { value: "12", label: "Bis 12 m" },
  { value: "15", label: "Bis 15 m" },
  { value: "20", label: "Bis 20 m" },
  { value: "30", label: "Bis 30 m" },
];

const YEAR_OPTIONS = [
  { value: "", label: "Alle Baujahre" },
  { value: "2020", label: "Ab 2020" },
  { value: "2015", label: "Ab 2015" },
  { value: "2010", label: "Ab 2010" },
  { value: "2000", label: "Ab 2000" },
  { value: "1990", label: "Ab 1990" },
];

type SortKey = "featured" | "price_asc" | "price_desc" | "year" | "length";
const SORTS: { key: SortKey; label: string }[] = [
  { key: "featured", label: "Empfohlen" },
  { key: "price_asc", label: "Preis aufsteigend" },
  { key: "price_desc", label: "Preis absteigend" },
  { key: "year", label: "Neueste zuerst" },
  { key: "length", label: "Größte zuerst" },
];

function applySorting(boats: ExtractedListing[], sort: SortKey): ExtractedListing[] {
  const sorted = [...boats];
  switch (sort) {
    case "featured": sorted.sort((a, b) => (b.match_score ?? 0) - (a.match_score ?? 0)); break;
    case "price_asc": sorted.sort((a, b) => (a.sale_price || Infinity) - (b.sale_price || Infinity)); break;
    case "price_desc": sorted.sort((a, b) => (b.sale_price || 0) - (a.sale_price || 0)); break;
    case "year": sorted.sort((a, b) => (b.year || 0) - (a.year || 0)); break;
    case "length": sorted.sort((a, b) => (b.length_ft || 0) - (a.length_ft || 0)); break;
  }
  return sorted;
}

export default function SalePage() {
  const [search, setSearch] = useState("");
  const [country, setCountry] = useState("");
  const [boatType, setBoatType] = useState("");
  const [condition, setCondition] = useState("");
  const [maxPrice, setMaxPrice] = useState("");
  const [minYear, setMinYear] = useState("");
  const [maxLength, setMaxLength] = useState("");
  const [results, setResults] = useState<ExtractedListing[]>([]);
  const [loading, setLoading] = useState(true);
  const [sortBy, setSortBy] = useState<SortKey>("featured");
  const [showSortMenu, setShowSortMenu] = useState(false);

  const fetchBoats = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (search) params.set("q", search);
    if (country) params.set("country", country);
    if (boatType) params.set("type", boatType);
    if (condition) params.set("condition", condition);
    if (maxPrice) {
      if (maxPrice === "99999999") {
        params.set("minPrice", "1000000");
      } else {
        params.set("maxPrice", maxPrice);
      }
    }
    if (minYear) params.set("minYear", minYear);
    if (maxLength) params.set("maxLength", maxLength);
    params.set("limit", "60");

    try {
      const res = await fetch(`/api/sale?${params}`);
      const data = await res.json();
      setResults(data.results || []);
    } catch {
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, [search, country, boatType, condition, maxPrice, minYear, maxLength]);

  useEffect(() => {
    fetchBoats();
  }, [fetchBoats]);

  const hasFilters = !!(search || country || boatType || condition || maxPrice || minYear || maxLength);

  const resetFilters = () => {
    setSearch("");
    setCountry("");
    setBoatType("");
    setCondition("");
    setMaxPrice("");
    setMinYear("");
    setMaxLength("");
  };

  const sorted = applySorting(results, sortBy);

  return (
    <main className="min-h-screen bg-[radial-gradient(ellipse_at_top,_var(--color-navy-light)_0%,_var(--color-navy)_70%)]">
      <Navbar />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 pt-24 pb-12">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl sm:text-4xl font-light text-white mb-2">
            Boote &amp; Yachten kaufen
          </h1>
          <p className="text-gray-400 text-sm max-w-xl">
            Gepr&uuml;fte Angebote von Werften, H&auml;ndlern und privaten Verk&auml;ufern.
            Neu, gebraucht und Projektboote.
          </p>
        </div>

        {/* Filter-Leiste */}
        <div className="bg-white/[0.02] border border-white/5 rounded-2xl p-4 sm:p-5 mb-6">
          {/* Suchfeld */}
          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Marke, Modell oder Liegeplatz suchen..."
              className="w-full pl-10 pr-4 py-3 bg-navy/50 border border-white/10 rounded-xl text-white placeholder-gray-500 text-sm focus:outline-none focus:border-gold/50 transition-colors"
            />
          </div>

          {/* Filter-Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            {/* Bootstyp */}
            <div className="relative">
              <Ship className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-500 pointer-events-none" />
              <select
                value={boatType}
                onChange={(e) => setBoatType(e.target.value)}
                className="w-full pl-9 pr-3 py-2.5 bg-navy/50 border border-white/10 rounded-lg text-white text-sm focus:outline-none focus:border-gold/50 appearance-none cursor-pointer"
              >
                {BOAT_TYPES.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>

            {/* Land */}
            <div className="relative">
              <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-500 pointer-events-none" />
              <select
                value={country}
                onChange={(e) => setCountry(e.target.value)}
                className="w-full pl-9 pr-3 py-2.5 bg-navy/50 border border-white/10 rounded-lg text-white text-sm focus:outline-none focus:border-gold/50 appearance-none cursor-pointer"
              >
                {COUNTRIES.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>

            {/* Preis */}
            <div className="relative">
              <Euro className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-500 pointer-events-none" />
              <select
                value={maxPrice}
                onChange={(e) => setMaxPrice(e.target.value)}
                className="w-full pl-9 pr-3 py-2.5 bg-navy/50 border border-white/10 rounded-lg text-white text-sm focus:outline-none focus:border-gold/50 appearance-none cursor-pointer"
              >
                {PRICE_RANGES.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>

            {/* Baujahr */}
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-500 pointer-events-none" />
              <select
                value={minYear}
                onChange={(e) => setMinYear(e.target.value)}
                className="w-full pl-9 pr-3 py-2.5 bg-navy/50 border border-white/10 rounded-lg text-white text-sm focus:outline-none focus:border-gold/50 appearance-none cursor-pointer"
              >
                {YEAR_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>

            {/* Länge */}
            <div className="relative">
              <Ruler className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-500 pointer-events-none" />
              <select
                value={maxLength}
                onChange={(e) => setMaxLength(e.target.value)}
                className="w-full pl-9 pr-3 py-2.5 bg-navy/50 border border-white/10 rounded-lg text-white text-sm focus:outline-none focus:border-gold/50 appearance-none cursor-pointer"
              >
                {LENGTH_RANGES.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>

            {/* Zustand */}
            <div className="relative">
              <Gauge className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-500 pointer-events-none" />
              <select
                value={condition}
                onChange={(e) => setCondition(e.target.value)}
                className="w-full pl-9 pr-3 py-2.5 bg-navy/50 border border-white/10 rounded-lg text-white text-sm focus:outline-none focus:border-gold/50 appearance-none cursor-pointer"
              >
                {CONDITIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>
          </div>

          {/* Aktive Filter + Sortierung */}
          <div className="flex items-center justify-between mt-4 pt-3 border-t border-white/5">
            <div className="flex items-center gap-3">
              <span className="text-sm text-gray-400">
                {loading ? (
                  <span className="flex items-center gap-1.5">
                    <Loader2 className="w-3.5 h-3.5 animate-spin" /> Suche...
                  </span>
                ) : (
                  <><span className="text-gold font-medium">{results.length}</span> Boote</>
                )}
              </span>
              {hasFilters && (
                <button
                  onClick={resetFilters}
                  className="flex items-center gap-1 text-xs text-gold/60 hover:text-gold-light transition-colors"
                >
                  <X className="w-3 h-3" /> Filter zurücksetzen
                </button>
              )}
            </div>

            {/* Sortierung */}
            <div className="relative">
              <button
                onClick={() => setShowSortMenu(!showSortMenu)}
                className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/[0.04] border border-white/[0.08] text-sm text-gray-300 hover:border-gold/20 transition-colors"
              >
                <ArrowUpDown className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">{SORTS.find(s => s.key === sortBy)?.label}</span>
              </button>
              {showSortMenu && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setShowSortMenu(false)} />
                  <div className="absolute right-0 top-full mt-1 z-50 w-48 py-1 rounded-xl bg-[#1a2332] border border-white/[0.1] shadow-2xl">
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
        </div>

        {/* Ergebnisse */}
        {loading ? (
          <div className="text-center py-20">
            <Loader2 className="w-8 h-8 text-gold animate-spin mx-auto" />
            <p className="text-gray-500 text-sm mt-3">Lade Angebote...</p>
          </div>
        ) : sorted.length === 0 ? (
          <div className="text-center py-20 bg-white/[0.02] border border-white/5 rounded-2xl">
            <Ship className="w-12 h-12 text-gray-600 mx-auto mb-4" />
            <h2 className="text-white text-xl font-light mb-2">
              Keine passenden Boote gefunden
            </h2>
            <p className="text-gray-500 text-sm max-w-md mx-auto mb-6">
              {hasFilters
                ? "Versuche andere Filtereinstellungen oder erweitere deine Suche."
                : "Neue Angebote werden laufend aus verschiedenen Quellen importiert."}
            </p>
            {hasFilters && (
              <button
                onClick={resetFilters}
                className="px-5 py-2.5 bg-gold/90 hover:bg-gold text-navy text-sm font-medium rounded-xl transition-colors"
              >
                Filter zurücksetzen
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {sorted.map((boat, i) => (
              <ListingCard
                key={`${boat.name}-${i}`}
                listing={boat}
                index={i}
              />
            ))}
          </div>
        )}
      </div>

      <Footer />
    </main>
  );
}
