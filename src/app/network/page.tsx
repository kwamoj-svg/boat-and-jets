"use client";

import { useState, useEffect, useCallback } from "react";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import {
  Globe, Shield, Star, Phone, Mail, ExternalLink,
  Search, Filter, ChevronDown, Sparkles,
  MapPin, Ship, Crown, Clock, Users, Languages, AtSign,
} from "lucide-react";

interface NetworkPartner {
  id: string;
  company_name: string;
  country: string;
  region: string;
  city?: string;
  marina?: string;
  website?: string;
  email?: string;
  phone?: string;
  whatsapp?: string;
  instagram?: string;
  categories: string[];
  luxury_score: number;
  ai_quality_score: number;
  price_level: string;
  response_time: string;
  languages: string[];
  vip_friendly: boolean;
  verified: boolean;
  fleet_size?: number;
  description?: string;
  operating_regions: string[];
  peak_season?: string;
  booking_url?: string;
  logo_url?: string;
}

const REGIONS = [
  { value: "", label: "Alle Regionen" },
  { value: "dubai", label: "Dubai" },
  { value: "monaco", label: "Monaco" },
  { value: "french_riviera", label: "French Riviera" },
  { value: "greece", label: "Greece" },
  { value: "croatia", label: "Croatia" },
  { value: "turkey", label: "Turkey" },
  { value: "italy", label: "Italy" },
  { value: "sardinia", label: "Sardinia" },
  { value: "spain", label: "Spain" },
  { value: "ibiza", label: "Ibiza" },
  { value: "mallorca", label: "Mallorca" },
  { value: "miami", label: "Miami" },
  { value: "caribbean", label: "Caribbean" },
  { value: "bahamas", label: "Bahamas" },
  { value: "maldives", label: "Maldives" },
  { value: "seychelles", label: "Seychelles" },
  { value: "thailand", label: "Thailand" },
];

const CATEGORIES = [
  { value: "", label: "Alle Services" },
  { value: "luxury_yacht", label: "Luxury Yacht" },
  { value: "superyacht", label: "Superyacht" },
  { value: "day_charter", label: "Day Charter" },
  { value: "crewed_charter", label: "Crewed Charter" },
  { value: "bareboat", label: "Bareboat" },
  { value: "sailing", label: "Sailing" },
  { value: "catamaran", label: "Catamaran" },
  { value: "motor_yacht", label: "Motor Yacht" },
  { value: "gulet", label: "Gulet" },
  { value: "vip_services", label: "VIP Services" },
  { value: "event_charter", label: "Event Charter" },
  { value: "fishing", label: "Fishing" },
  { value: "diving", label: "Diving" },
];

function LuxuryStars({ score }: { score: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {Array.from({ length: 10 }, (_, i) => (
        <div
          key={i}
          className={`w-2 h-2 rounded-full ${
            i < score ? "bg-gold" : "bg-white/10"
          }`}
        />
      ))}
    </div>
  );
}

function PriceDots({ level }: { level: string }) {
  const count = level.length;
  return (
    <span className="text-gold font-medium tracking-wider">
      {level}
    </span>
  );
}

function CategoryBadge({ cat }: { cat: string }) {
  const label = cat.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase());
  return (
    <span className="px-2 py-0.5 rounded-full bg-white/5 border border-white/10 text-xs text-gray-400">
      {label}
    </span>
  );
}

