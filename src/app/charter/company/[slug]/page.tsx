"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import {
  Anchor, Ship, MapPin, Users, Ruler, Star, Phone, Mail,
  ExternalLink, Globe, ChevronLeft, Bed, Shield,
  Calendar, Languages as LanguagesIcon,
} from "lucide-react";

/* ─── Types ─── */

interface Company {
  id: string;
  company_name: string;
  slug: string;
  company_type: string;
  country: string;
  region: string | null;
  city: string | null;
  marina: string | null;
  phone: string | null;
  email: string | null;
  website: string | null;
  whatsapp: string | null;
  instagram: string | null;
  languages: string[];
  description: string | null;
  logo_url: string | null;
  cover_image: string | null;
  fleet_size: number;
  year_founded: string | null;
  rating: number | null;
  review_count: number;
  verified: boolean;
  services: string[];
  operating_regions: string[];
  certifications: string[];
}

interface Boat {
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
  currency: string;
  base_port: string | null;
  country: string | null;
  features: string[];
  images: string[];
  charter_type: string;
  license_required: boolean;
}

/* ─── Helpers ─── */

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

const SERVICE_LABELS: Record<string, string> = {
  bareboat: "Bareboat",
  skippered: "Mit Skipper",
  crewed: "Mit Crew",
  day_charter: "Tagescharter",
  luxury_yacht: "Luxusyacht",
  catamaran: "Katamaran",
  sailing: "Segeln",
  motor_yacht: "Motoryacht",
};

/* ─── Components ─── */

function StarRating({ rating }: { rating: number }) {
  return (
    <div className="flex items-center gap-1">
      {Array.from({ length: 5 }, (_, i) => (
        <Star
          key={i}
          className={`w-4 h-4 ${i < Math.round(rating) ? "text-gold fill-gold" : "text-white/10"}`}
        />
      ))}
    </div>
  );
}

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

function FleetBoatCard({ boat }: { boat: Boat }) {
  const hasImage = boat.images && boat.images.length > 0;
  return (
    <div className="glass rounded-2xl border border-white/10 hover:border-gold/20 transition-all duration-300 group overflow-hidden flex flex-col">
      <div className="relative h-44 overflow-hidden">
        {hasImage ? (
          <img
            src={boat.images[0]}
            alt={boat.name}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-navy-light via-navy to-gold/10 flex items-center justify-center">
            <Ship className="w-10 h-10 text-white/10" />
          </div>
        )}
        <div className="absolute top-3 left-3">
          <BoatTypeBadge type={boat.boat_type} />
        </div>
      </div>

      <div className="p-4 flex flex-col flex-1">
        <h3 className="text-white font-medium group-hover:text-gold-light transition-colors line-clamp-1 mb-1">
          {boat.name}
        </h3>
        {(boat.brand || boat.model) && (
          <p className="text-xs text-gray-500 mb-2">
            {[boat.brand, boat.model].filter(Boolean).join(" ")}
          </p>
        )}

        <div className="flex items-center gap-3 text-sm text-gray-400 mb-3">
          {boat.length_m && (
            <span className="flex items-center gap-1">
              <Ruler className="w-3.5 h-3.5" />
              {boat.length_m}m
            </span>
          )}
          {boat.cabins != null && boat.cabins > 0 && (
            <span className="flex items-center gap-1">
              <Bed className="w-3.5 h-3.5" />
              {boat.cabins}
            </span>
          )}
          {boat.max_guests != null && boat.max_guests > 0 && (
            <span className="flex items-center gap-1">
              <Users className="w-3.5 h-3.5" />
              {boat.max_guests}
            </span>
          )}
        </div>

        <div className="mt-auto flex items-end justify-between pt-3 border-t border-white/5">
          <div>
            {boat.price_per_day != null && (
              <span className="text-gold font-medium">
                {boat.price_per_day.toLocaleString("de-DE")} {boat.currency || "EUR"}
                <span className="text-xs text-gray-500 font-normal ml-1">/Tag</span>
              </span>
            )}
          </div>
          <Link
            href={`/charter/${boat.slug}`}
            className="px-3 py-1.5 rounded-lg bg-gradient-to-r from-gold to-gold-light text-navy text-xs font-medium hover:opacity-90 transition-opacity"
          >
            Details
          </Link>
        </div>
      </div>
    </div>
  );
}

/* ─── Page ─── */

