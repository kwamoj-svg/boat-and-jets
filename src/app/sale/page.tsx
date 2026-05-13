"use client";

import { useState, useEffect, useCallback } from "react";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { ListingCard } from "@/components/ListingCard";
import { Ship, Tag, Loader2 } from "lucide-react";
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
  { value: "Netherlands", label: "Niederlande" },
  { value: "USA", label: "USA" },
  { value: "UAE", label: "VAE" },
];

const CONDITIONS = [
  { value: "", label: "Jeder Zustand" },
  { value: "new", label: "Neu" },
  { value: "like_new", label: "Wie neu" },
  { value: "good", label: "Gut" },
  { value: "fair", label: "Mäßig" },
  { value: "project", label: "Projekt" },
];

export default function SalePage() {
  const [search, setSearch] = useState("");
  const [country, setCountry] = useState("");
  const [boatType, setBoatType] = useState("");
  const [condition, setCondition] = useState("");
  const [maxPrice, setMaxPrice] = useState("");
  const [minYear, setMinYear] = useState("");
  const [results, setResults] = useState<ExtractedListing[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchBoats = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (search) params.set("q", search);
    if (country) params.set("country", country);
    if (boatType) params.set("type", boatType);
    if (condition) params.set("condition", condition);
    if (maxPrice) params.set("maxPrice", maxPrice);
    if (minYear) params.set("minYear", minYear);

    try {
      const res = await fetch(`/api/sale?${params}`);
      const data = await res.json();
      setResults(data.results || []);
    } catch {
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, [search, country, boatType, condition, maxPrice, minYear]);

  useEffect(() => {
    fetchBoats();
  }, [fetchBoats]);

  return (
    <main className="min-h-screen bg-[radial-gradient(ellipse_at_top,_var(--color-navy-light)_0%,_var(--color-navy)_70%)]">
      <Navbar />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 pt-24 pb-12">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-3 mb-3">
            <Tag className="w-8 h-8 text-gold" />
            <h1 className="text-3xl sm:text-4xl font-light text-white">
              Bootkauf
            </h1>
          </div>
          <p className="text-gray-400 text-sm">
            Boote zum Verkauf — weltweit, neu &amp; gebraucht
          </p>
        </div>

        {/* Filters */}
        <div className="bg-white/[0.02] border border-white/5 rounded-2xl p-4 mb-8">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Marke, Modell, Ort..."
              className="lg:col-span-2 px-4 py-2.5 bg-navy/50 border border-white/10 rounded-lg text-white placeholder-gray-500 text-sm focus:outline-none focus:border-gold/50"
            />
            <select
              value={boatType}
              onChange={(e) => setBoatType(e.target.value)}
              className="px-4 py-2.5 bg-navy/50 border border-white/10 rounded-lg text-white text-sm focus:outline-none focus:border-gold/50"
            >
              {BOAT_TYPES.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
            <select
              value={country}
              onChange={(e) => setCountry(e.target.value)}
              className="px-4 py-2.5 bg-navy/50 border border-white/10 rounded-lg text-white text-sm focus:outline-none focus:border-gold/50"
            >
              {COUNTRIES.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
            <input
              type="number"
              value={maxPrice}
              onChange={(e) => setMaxPrice(e.target.value)}
              placeholder="Max Preis €"
              className="px-4 py-2.5 bg-navy/50 border border-white/10 rounded-lg text-white placeholder-gray-500 text-sm focus:outline-none focus:border-gold/50"
            />
            <input
              type="number"
              value={minYear}
              onChange={(e) => setMinYear(e.target.value)}
              placeholder="Ab Baujahr"
              className="px-4 py-2.5 bg-navy/50 border border-white/10 rounded-lg text-white placeholder-gray-500 text-sm focus:outline-none focus:border-gold/50"
            />
          </div>
          <div className="mt-3 grid grid-cols-1 sm:grid-cols-3 gap-3">
            <select
              value={condition}
              onChange={(e) => setCondition(e.target.value)}
              className="px-4 py-2.5 bg-navy/50 border border-white/10 rounded-lg text-white text-sm focus:outline-none focus:border-gold/50"
            >
              {CONDITIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
            <div className="sm:col-span-2 flex items-center justify-end gap-3">
              <a
                href="/profile/alerts"
                className="text-sm text-gold/80 hover:text-gold transition-colors"
              >
                🔔 Alert für Modell anlegen
              </a>
              <span className="text-sm text-gray-500">
                {loading ? "..." : `${results.length} Boote`}
              </span>
            </div>
          </div>
        </div>

        {/* Results */}
        {loading ? (
          <div className="text-center py-20">
            <Loader2 className="w-8 h-8 text-gold animate-spin mx-auto" />
            <p className="text-gray-500 text-sm mt-3">Lade Verkaufsboote...</p>
          </div>
        ) : results.length === 0 ? (
          <div className="text-center py-20 bg-white/[0.02] border border-white/5 rounded-2xl">
            <Ship className="w-12 h-12 text-gray-600 mx-auto mb-4" />
            <h2 className="text-white text-xl font-light mb-2">
              Noch keine Boote
            </h2>
            <p className="text-gray-500 text-sm max-w-md mx-auto">
              Der Sale-Scraper sammelt gerade Daten von YachtWorld, BoatTrader und
              anderen Marktplätzen. Schau in 1-2 Stunden wieder vorbei oder lege
              einen Alert für ein bestimmtes Modell an.
            </p>
            <a
              href="/profile/alerts"
              className="inline-block mt-6 px-5 py-2.5 bg-gold/90 hover:bg-gold text-navy text-sm font-medium rounded-xl transition-colors"
            >
              🔔 Modell-Alert anlegen
            </a>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {results.map((boat, i) => (
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
