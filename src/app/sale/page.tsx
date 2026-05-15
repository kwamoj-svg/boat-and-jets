"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { SaleCard, type SaleBoatSummary } from "@/components/SaleCard";
import type { ReactNode } from "react";
import {
  Ship, Loader2, ArrowUpDown, X, ChevronDown,
  Ruler, MapPin, Euro, Calendar, Gauge, Search,
  Sailboat, Zap, Gem, Anchor, Wrench,
} from "lucide-react";

/* ── Standorte / Regionen für den Kauf ── */
const SALE_REGIONS = [
  {
    region: "Mittelmeer",
    countries: [
      { name: "Italien", value: "Italy", flag: "🇮🇹" },
      { name: "Spanien", value: "Spain", flag: "🇪🇸" },
      { name: "Frankreich", value: "France", flag: "🇫🇷" },
      { name: "Kroatien", value: "Croatia", flag: "🇭🇷" },
      { name: "Griechenland", value: "Greece", flag: "🇬🇷" },
      { name: "Türkei", value: "Turkey", flag: "🇹🇷" },
      { name: "Montenegro", value: "Montenegro", flag: "🇲🇪" },
    ],
  },
  {
    region: "Nordeuropa",
    countries: [
      { name: "Deutschland", value: "Germany", flag: "🇩🇪" },
      { name: "Niederlande", value: "Netherlands", flag: "🇳🇱" },
      { name: "Großbritannien", value: "UK", flag: "🇬🇧" },
      { name: "Dänemark", value: "Denmark", flag: "🇩🇰" },
      { name: "Schweden", value: "Sweden", flag: "🇸🇪" },
      { name: "Norwegen", value: "Norway", flag: "🇳🇴" },
      { name: "Finnland", value: "Finland", flag: "🇫🇮" },
      { name: "Polen", value: "Poland", flag: "🇵🇱" },
    ],
  },
  {
    region: "Amerika",
    countries: [
      { name: "USA", value: "USA", flag: "🇺🇸" },
      { name: "Kanada", value: "Canada", flag: "🇨🇦" },
      { name: "Bahamas", value: "Bahamas", flag: "🇧🇸" },
      { name: "Mexiko", value: "Mexico", flag: "🇲🇽" },
    ],
  },
  {
    region: "Orient & Asien",
    countries: [
      { name: "VAE", value: "UAE", flag: "🇦🇪" },
      { name: "Thailand", value: "Thailand", flag: "🇹🇭" },
      { name: "Australien", value: "Australia", flag: "🇦🇺" },
    ],
  },
];

/* ── Bootstypen mit Icons ── */
const BOAT_TYPES: { label: string; value: string; icon: ReactNode }[] = [
  { label: "Segelboot", value: "sailboat", icon: <Sailboat className="w-4 h-4" /> },
  { label: "Motorboot", value: "motorboat", icon: <Zap className="w-4 h-4" /> },
  { label: "Katamaran", value: "catamaran", icon: <Ship className="w-4 h-4" /> },
  { label: "Yacht", value: "yacht", icon: <Anchor className="w-4 h-4" /> },
  { label: "Superyacht", value: "superyacht", icon: <Gem className="w-4 h-4" /> },
  { label: "Speedboot", value: "speedboat", icon: <Zap className="w-4 h-4" /> },
];

/* ── Preisstufen (Kauf) ── */
const PRICE_STEPS = [
  { label: "Bis 25.000 €", max: 25000 },
  { label: "Bis 50.000 €", max: 50000 },
  { label: "Bis 100.000 €", max: 100000 },
  { label: "Bis 250.000 €", max: 250000 },
  { label: "Bis 500.000 €", max: 500000 },
  { label: "Bis 1 Mio. €", max: 1000000 },
  { label: "Über 1 Mio. €", min: 1000000 },
];

const LENGTH_STEPS = [
  { label: "Bis 8 m", max: 8 },
  { label: "Bis 12 m", max: 12 },
  { label: "Bis 15 m", max: 15 },
  { label: "Bis 20 m", max: 20 },
  { label: "Bis 30 m", max: 30 },
  { label: "Über 30 m", min: 30 },
];

const YEAR_STEPS = [
  { label: "Ab 2024", min: 2024 },
  { label: "Ab 2020", min: 2020 },
  { label: "Ab 2015", min: 2015 },
  { label: "Ab 2010", min: 2010 },
  { label: "Ab 2000", min: 2000 },
  { label: "Ab 1990", min: 1990 },
];