export default function CompanyDetailPage() {
  const params = useParams();
  const slug = typeof params.slug === "string" ? params.slug : "";

  const [company, setCompany] = useState<Company | null>(null);
  const [boats, setBoats] = useState<Boat[]>([]);
  const [loading, setLoading] = useState(true);
  const [typeFilter, setTypeFilter] = useState("");

  useEffect(() => {
    if (!slug) return;
    setLoading(true);

    fetch(`/api/charter?view=company&slug=${encodeURIComponent(slug)}`)
      .then((r) => r.json())
      .then((data) => {
        setCompany(data.company || null);
        setBoats(data.boats || []);
      })
      .catch(() => {
        setCompany(null);
        setBoats([]);
      })
      .finally(() => setLoading(false));
  }, [slug]);

  const filteredBoats = typeFilter
    ? boats.filter((b) => b.boat_type === typeFilter)
    : boats;

  const boatTypes = Array.from(new Set(boats.map((b) => b.boat_type)));

  if (loading) {
    return (
      <main className="relative min-h-screen bg-navy">
        <div className="fixed inset-0 -z-10">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--color-navy-light)_0%,_var(--color-navy)_70%)]" />
        </div>
        <Navbar />
        <div className="pt-24 pb-16 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
          <div className="glass rounded-2xl p-8 border border-white/10 animate-pulse h-64 mb-8" />
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {Array.from({ length: 6 }, (_, i) => (
              <div key={i} className="glass rounded-2xl border border-white/10 animate-pulse h-72" />
            ))}
          </div>
        </div>
        <Footer />
      </main>
    );
  }

  if (!company) {
    return (
      <main className="relative min-h-screen bg-navy">
        <div className="fixed inset-0 -z-10">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--color-navy-light)_0%,_var(--color-navy)_70%)]" />
        </div>
        <Navbar />
        <div className="pt-24 pb-16 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto text-center">
          <Ship className="w-12 h-12 text-gray-600 mx-auto mb-4" />
          <p className="text-gray-400 text-lg">Unternehmen nicht gefunden</p>
          <Link href="/charter" className="text-gold text-sm mt-4 inline-block hover:text-gold-light transition-colors">
            Zurück zum Katalog
          </Link>
        </div>
        <Footer />
      </main>
    );
  }

  return (
    <main className="relative min-h-screen bg-navy">
      <div className="fixed inset-0 -z-10">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--color-navy-light)_0%,_var(--color-navy)_70%)]" />
      </div>

      <Navbar />

      <div className="pt-24 pb-16 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        {/* Back link */}
        <Link
          href="/charter"
          className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gold-light transition-colors mb-6"
        >
          <ChevronLeft className="w-4 h-4" />
          Zurück zum Katalog
        </Link>

        {/* Company Header */}
        <div className="glass rounded-2xl p-6 sm:p-8 border border-white/10 mb-8">
          <div className="flex flex-col lg:flex-row lg:items-start gap-6">
            {/* Logo / Icon */}
            <div className="w-20 h-20 rounded-xl bg-gradient-to-br from-gold/20 to-gold/5 border border-gold/20 flex items-center justify-center flex-shrink-0">
              {company.logo_url ? (
                <img
                  src={company.logo_url}
                  alt={company.company_name}
                  className="w-16 h-16 object-contain rounded-lg"
                />
              ) : (
                <Anchor className="w-8 h-8 text-gold" />
              )}
            </div>

            {/* Info */}
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2 flex-wrap">
                <h1 className="text-2xl sm:text-3xl font-light text-white">
                  {company.company_name}
                </h1>
                {company.verified && (
                  <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-gold/10 border border-gold/20 text-gold text-xs">
                    <Shield className="w-3 h-3" />
                    Verifiziert
                  </span>
                )}
              </div>

              <div className="flex items-center gap-2 text-gray-400 mb-3">
                <MapPin className="w-4 h-4" />
                <span>
                  {[company.marina, company.city, company.region, company.country]
                    .filter(Boolean)
                    .join(", ")}
                </span>
              </div>

              {/* Rating */}
              {company.rating != null && (
                <div className="flex items-center gap-3 mb-4">
                  <StarRating rating={company.rating} />
                  <span className="text-gold font-medium">{company.rating.toFixed(1)}</span>
                  {company.review_count > 0 && (
                    <span className="text-gray-500 text-sm">
                      ({company.review_count} Bewertungen)
                    </span>
                  )}
                </div>
              )}

              {/* Meta row */}
              <div className="flex flex-wrap items-center gap-4 text-sm text-gray-400 mb-4">
                {company.fleet_size > 0 && (
                  <span className="flex items-center gap-1.5">
                    <Ship className="w-4 h-4 text-gold/60" />
                    {company.fleet_size} Boote
                  </span>
                )}
                {company.year_founded && (
                  <span className="flex items-center gap-1.5">
                    <Calendar className="w-4 h-4 text-gold/60" />
                    Seit {company.year_founded}
                  </span>
                )}
                {company.languages && company.languages.length > 0 && (
                  <span className="flex items-center gap-1.5">
                    <LanguagesIcon className="w-4 h-4 text-gold/60" />
                    {company.languages.map((l) => l.toUpperCase()).join(", ")}
                  </span>
                )}
              </div>

              {/* Services */}
              {company.services && company.services.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mb-4">
                  {company.services.map((s) => (
                    <span
                      key={s}
                      className="px-2.5 py-1 rounded-full bg-gold/10 border border-gold/20 text-xs text-gold"
                    >
                      {SERVICE_LABELS[s] || s.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())}
                    </span>
                  ))}
                </div>
              )}

              {/* Description */}
              {company.description && (
                <p className="text-gray-400 text-sm leading-relaxed max-w-3xl">
                  {company.description}
                </p>
              )}
            </div>

            {/* Contact column */}
            <div className="flex flex-col gap-2 lg:min-w-[180px]">
              {company.website && (
                <a
                  href={company.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 px-4 py-2 rounded-lg bg-gold/10 text-gold text-sm hover:bg-gold/20 transition-colors"
                >
                  <Globe className="w-4 h-4" />
                  Website
                </a>
              )}
              {company.email && (
                <a
                  href={`mailto:${company.email}`}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg bg-white/5 text-gray-300 text-sm hover:bg-white/10 transition-colors"
                >
                  <Mail className="w-4 h-4" />
                  E-Mail
                </a>
              )}
              {company.phone && (
                <a
                  href={`tel:${company.phone}`}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg bg-white/5 text-gray-300 text-sm hover:bg-white/10 transition-colors"
                >
                  <Phone className="w-4 h-4" />
                  Anrufen
                </a>
              )}
              {company.whatsapp && (
                <a
                  href={`https://wa.me/${company.whatsapp.replace(/[^0-9]/g, "")}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 px-4 py-2 rounded-lg bg-white/5 text-gray-300 text-sm hover:bg-white/10 transition-colors"
                >
                  <Phone className="w-4 h-4" />
                  WhatsApp
                </a>
              )}
              {company.instagram && (
                <a
                  href={`https://instagram.com/${company.instagram.replace("@", "")}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 px-4 py-2 rounded-lg bg-white/5 text-gray-300 text-sm hover:bg-white/10 transition-colors"
                >
                  <ExternalLink className="w-4 h-4" />
                  Instagram
                </a>
              )}
            </div>
          </div>
        </div>

        {/* Fleet Section */}
        <div className="mb-6 flex items-center justify-between flex-wrap gap-4">
          <h2 className="text-xl font-light text-white">
            Flotte
            <span className="text-gray-500 text-base ml-2">({filteredBoats.length})</span>
          </h2>

          {boatTypes.length > 1 && (
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setTypeFilter("")}
                className={`px-3 py-1 rounded-lg text-xs border transition-all ${
                  typeFilter === ""
                    ? "bg-gold/20 border-gold/40 text-gold"
                    : "bg-white/5 border-white/10 text-gray-400 hover:border-gold/20"
                }`}
              >
                Alle
              </button>
              {boatTypes.map((t) => (
                <button
                  key={t}
                  onClick={() => setTypeFilter(t)}
                  className={`px-3 py-1 rounded-lg text-xs border transition-all ${
                    typeFilter === t
                      ? "bg-gold/20 border-gold/40 text-gold"
                      : "bg-white/5 border-white/10 text-gray-400 hover:border-gold/20"
                  }`}
                >
                  {boatTypeLabel(t)}
                </button>
              ))}
            </div>
          )}
        </div>

        {filteredBoats.length === 0 ? (
          <div className="text-center py-16">
            <Ship className="w-10 h-10 text-gray-600 mx-auto mb-3" />
            <p className="text-gray-400">Keine Boote in dieser Kategorie</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredBoats.map((boat) => (
              <FleetBoatCard key={boat.id} boat={boat} />
            ))}
          </div>
        )}
      </div>

      <Footer />
    </main>
  );
}