export default function NetworkPage() {
  const [partners, setPartners] = useState<NetworkPartner[]>([]);
  const [loading, setLoading] = useState(true);
  const [region, setRegion] = useState("");
  const [category, setCategory] = useState("");
  const [search, setSearch] = useState("");
  const [minLuxury, setMinLuxury] = useState(0);
  const [vipOnly, setVipOnly] = useState(false);

  const fetchPartners = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (region) params.set("region", region);
    if (category) params.set("category", category);
    if (minLuxury > 0) params.set("min_luxury", String(minLuxury));
    if (vipOnly) params.set("vip", "true");
    if (search) params.set("q", search);

    try {
      const res = await fetch(`/api/network?${params}`);
      const data = await res.json();
      setPartners(data.results || []);
    } catch {
      setPartners([]);
    } finally {
      setLoading(false);
    }
  }, [region, category, minLuxury, vipOnly, search]);

  useEffect(() => {
    fetchPartners();
  }, [fetchPartners]);

  return (
    <main className="relative min-h-screen bg-navy">
      <div className="fixed inset-0 -z-10">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--color-navy-light)_0%,_var(--color-navy)_70%)]" />
      </div>

      <Navbar />

      <div className="pt-24 pb-16 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="flex items-center justify-center gap-3 mb-4">
            <Shield className="w-8 h-8 text-gold" />
            <h1 className="text-3xl sm:text-4xl font-light text-white tracking-wide">
              Verified Global Yacht Network
            </h1>
          </div>
          <p className="text-gray-400 text-lg max-w-2xl mx-auto">
            Curated, verified charter operators worldwide — with AI quality scores,
            luxury ratings, and direct contact information.
          </p>
          <div className="flex items-center justify-center gap-6 mt-6 text-sm text-gray-500">
            <span className="flex items-center gap-1.5">
              <Globe className="w-4 h-4 text-gold/60" />
              {partners.length > 0 ? `${partners.length} Partners` : "Global Network"}
            </span>
            <span className="flex items-center gap-1.5">
              <Shield className="w-4 h-4 text-gold/60" />
              Verified & Scored
            </span>
            <span className="flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-gold/60" />
              AI-Powered Intelligence
            </span>
          </div>
        </div>

        {/* Filters */}
        <div className="glass rounded-2xl p-6 mb-8 border border-white/10">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            {/* Search */}
            <div className="relative lg:col-span-2">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
              <input
                type="text"
                placeholder="Unternehmen suchen..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && fetchPartners()}
                className="w-full pl-10 pr-4 py-2.5 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-600 text-sm focus:outline-none focus:border-gold/30"
              />
            </div>

            {/* Region */}
            <select
              value={region}
              onChange={(e) => setRegion(e.target.value)}
              className="bg-white/5 border border-white/10 rounded-lg text-white text-sm px-3 py-2.5 focus:outline-none focus:border-gold/30 appearance-none"
            >
              {REGIONS.map((r) => (
                <option key={r.value} value={r.value} className="bg-navy">{r.label}</option>
              ))}
            </select>

            {/* Category */}
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="bg-white/5 border border-white/10 rounded-lg text-white text-sm px-3 py-2.5 focus:outline-none focus:border-gold/30 appearance-none"
            >
              {CATEGORIES.map((c) => (
                <option key={c.value} value={c.value} className="bg-navy">{c.label}</option>
              ))}
            </select>

            {/* VIP Filter */}
            <button
              onClick={() => setVipOnly(!vipOnly)}
              className={`flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg border text-sm transition-all ${
                vipOnly
                  ? "bg-gold/20 border-gold/40 text-gold"
                  : "bg-white/5 border-white/10 text-gray-400 hover:border-gold/20"
              }`}
            >
              <Crown className="w-4 h-4" />
              VIP Only
            </button>
          </div>
        </div>

        {/* Results */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {Array.from({ length: 6 }, (_, i) => (
              <div key={i} className="glass rounded-2xl p-6 border border-white/10 animate-pulse h-[280px]" />
            ))}
          </div>
        ) : partners.length === 0 ? (
          <div className="text-center py-20">
            <Ship className="w-12 h-12 text-gray-600 mx-auto mb-4" />
            <p className="text-gray-400 text-lg">Keine Partner gefunden</p>
            <p className="text-gray-600 text-sm mt-2">Versuche andere Filter oder Suchbegriffe</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {partners.map((p) => (
              <div
                key={p.id}
                className="glass rounded-2xl p-6 border border-white/10 hover:border-gold/20 transition-all duration-300 group"
              >
                {/* Header */}
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="text-lg font-medium text-white group-hover:text-gold-light transition-colors">
                        {p.company_name}
                      </h3>
                      {p.verified && (
                        <Shield className="w-4 h-4 text-gold flex-shrink-0" />
                      )}
                      {p.vip_friendly && (
                        <Crown className="w-4 h-4 text-amber-400 flex-shrink-0" />
                      )}
                    </div>
                    <div className="flex items-center gap-2 text-sm text-gray-400">
                      <MapPin className="w-3.5 h-3.5" />
                      {[p.marina, p.city, p.country].filter(Boolean).join(", ")}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-xs text-gray-500 mb-1">AI Score</div>
                    <div className="text-lg font-medium text-gold">{p.ai_quality_score}</div>
                  </div>
                </div>

                {/* Scores Row */}
                <div className="flex items-center gap-6 mb-4">
                  <div>
                    <div className="text-xs text-gray-500 mb-1">Luxury</div>
                    <LuxuryStars score={p.luxury_score} />
                  </div>
                  <div>
                    <div className="text-xs text-gray-500 mb-1">Preis</div>
                    <PriceDots level={p.price_level} />
                  </div>
                  {p.fleet_size && (
                    <div>
                      <div className="text-xs text-gray-500 mb-1">Flotte</div>
                      <span className="text-sm text-white">{p.fleet_size} Boote</span>
                    </div>
                  )}
                  {p.response_time !== "unknown" && (
                    <div>
                      <div className="text-xs text-gray-500 mb-1">Antwort</div>
                      <span className="text-sm text-green-400 flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {p.response_time === "instant" ? "Sofort" :
                         p.response_time === "within_1h" ? "<1h" : "<24h"}
                      </span>
                    </div>
                  )}
                </div>

                {/* Description */}
                {p.description && (
                  <p className="text-sm text-gray-400 mb-4 line-clamp-2">{p.description}</p>
                )}

                {/* Categories */}
                <div className="flex flex-wrap gap-1.5 mb-4">
                  {p.categories.slice(0, 5).map((cat) => (
                    <CategoryBadge key={cat} cat={cat} />
                  ))}
                  {p.categories.length > 5 && (
                    <span className="px-2 py-0.5 text-xs text-gray-500">+{p.categories.length - 5}</span>
                  )}
                </div>

                {/* Languages */}
                <div className="flex items-center gap-1.5 text-xs text-gray-500 mb-4">
                  <Languages className="w-3.5 h-3.5" />
                  {p.languages.map(l => l.toUpperCase()).join(", ")}
                  {p.peak_season && (
                    <>
                      <span className="mx-2">|</span>
                      <span>Saison: {p.peak_season}</span>
                    </>
                  )}
                </div>

                {/* Contact Actions */}
                <div className="flex items-center gap-2 pt-3 border-t border-white/5">
                  {p.website && (
                    <a
                      href={p.website}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gold/10 text-gold text-xs hover:bg-gold/20 transition-colors"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      Website
                    </a>
                  )}
                  {p.email && (
                    <a
                      href={`mailto:${p.email}`}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 text-gray-300 text-xs hover:bg-white/10 transition-colors"
                    >
                      <Mail className="w-3.5 h-3.5" />
                      E-Mail
                    </a>
                  )}
                  {p.phone && (
                    <a
                      href={`tel:${p.phone}`}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 text-gray-300 text-xs hover:bg-white/10 transition-colors"
                    >
                      <Phone className="w-3.5 h-3.5" />
                      Anrufen
                    </a>
                  )}
                  {p.instagram && (
                    <a
                      href={`https://instagram.com/${p.instagram.replace("@", "")}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 text-gray-300 text-xs hover:bg-white/10 transition-colors"
                    >
                      <AtSign className="w-3.5 h-3.5" />
                    </a>
                  )}
                  {p.booking_url && (
                    <a
                      href={p.booking_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="ml-auto flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-gradient-to-r from-gold to-gold-light text-navy text-xs font-medium hover:opacity-90 transition-opacity"
                    >
                      Buchen
                    </a>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <Footer />
    </main>
  );
}