const CONDITIONS = [
  { value: "new", label: "Neu", icon: "✨" },
  { value: "like_new", label: "Wie neu", icon: "👌" },
  { value: "good", label: "Gut", icon: "👍" },
  { value: "fair", label: "Gebraucht", icon: "🔧" },
  { value: "project", label: "Projekt", icon: "🛠️" },
];

type SortKey = "featured" | "price_asc" | "price_desc" | "year" | "length";
const SORTS: { key: SortKey; label: string }[] = [
  { key: "featured", label: "Empfohlen" },
  { key: "price_asc", label: "Preis aufsteigend" },
  { key: "price_desc", label: "Preis absteigend" },
  { key: "year", label: "Neueste zuerst" },
  { key: "length", label: "Größte zuerst" },
];

function applySorting(boats: SaleBoatSummary[], sort: SortKey): SaleBoatSummary[] {
  const sorted = [...boats];
  switch (sort) {
    case "featured": break;
    case "price_asc": sorted.sort((a, b) => (a.sale_price || Infinity) - (b.sale_price || Infinity)); break;
    case "price_desc": sorted.sort((a, b) => (b.sale_price || 0) - (a.sale_price || 0)); break;
    case "year": sorted.sort((a, b) => (b.year || 0) - (a.year || 0)); break;
    case "length": sorted.sort((a, b) => (b.length_m || 0) - (a.length_m || 0)); break;
  }
  return sorted;
}

