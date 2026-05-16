"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import {
  Anchor, Ship, MapPin, Users, Ruler, Search, Filter,
  ChevronLeft, ChevronRight, Bed, SlidersHorizontal, ExternalLink,
} from "lucide-react";
import { getFallbackBoatImage } from "@/lib/boat-images";
import { useT } from "@/lib/i18n/LanguageProvider";
import { localizedBoataroundUrlClient } from "@/lib/boataround-url";

/* ─── Types ─── */

interface CharterCompany {
  company_name: string;
  slug: string;
  country: string;
}

interface CharterBoat {
  id: string;
  name: string;
  slug: string;
  boat_type: string;
  brand: string | null;
  model: string | null;
  year: number | null;
  length_m: number | null;
  cabins: number | null;
  max_guests: number | null;
  price_per_day: number | null;
  price_per_week: number | null;
  currency: string;
  base_port: string | null;
  country: string | null;
  features: string[];
  images: string[];
  charter_type: string;
  license_required: boolean;
  detail_url: string | null;
  source: string | null;
  charter_companies: CharterCompany | null;
}

/* ─── Constants ─── */

const BOAT_TYPES = [
  { value: "", label: "Alle Typen" },
  { value: "sailboat", label: "Segelboot" },
  { value: "catamaran", label: "Katamaran" },
  { value: "motorboat", label: "Motorboot" },
  { value: "yacht", label: "Yacht" },
  { value: "gulet", label: "Gulet" },
  { value: "speedboat", label: "Speedboot" },
];

const REGIONS = [
  { value: "", label: "Alle Regionen" },
  // Mittelmeer
  { value: "Croatia", label: "Kroatien" },
  { value: "Greece", label: "Griechenland" },
  { value: "Italy", label: "Italien" },
  { value: "Spain", label: "Spanien" },
  { value: "France", label: "Frankreich" },
  { value: "Turkey", label: "Türkei" },
  { value: "Portugal", label: "Portugal" },
  { value: "Malta", label: "Malta" },
  { value: "Montenegro", label: "Montenegro" },
  { value: "Albania", label: "Albanien" },
  { value: "Cyprus", label: "Zypern" },
  { value: "Monaco", label: "Monaco" },
  // Mittelmeer-Sub-Reviere
  { value: "Sardinia", label: "— Sardinien" },
  { value: "Sicily", label: "— Sizilien" },
  { value: "Corsica", label: "— Korsika" },
  { value: "Balearic", label: "— Balearen" },
  { value: "Ionian", label: "— Ionische Inseln" },
  { value: "Cyclades", label: "— Kykladen" },
  { value: "Sporades", label: "— Sporaden" },
  { value: "Dodecanese", label: "— Dodekanes" },
  // Atlantik / Nordsee / Ostsee
  { value: "Netherlands", label: "Niederlande" },
  { value: "Germany", label: "Deutschland" },
  { value: "Sweden", label: "Schweden" },
  { value: "Norway", label: "Norwegen" },
  { value: "Denmark", label: "Dänemark" },
  { value: "Finland", label: "Finnland" },
  { value: "United Kingdom", label: "Großbritannien" },
  { value: "Ireland", label: "Irland" },
  { value: "Iceland", label: "Island" },
  { value: "Poland", label: "Polen" },
  { value: "Estonia", label: "Estland" },
  // Karibik / Amerika
  { value: "Caribbean", label: "Karibik (gesamt)" },
  { value: "British Virgin Islands", label: "— BVI" },
  { value: "US Virgin Islands", label: "— USVI" },
  { value: "Saint Lucia", label: "— St. Lucia" },
  { value: "Saint Martin", label: "— St. Martin" },
  { value: "Antigua", label: "— Antigua" },
  { value: "Grenada", label: "— Grenada" },
  { value: "Bahamas", label: "Bahamas" },
  { value: "Cuba", label: "Kuba" },
  { value: "Mexico", label: "Mexiko" },
  { value: "Belize", label: "Belize" },
  { value: "Panama", label: "Panama" },
  { value: "United States", label: "USA" },
  { value: "Brazil", label: "Brasilien" },
  // Indischer Ozean / Asien / Pazifik
  { value: "Thailand", label: "Thailand" },
  { value: "Indonesia", label: "Indonesien" },
  { value: "Maldives", label: "Malediven" },
  { value: "Seychelles", label: "Seychellen" },
  { value: "Australia", label: "Australien" },
  { value: "New Zealand", label: "Neuseeland" },
  { value: "French Polynesia", label: "Französisch-Polynesien" },
  { value: "Fiji", label: "Fidschi" },
  // Afrika
  { value: "Cape Verde", label: "Kapverden" },
  { value: "South Africa", label: "Südafrika" },
];