/* ── Dropdown-Wrapper (wie FilterBar) ── */
function Dropdown({ label, icon, value, children, isOpen, onToggle }: {
  label: string; icon: ReactNode; value?: string; children: ReactNode;
  isOpen: boolean; onToggle: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node) && isOpen) onToggle();
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [isOpen, onToggle]);

  return (
    <div ref={ref} className="relative">
      <button
        onClick={onToggle}
        className={`
          flex items-center gap-2 px-4 py-3 rounded-xl text-sm
          transition-all duration-200 whitespace-nowrap border
          ${isOpen
            ? "bg-gold/15 border-gold/40 text-gold"
            : value
              ? "bg-gold/10 border-gold/25 text-gold-light"
              : "bg-white/[0.04] border-white/[0.08] text-gray-400 hover:bg-white/[0.06] hover:text-gray-300"
          }
        `}
      >
        <span className={isOpen ? "text-gold" : value ? "text-gold/70" : "text-gray-500"}>
          {icon}
        </span>
        {value || label}
        <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`} />
      </button>
      {isOpen && (
        <div className="absolute top-full left-0 mt-2 z-50 min-w-[220px] rounded-2xl bg-[#131d2e] border border-white/[0.08] shadow-2xl overflow-hidden animate-fade-in">
          {children}
        </div>
      )}
    </div>
  );
}

/* ── Filter-Tag ── */
function Tag({ children, onRemove }: { children: ReactNode; onRemove: () => void }) {
  return (
    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs bg-gold/10 text-gold border border-gold/25">
      {children}
      <button onClick={onRemove} className="ml-0.5 hover:text-white transition-colors">
        <X className="w-3 h-3" />
      </button>
    </span>
  );
}

/* ── Hauptseite ── */
export default function SalePage() {
  const [search, setSearch] = useState("");
  const [country, setCountry] = useState("");
  const [boatType, setBoatType] = useState("");
  const [condition, setCondition] = useState("");
  const [minPrice, setMinPrice] = useState<number | null>(null);
  const [maxPrice, setMaxPrice] = useState<number | null>(null);
  const [priceLabel, setPriceLabel] = useState("");
  const [minYear, setMinYear] = useState<number | null>(null);
  const [yearLabel, setYearLabel] = useState("");
  const [minLength, setMinLength] = useState<number | null>(null);
  const [maxLength, setMaxLength] = useState<number | null>(null);
  const [lengthLabel, setLengthLabel] = useState("");
  const [results, setResults] = useState<SaleBoatSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [sortBy, setSortBy] = useState<SortKey>("featured");

  const [openDD, setOpenDD] = useState<string | null>(null);
  const [showRegions, setShowRegions] = useState(false);
  const [showSortMenu, setShowSortMenu] = useState(false);
  const regionRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (regionRef.current && !regionRef.current.contains(e.target as Node) && showRegions) setShowRegions(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [showRegions]);

  const toggleDD = useCallback((name: string) => {
    setOpenDD((prev) => (prev === name ? null : name));
    if (name !== "region") setShowRegions(false);
  }, []);

  const fetchBoats = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (search) params.set("q", search);
    if (country) params.set("country", country);
    if (boatType) params.set("type", boatType);
    if (condition) params.set("condition", condition);
    if (minPrice) params.set("minPrice", String(minPrice));
    if (maxPrice) params.set("maxPrice", String(maxPrice));
    if (minYear) params.set("minYear", String(minYear));
    if (minLength) params.set("minLength", String(minLength));
    if (maxLength) params.set("maxLength", String(maxLength));
    params.set("limit", "60");

    try {
      const res = await fetch(`/api/sale?${params}`);
      const data = await res.json();
      setResults(data.boats || []);
    } catch {
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, [search, country, boatType, condition, minPrice, maxPrice, minYear, minLength, maxLength]);

  useEffect(() => {
    fetchBoats();
  }, [fetchBoats]);

  const hasFilters = !!(search || country || boatType || condition || minPrice || maxPrice || minYear || minLength || maxLength);

  const clearAll = useCallback(() => {
    setSearch("");
    setCountry("");
    setBoatType("");
    setCondition("");
    setMinPrice(null);
    setMaxPrice(null);
    setPriceLabel("");
    setMinYear(null);
    setYearLabel("");
    setMinLength(null);
    setMaxLength(null);
    setLengthLabel("");
  }, []);

  const countryDisplayName = country
    ? SALE_REGIONS.flatMap(r => r.countries).find(c => c.value === country)?.name
    : undefined;

  const typeDisplayName = boatType
    ? BOAT_TYPES.find(t => t.value === boatType)?.label
    : undefined;

  const sorted = applySorting(results, sortBy);

  return (
    <main className="min-h-screen bg-[radial-gradient(ellipse_at_top,_var(--color-navy-light)_0%,_var(--color-navy)_70%)]">
      <Navbar />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 pt-24 pb-12">
        {/* Header */}
        <div className="text-center mb-10">
          <h1 className="text-3xl sm:text-4xl font-light text-white mb-2">
            Boote &amp; Yachten kaufen
          </h1>
          <p className="text-gray-400 text-sm max-w-xl mx-auto">
            Gepr&uuml;fte Angebote von Werften, H&auml;ndlern und privaten Verk&auml;ufern.
          </p>
        </div>

        {/* ── Rich FilterBar ── */}
        <div className="w-full max-w-5xl mx-auto mb-8" ref={regionRef}>
          {/* Haupt-Filterzeile */}
          <div className="flex flex-wrap items-center justify-center gap-2">
            {/* Standort / Land */}
            <button
              onClick={() => { setShowRegions(!showRegions); setOpenDD(null); }}
              className={`
                flex items-center gap-2 px-4 py-3 rounded-xl text-sm
                transition-all duration-200 whitespace-nowrap border
                ${showRegions
                  ? "bg-gold/15 border-gold/40 text-gold"
                  : country
                    ? "bg-gold/10 border-gold/25 text-gold-light"
                    : "bg-white/[0.04] border-white/[0.08] text-gray-400 hover:bg-white/[0.06] hover:text-gray-300"
                }
              `}
            >
              <MapPin className={`w-4 h-4 ${showRegions ? "text-gold" : country ? "text-gold/70" : "text-gray-500"}`} />
              {countryDisplayName || "Standort"}
              <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${showRegions ? "rotate-180" : ""}`} />
            </button>

            {/* Bootstyp */}
            <Dropdown
              label="Bootstyp"
              icon={<Ship className="w-4 h-4" />}
              value={typeDisplayName}
              isOpen={openDD === "type"}
              onToggle={() => toggleDD("type")}
            >
              <div className="p-2">
                {BOAT_TYPES.map((t) => {
                  const active = boatType === t.value;
                  return (
                    <button
                      key={t.value}
                      onClick={() => { setBoatType(active ? "" : t.value); setOpenDD(null); }}
                      className={`
                        w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm
                        transition-all duration-150
                        ${active ? "bg-gold/20 text-gold" : "text-gray-300 hover:bg-white/[0.05] hover:text-white"}
                      `}
                    >
                      <span className={active ? "text-gold" : "text-gray-500"}>{t.icon}</span>
                      {t.label}
                      {active && <span className="ml-auto text-gold">✓</span>}
                    </button>
                  );
                })}
              </div>
            </Dropdown>

            {/* Preis */}
            <Dropdown
              label="Preis"
              icon={<Euro className="w-4 h-4" />}
              value={priceLabel || undefined}
              isOpen={openDD === "price"}
              onToggle={() => toggleDD("price")}
            >
              <div className="p-2">
                {PRICE_STEPS.map((p) => {
                  const active = priceLabel === p.label;
                  return (
                    <button
                      key={p.label}
                      onClick={() => {
                        if (active) {
                          setMinPrice(null); setMaxPrice(null); setPriceLabel("");
                        } else {
                          setMinPrice(p.min || null);
                          setMaxPrice(p.max || null);
                          setPriceLabel(p.label);
                        }
                        setOpenDD(null);
                      }}
                      className={`
                        w-full text-left px-4 py-2.5 rounded-lg text-sm transition-all duration-150
                        ${active ? "bg-gold/20 text-gold" : "text-gray-300 hover:bg-white/[0.05] hover:text-white"}
                      `}
                    >
                      {p.label}
                      {active && <span className="ml-2 text-gold">✓</span>}
                    </button>
                  );
                })}
              </div>
            </Dropdown>

            {/* Baujahr */}
            <Dropdown
              label="Baujahr"
              icon={<Calendar className="w-4 h-4" />}
              value={yearLabel || undefined}
              isOpen={openDD === "year"}
              onToggle={() => toggleDD("year")}
            >
              <div className="p-2">
                {YEAR_STEPS.map((y) => {
                  const active = yearLabel === y.label;
                  return (
                    <button
                      key={y.label}
                      onClick={() => {
                        if (active) { setMinYear(null); setYearLabel(""); }
                        else { setMinYear(y.min); setYearLabel(y.label); }
                        setOpenDD(null);
                      }}
                      className={`
                        w-full text-left px-4 py-2.5 rounded-lg text-sm transition-all duration-150
                        ${active ? "bg-gold/20 text-gold" : "text-gray-300 hover:bg-white/[0.05] hover:text-white"}
                      `}
                    >
                      {y.label}
                      {active && <span className="ml-2 text-gold">✓</span>}
                    </button>
                  );
                })}
              </div>
            </Dropdown>

            {/* Länge */}
            <Dropdown
              label="Länge"
              icon={<Ruler className="w-4 h-4" />}
              value={lengthLabel || undefined}
              isOpen={openDD === "length"}
              onToggle={() => toggleDD("length")}
            >
              <div className="p-2">
                {LENGTH_STEPS.map((l) => {
                  const active = lengthLabel === l.label;
                  return (
                    <button
                      key={l.label}
                      onClick={() => {
                        if (active) { setMinLength(null); setMaxLength(null); setLengthLabel(""); }
                        else { setMinLength(l.min || null); setMaxLength(l.max || null); setLengthLabel(l.label); }
                        setOpenDD(null);
                      }}
                      className={`
                        w-full text-left px-4 py-2.5 rounded-lg text-sm transition-all duration-150
                        ${active ? "bg-gold/20 text-gold" : "text-gray-300 hover:bg-white/[0.05] hover:text-white"}
                      `}
                    >
                      {l.label}
                      {active && <span className="ml-2 text-gold">✓</span>}
                    </button>
                  );
                })}
              </div>
            </Dropdown>

            {/* Zustand */}
            <Dropdown
              label="Zustand"
              icon={<Wrench className="w-4 h-4" />}
              value={condition ? CONDITIONS.find(c => c.value === condition)?.label : undefined}
              isOpen={openDD === "condition"}
              onToggle={() => toggleDD("condition")}
            >
              <div className="p-2">
                {CONDITIONS.map((c) => {
                  const active = condition === c.value;
                  return (
                    <button
                      key={c.value}
                      onClick={() => { setCondition(active ? "" : c.value); setOpenDD(null); }}
                      className={`
                        w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm transition-all duration-150
                        ${active ? "bg-gold/20 text-gold" : "text-gray-300 hover:bg-white/[0.05] hover:text-white"}
                      `}
                    >
                      <span className="text-sm">{c.icon}</span>
                      {c.label}
                      {active && <span className="ml-auto text-gold">✓</span>}
                    </button>
                  );
                })}
              </div>
            </Dropdown>

            {/* Suchen-Button */}
            <button
              onClick={fetchBoats}
              className="
                flex items-center gap-2 px-6 py-3 rounded-xl
                gold-gradient text-navy font-semibold text-sm
                hover:shadow-[0_0_20px_rgba(200,165,90,0.3)]
                active:scale-95 transition-all duration-200
              "
            >
              <Search className="w-4 h-4" />
              Suchen
            </button>
          </div>

          {/* ── Freitext-Suche ── */}
          <div className="mt-3 max-w-2xl mx-auto">
            <div className="relative">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && fetchBoats()}
                placeholder="Marke, Modell oder Liegeplatz suchen..."
                className="w-full pl-10 pr-4 py-2.5 bg-white/[0.03] border border-white/[0.06] rounded-xl text-white placeholder-gray-500 text-sm focus:outline-none focus:border-gold/40 transition-colors"
              />
            </div>
          </div>

          {/* ── Region-Grid (Standort-Picker) ── */}
          {showRegions && (
            <div className="mt-4 rounded-2xl bg-[#111b2b]/90 border border-white/[0.06] p-5 animate-fade-in backdrop-blur-sm">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {SALE_REGIONS.map((group) => (
                  <div key={group.region}>
                    <h4 className="text-[11px] uppercase tracking-wider text-gray-500 mb-2 font-medium">
                      {group.region}
                    </h4>
                    <div className="flex flex-col gap-0.5">
                      {group.countries.map((c) => {
                        const active = country === c.value;
                        return (
                          <button
                            key={c.value}
                            onClick={() => {
                              setCountry(active ? "" : c.value);
                              if (!active) setShowRegions(false);
                            }}
                            className={`
                              flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-sm text-left
                              transition-all duration-150
                              ${active
                                ? "bg-gold/20 text-gold"
                                : "text-gray-300 hover:bg-white/[0.05] hover:text-white"
                              }
                            `}
                          >
                            <span className="text-sm leading-none">{c.flag}</span>
                            <span className={active ? "font-medium" : ""}>{c.name}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── Aktive Filter-Tags ── */}
          {hasFilters && (
            <div className="flex flex-wrap items-center justify-center gap-2 mt-3 animate-fade-in">
              {country && (
                <Tag onRemove={() => setCountry("")}>
                  <MapPin className="w-3 h-3" /> {countryDisplayName}
                </Tag>
              )}
              {boatType && (
                <Tag onRemove={() => setBoatType("")}>
                  {typeDisplayName}
                </Tag>
              )}
              {priceLabel && (
                <Tag onRemove={() => { setMinPrice(null); setMaxPrice(null); setPriceLabel(""); }}>
                  <Euro className="w-3 h-3" /> {priceLabel}
                </Tag>
              )}
              {yearLabel && (
                <Tag onRemove={() => { setMinYear(null); setYearLabel(""); }}>
                  <Calendar className="w-3 h-3" /> {yearLabel}
                </Tag>
              )}
              {lengthLabel && (
                <Tag onRemove={() => { setMinLength(null); setMaxLength(null); setLengthLabel(""); }}>
                  <Ruler className="w-3 h-3" /> {lengthLabel}
                </Tag>
              )}
              {condition && (
                <Tag onRemove={() => setCondition("")}>
                  <Gauge className="w-3 h-3" /> {CONDITIONS.find(c => c.value === condition)?.label}
                </Tag>
              )}
              {search && (
                <Tag onRemove={() => setSearch("")}>
                  <Search className="w-3 h-3" /> {search}
                </Tag>
              )}
              <button onClick={clearAll} className="text-xs text-gray-500 hover:text-gray-300 underline ml-1 transition-colors">
                Alle löschen
              </button>
            </div>
          )}
        </div>

        {/* ── Ergebnis-Kopfzeile ── */}
        <div className="flex items-center justify-between mb-5">
          <span className="text-sm text-gray-400">
            {loading ? (
              <span className="flex items-center gap-1.5">
                <Loader2 className="w-3.5 h-3.5 animate-spin" /> Suche...
              </span>
            ) : (
              <><span className="text-gold font-medium">{results.length}</span> Boote</>
            )}
          </span>

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

        {/* ── Ergebnisse ── */}
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
                onClick={clearAll}
                className="px-5 py-2.5 bg-gold/90 hover:bg-gold text-navy text-sm font-medium rounded-xl transition-colors"
              >
                Filter zurücksetzen
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {sorted.map((boat, i) => (
              <SaleCard
                key={`${boat.slug}-${i}`}
                boat={boat}
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