const TYPE_LABELS: Record<string, string> = {
  sailboat: "Segelboot",
  catamaran: "Katamaran",
  motorboat: "Motorboot",
  yacht: "Yacht",
  gulet: "Gulet",
  speedboat: "Speedboot",
};

function boatTypeLabel(type: string): string {
  return TYPE_LABELS[type] || type.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

/* ─── Components ─── */

function BoatTypeBadge({ type }: { type: string }) {
  const colors: Record<string, string> = {
    sailboat: "bg-blue-500/15 text-blue-300 border-blue-500/20",
    catamaran: "bg-emerald-500/15 text-emerald-300 border-emerald-500/20",
    motorboat: "bg-amber-500/15 text-amber-300 border-amber-500/20",
    yacht: "bg-purple-500/15 text-purple-300 border-purple-500/20",
    gulet: "bg-rose-500/15 text-rose-300 border-rose-500/20",
    speedboat: "bg-cyan-500/15 text-cyan-300 border-cyan-500/20",
  };
  const cls = colors[type] || "bg-white/10 text-gray-300 border-white/10";
  return (
    <span className={`px-2 py-0.5 rounded-full text-xs border ${cls}`}>
      {boatTypeLabel(type)}
    </span>
  );
}

function BoatCard({ boat }: { boat: CharterBoat }) {
  const { locale } = useT();
  const company = boat.charter_companies;
  const ownImg = boat.images && boat.images.length > 0 ? boat.images[0] : null;
  const imgSrc = ownImg || getFallbackBoatImage(boat.boat_type, boat.slug || boat.name);
  // Transform Boataround URLs to the current locale's path (boot/boat/bateau/...)
  const externalUrl = localizedBoataroundUrlClient(boat.detail_url, locale);
  const bookingHref = externalUrl || `/charter/${boat.slug}`;
  const isExternal = !!externalUrl;
  const linkProps = isExternal
    ? { href: bookingHref, target: "_blank", rel: "noopener noreferrer sponsored" as const }
    : { href: bookingHref };

  return (
    <div className="glass rounded-2xl border border-white/10 hover:border-gold/20 transition-all duration-300 group overflow-hidden flex flex-col">
      {/* Image — fallback by boat type when no own photo */}
      <a {...linkProps} className="relative h-48 overflow-hidden block">
        <img
          src={imgSrc}
          alt={boat.name}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          loading="lazy"
        />
        <div className="absolute top-3 left-3">
          <BoatTypeBadge type={boat.boat_type} />
        </div>
        {boat.year && (
          <div className="absolute top-3 right-3 px-2 py-0.5 rounded-full bg-black/50 text-xs text-gray-300 backdrop-blur-sm">
            {boat.year}
          </div>
        )}
        {isExternal && (
          <div className="absolute bottom-2 right-2 px-2 py-1 rounded-md bg-gold/90 text-navy text-[10px] font-semibold flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            Buchen <ExternalLink className="w-3 h-3" />
          </div>
        )}
      </a>

      {/* Content */}
      <div className="p-5 flex flex-col flex-1">
        <div className="mb-3">
          <a {...linkProps} className="block">
            <h3 className="text-white font-medium text-lg group-hover:text-gold-light transition-colors line-clamp-1">
              {boat.name}
            </h3>
            {(boat.brand || boat.model) && (
              <p className="text-sm text-gray-500 mt-0.5">
                {[boat.brand, boat.model].filter(Boolean).join(" ")}
              </p>
            )}
          </a>
        </div>

        {/* Specs */}
        <div className="flex items-center gap-4 text-sm text-gray-400 mb-3">
          {boat.length_m && (
            <span className="flex items-center gap-1">
              <Ruler className="w-3.5 h-3.5" />
              {boat.length_m}m
            </span>
          )}
          {boat.cabins != null && boat.cabins > 0 && (
            <span className="flex items-center gap-1">
              <Bed className="w-3.5 h-3.5" />
              {boat.cabins} Kab.
            </span>
          )}
          {boat.max_guests != null && boat.max_guests > 0 && (
            <span className="flex items-center gap-1">
              <Users className="w-3.5 h-3.5" />
              {boat.max_guests} Gäste
            </span>
          )}
        </div>

        {/* Location */}
        {(boat.base_port || boat.country) && (
          <div className="flex items-center gap-1.5 text-sm text-gray-500 mb-3">
            <MapPin className="w-3.5 h-3.5 flex-shrink-0" />
            <span className="line-clamp-1">
              {[boat.base_port, boat.country].filter(Boolean).join(", ")}
            </span>
          </div>
        )}

        {/* Features */}
        {boat.features && boat.features.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-4">
            {boat.features.slice(0, 4).map((f) => (
              <span
                key={f}
                className="px-2 py-0.5 rounded-full bg-white/5 border border-white/10 text-xs text-gray-500"
              >
                {f}
              </span>
            ))}
            {boat.features.length > 4 && (
              <span className="px-2 py-0.5 text-xs text-gray-600">
                +{boat.features.length - 4}
              </span>
            )}
          </div>
        )}

        {/* Footer */}
        <div className="mt-auto flex items-end justify-between pt-3 border-t border-white/5">
          <div>
            {boat.price_per_day != null ? (
              <div className="text-gold text-lg font-medium">
                ab {boat.price_per_day.toLocaleString("de-DE")} {boat.currency || "EUR"}
                <span className="text-xs text-gray-500 font-normal ml-1">/Tag</span>
              </div>
            ) : boat.price_per_week != null ? (
              <div className="text-gold text-lg font-medium">
                ab {Math.round(boat.price_per_week / 7).toLocaleString("de-DE")} {boat.currency || "EUR"}
                <span className="text-xs text-gray-500 font-normal ml-1">/Tag</span>
                <div className="text-[10px] text-gray-500 mt-0.5">
                  {boat.price_per_week.toLocaleString("de-DE")} {boat.currency || "EUR"} /Woche
                </div>
              </div>
            ) : (
              <div className="text-gray-400 text-sm font-medium">
                Preis auf Anfrage
              </div>
            )}
            {company && (
              <Link
                href={`/charter/company/${company.slug}`}
                className="text-xs text-gray-500 hover:text-gold-light transition-colors mt-1 inline-block"
              >
                {company.company_name}
              </Link>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Link
              href={`/charter/${boat.slug}`}
              className="px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-gray-300 text-xs font-medium hover:bg-white/10 transition-colors"
            >
              Details
            </Link>
            {boat.detail_url ? (
              <a
                href={boat.detail_url}
                target="_blank"
                rel="noopener noreferrer sponsored"
                onClick={(e) => e.stopPropagation()}
                className="px-3 py-2 rounded-lg bg-gradient-to-r from-gold to-gold-light text-navy text-xs font-semibold hover:opacity-90 transition-opacity inline-flex items-center gap-1"
              >
                Buchen
                <ExternalLink className="w-3 h-3" />
              </a>
            ) : (
              <Link
                href={`/charter/${boat.slug}`}
                className="px-3 py-2 rounded-lg bg-gradient-to-r from-gold to-gold-light text-navy text-xs font-semibold hover:opacity-90 transition-opacity"
              >
                Anfragen
              </Link>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function SkeletonCard() {
  return (
    <div className="glass rounded-2xl border border-white/10 overflow-hidden animate-pulse">
      <div className="h-48 bg-white/5" />
      <div className="p-5 space-y-3">
        <div className="h-5 bg-white/5 rounded w-3/4" />
        <div className="h-4 bg-white/5 rounded w-1/2" />
        <div className="flex gap-4">
          <div className="h-4 bg-white/5 rounded w-16" />
          <div className="h-4 bg-white/5 rounded w-16" />
          <div className="h-4 bg-white/5 rounded w-16" />
        </div>
        <div className="h-4 bg-white/5 rounded w-2/3" />
        <div className="flex justify-between items-end pt-3 border-t border-white/5">
          <div className="h-6 bg-white/5 rounded w-24" />
          <div className="h-9 bg-white/5 rounded w-20" />
        </div>
      </div>
    </div>
  );
}

/* ─── Page ─── */

export default function CharterCatalogPage() {
  const { t } = useT();
  const [boats, setBoats] = useState<CharterBoat[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const limit = 24;

  // Filters
  const [boatType, setBoatType] = useState("");
  const [region, setRegion] = useState("");
  const [maxGuests, setMaxGuests] = useState("");
  const [minPrice, setMinPrice] = useState("");
  const [maxPrice, setMaxPrice] = useState("");
  const [search, setSearch] = useState("");
  const [skipperOnly, setSkipperOnly] = useState(false);
  const [sortBy, setSortBy] = useState<"default" | "price-asc" | "price-desc" | "newest" | "guests-desc">(
    "default"
  );
  const [filtersOpen, setFiltersOpen] = useState(false);

  const fetchBoats = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({ view: "boats", page: String(page), limit: String(limit) });
    if (boatType) params.set("type", boatType);
    if (region) params.set("region", region);
    if (maxGuests) params.set("minGuests", maxGuests);
    if (minPrice) params.set("minPrice", minPrice);
    if (maxPrice) params.set("maxPrice", maxPrice);
    if (sortBy !== "default") params.set("sort", sortBy);
    if (search) params.set("q", search);

    try {
      const res = await fetch(`/api/charter?${params}`);
      const data = await res.json();
      let results: CharterBoat[] = data.results || [];

      // Client-side filter for skipper (charter_type)
      if (skipperOnly) {
        results = results.filter(
          (b) => b.charter_type === "skippered" || b.charter_type === "crewed"
        );
      }

      setBoats(results);
      setTotal(data.total ?? 0);
    } catch {
      setBoats([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [page, boatType, region, maxGuests, minPrice, maxPrice, sortBy, search, skipperOnly]);

  useEffect(() => {
    fetchBoats();
  }, [fetchBoats]);

  // Reset to page 1 when filters change
  useEffect(() => {
    setPage(1);
  }, [boatType, region, maxGuests, minPrice, maxPrice, sortBy, search, skipperOnly]);

  const totalPages = Math.max(1, Math.ceil(total / limit));

  return (
    <main className="relative min-h-screen bg-navy">
      <div className="fixed inset-0 -z-10">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--color-navy-light)_0%,_var(--color-navy)_70%)]" />
      </div>

      <Navbar />

      <div className="pt-24 pb-16 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        {/* Hero */}
        <div className="text-center mb-12">
          <div className="flex items-center justify-center gap-3 mb-4">
            <Anchor className="w-8 h-8 text-gold" />
            <h1 className="text-3xl sm:text-4xl font-light text-white tracking-wide">
              {t("charter.title")}
            </h1>
          </div>
          <p className="text-gray-400 text-lg max-w-2xl mx-auto">
            {t("charter.subtitle", { n: total })}
          </p>
        </div>

        {/* Filter Bar */}
        <div className="glass rounded-2xl p-4 sm:p-6 mb-8 border border-white/10 sticky top-16 z-40">
          {/* Mobile toggle */}
          <button
            onClick={() => setFiltersOpen(!filtersOpen)}
            className="flex items-center gap-2 text-sm text-gray-400 mb-4 sm:hidden"
          >
            <SlidersHorizontal className="w-4 h-4" />
            Filter {filtersOpen ? "verbergen" : "anzeigen"}
          </button>

          <div className={`grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3 ${filtersOpen ? "" : "hidden sm:grid"}`}>
            {/* Search */}
            <div className="relative lg:col-span-2">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
              <input
                type="text"
                placeholder={t("charter.searchPlaceholder")}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && fetchBoats()}
                className="w-full pl-10 pr-4 py-2.5 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-600 text-sm focus:outline-none focus:border-gold/30"
              />
            </div>

            {/* Boat Type */}
            <select
              value={boatType}
              onChange={(e) => setBoatType(e.target.value)}
              className="bg-white/5 border border-white/10 rounded-lg text-white text-sm px-3 py-2.5 focus:outline-none focus:border-gold/30 appearance-none"
            >
              {BOAT_TYPES.map((bt) => (
                <option key={bt.value} value={bt.value} className="bg-navy">
                  {bt.value ? t(`boat.type.${bt.value}`) : t("charter.allTypes")}
                </option>
              ))}
            </select>

            {/* Region */}
            <select
              value={region}
              onChange={(e) => setRegion(e.target.value)}
              className="bg-white/5 border border-white/10 rounded-lg text-white text-sm px-3 py-2.5 focus:outline-none focus:border-gold/30 appearance-none"
            >
              {REGIONS.map((r) => (
                <option key={r.value} value={r.value} className="bg-navy">
                  {r.label}
                </option>
              ))}
            </select>

            {/* Max Guests */}
            <input
              type="number"
              placeholder={t("charter.maxGuests")}
              min={1}
              max={100}
              value={maxGuests}
              onChange={(e) => setMaxGuests(e.target.value)}
              className="bg-white/5 border border-white/10 rounded-lg text-white text-sm px-3 py-2.5 focus:outline-none focus:border-gold/30 placeholder-gray-600"
            />

            {/* Price range — min + max in one cell */}
            <div className="flex items-stretch gap-1 bg-white/5 border border-white/10 rounded-lg overflow-hidden focus-within:border-gold/30">
              <input
                type="number"
                placeholder="Min €/Tag"
                min={0}
                value={minPrice}
                onChange={(e) => setMinPrice(e.target.value)}
                className="w-1/2 bg-transparent text-white text-sm px-3 py-2.5 focus:outline-none placeholder-gray-600 tabular-nums"
              />
              <span className="text-gray-600 self-center" aria-hidden>–</span>
              <input
                type="number"
                placeholder="Max €/Tag"
                min={0}
                value={maxPrice}
                onChange={(e) => setMaxPrice(e.target.value)}
                className="w-1/2 bg-transparent text-white text-sm px-3 py-2.5 focus:outline-none placeholder-gray-600 tabular-nums"
              />
            </div>
          </div>

          {/* Second row: Skipper toggle */}
          <div className={`mt-3 flex items-center gap-4 ${filtersOpen ? "" : "hidden sm:flex"}`}>
            <button
              onClick={() => setSkipperOnly(!skipperOnly)}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border text-sm transition-all ${
                skipperOnly
                  ? "bg-gold/20 border-gold/40 text-gold"
                  : "bg-white/5 border-white/10 text-gray-400 hover:border-gold/20"
              }`}
            >
              <Ship className="w-4 h-4" />
              {t("charter.onlyWithSkipper")}
            </button>

            {/* Sort */}
            <label className="flex items-center gap-2 text-xs text-gray-400">
              <span className="uppercase tracking-wider">Sortieren</span>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
                className="bg-white/5 border border-white/10 rounded-lg text-white text-sm px-3 py-1.5 focus:outline-none focus:border-gold/30 appearance-none"
              >
                <option value="default" className="bg-navy">Empfohlen</option>
                <option value="price-asc" className="bg-navy">Preis aufsteigend</option>
                <option value="price-desc" className="bg-navy">Preis absteigend</option>
                <option value="guests-desc" className="bg-navy">Größte Crew zuerst</option>
                <option value="newest" className="bg-navy">Neueste zuerst</option>
              </select>
            </label>

            {(boatType || region || maxGuests || minPrice || maxPrice || search || skipperOnly || sortBy !== "default") && (
              <button
                onClick={() => {
                  setBoatType("");
                  setRegion("");
                  setMaxGuests("");
                  setMinPrice("");
                  setMaxPrice("");
                  setSearch("");
                  setSkipperOnly(false);
                  setSortBy("default");
                }}
                className="text-xs text-gray-500 hover:text-gray-300 transition-colors"
              >
                Filter zurücksetzen
              </button>
            )}

            <span className="ml-auto text-sm text-gray-500">
              {total} {total === 1 ? "Boot" : "Boote"} gefunden
            </span>
          </div>
        </div>

        {/* Results */}
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {Array.from({ length: 6 }, (_, i) => (
              <SkeletonCard key={i} />
            ))}
          </div>
        ) : boats.length === 0 ? (
          <div className="text-center py-20">
            <Ship className="w-12 h-12 text-gray-600 mx-auto mb-4" />
            <p className="text-gray-400 text-lg">Keine Boote gefunden</p>
            <p className="text-gray-600 text-sm mt-2">
              Versuche andere Filter oder Suchbegriffe
            </p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {boats.map((boat) => (
                <BoatCard key={boat.id} boat={boat} />
              ))}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-2 mt-12">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page <= 1}
                  className="p-2 rounded-lg bg-white/5 border border-white/10 text-gray-400 hover:border-gold/20 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>

                {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => {
                  let pageNum: number;
                  if (totalPages <= 7) {
                    pageNum = i + 1;
                  } else if (page <= 4) {
                    pageNum = i + 1;
                  } else if (page >= totalPages - 3) {
                    pageNum = totalPages - 6 + i;
                  } else {
                    pageNum = page - 3 + i;
                  }
                  return (
                    <button
                      key={pageNum}
                      onClick={() => setPage(pageNum)}
                      className={`w-10 h-10 rounded-lg text-sm transition-all ${
                        pageNum === page
                          ? "bg-gold/20 border border-gold/40 text-gold"
                          : "bg-white/5 border border-white/10 text-gray-400 hover:border-gold/20"
                      }`}
                    >
                      {pageNum}
                    </button>
                  );
                })}

                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page >= totalPages}
                  className="p-2 rounded-lg bg-white/5 border border-white/10 text-gray-400 hover:border-gold/20 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                >
                  <ChevronRight className="w-5 h-5" />
                </button>
              </div>
            )}
          </>
        )}
      </div>

      <Footer />
    </main>
  );
}
