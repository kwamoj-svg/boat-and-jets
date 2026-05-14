"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { AddToCrmButton } from "@/components/AddToCrmButton";
import { getFallbackBoatImage } from "@/lib/boat-images";
import { localizedBoataroundUrlClient } from "@/lib/boataround-url";
import { useT } from "@/lib/i18n/LanguageProvider";
import type { ExtractedListing } from "@/lib/claude-ai";
import {
  Anchor, Ship, MapPin, Users, Ruler, Star, Phone, Mail,
  ExternalLink, Globe, ChevronLeft, Bed, Waves, Fuel, Shield,
  Dog, Cigarette, Calendar, Heart,
} from "lucide-react";

/* ─── Types ─── */

interface BoatCompany {
  id: string;
  company_name: string;
  slug: string;
  country: string;
  city: string | null;
  phone: string | null;
  email: string | null;
  website: string | null;
  rating: number | null;
  review_count: number;
}

interface BoatDetail {
  id: string;
  company_id: string;
  name: string;
  slug: string;
  boat_type: string;
  brand: string | null;
  model: string | null;
  year: number | null;
  length_m: number | null;
  beam_m: number | null;
  draft_m: number | null;
  cabins: number | null;
  berths: number | null;
  heads: number | null;
  max_guests: number | null;
  crew_size: number;
  engine_type: string | null;
  engine_hp: number | null;
  fuel_type: string | null;
  water_tank_l: number | null;
  fuel_tank_l: number | null;
  price_per_day: number | null;
  price_per_week: number | null;
  price_per_hour: number | null;
  currency: string;
  deposit: number | null;
  skipper_price: number | null;
  base_port: string | null;
  country: string | null;
  region: string | null;
  available_from: string | null;
  available_to: string | null;
  min_charter_days: number;
  features: string[];
  images: string[];
  description: string | null;
  charter_type: string;
  license_required: boolean;
  pets_allowed: boolean;
  smoking_allowed: boolean;
  detail_url: string | null;
  source: string | null;
  charter_companies: BoatCompany | null;
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

const CHARTER_TYPE_LABELS: Record<string, string> = {
  bareboat: "Bareboat",
  skippered: "Mit Skipper",
  crewed: "Mit Crew",
};

function boatTypeLabel(type: string): string {
  return TYPE_LABELS[type] || type.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function formatPrice(val: number | null, currency: string): string {
  if (val == null) return "—";
  return `${val.toLocaleString("de-DE")} ${currency}`;
}

/* ─── Components ─── */

function SpecItem({ icon, label, value }: { icon: React.ReactNode; label: string; value: string | number | null }) {
  if (value == null || value === "" || value === 0) return null;
  return (
    <div className="flex items-center gap-3 py-3 border-b border-white/5 last:border-0">
      <div className="text-gold/60">{icon}</div>
      <span className="text-gray-500 text-sm flex-1">{label}</span>
      <span className="text-white text-sm font-medium">{value}</span>
    </div>
  );
}

function StarRating({ rating }: { rating: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {Array.from({ length: 5 }, (_, i) => (
        <Star
          key={i}
          className={`w-3.5 h-3.5 ${i < Math.round(rating) ? "text-gold fill-gold" : "text-white/10"}`}
        />
      ))}
    </div>
  );
}

/* ─── Page ─── */

export default function BoatDetailPage() {
  const params = useParams();
  const slug = typeof params.slug === "string" ? params.slug : "";
  const { locale } = useT();

  const [boat, setBoat] = useState<BoatDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeImage, setActiveImage] = useState(0);

  useEffect(() => {
    if (!slug) return;
    setLoading(true);

    fetch(`/api/charter?view=boat&slug=${encodeURIComponent(slug)}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.boat) {
          setBoat(data.boat);
        } else if (data.results && data.results.length > 0) {
          // Fallback: if the API returns a list, take the first match
          setBoat(data.results[0]);
        } else {
          setBoat(null);
        }
      })
      .catch(() => setBoat(null))
      .finally(() => setLoading(false));
  }, [slug]);

  if (loading) {
    return (
      <main className="relative min-h-screen bg-navy">
        <div className="fixed inset-0 -z-10">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--color-navy-light)_0%,_var(--color-navy)_70%)]" />
        </div>
        <Navbar />
        <div className="pt-24 pb-16 px-4 sm:px-6 lg:px-8 max-w-5xl mx-auto space-y-6">
          <div className="glass rounded-2xl border border-white/10 animate-pulse h-80" />
          <div className="glass rounded-2xl border border-white/10 animate-pulse h-64" />
        </div>
        <Footer />
      </main>
    );
  }

  if (!boat) {
    return (
      <main className="relative min-h-screen bg-navy">
        <div className="fixed inset-0 -z-10">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--color-navy-light)_0%,_var(--color-navy)_70%)]" />
        </div>
        <Navbar />
        <div className="pt-24 pb-16 px-4 sm:px-6 lg:px-8 max-w-5xl mx-auto text-center">
          <Ship className="w-12 h-12 text-gray-600 mx-auto mb-4" />
          <p className="text-gray-400 text-lg">Boot nicht gefunden</p>
          <Link href="/charter" className="text-gold text-sm mt-4 inline-block hover:text-gold-light transition-colors">
            Zurück zum Katalog
          </Link>
        </div>
        <Footer />
      </main>
    );
  }

  const company = boat.charter_companies;
  const hasImages = boat.images && boat.images.length > 0;

  return (
    <main className="relative min-h-screen bg-navy">
      <div className="fixed inset-0 -z-10">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--color-navy-light)_0%,_var(--color-navy)_70%)]" />
      </div>

      <Navbar />

      <div className="pt-24 pb-16 px-4 sm:px-6 lg:px-8 max-w-5xl mx-auto">
        {/* Back link */}
        <Link
          href="/charter"
          className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gold-light transition-colors mb-6"
        >
          <ChevronLeft className="w-4 h-4" />
          Zurück zum Katalog
        </Link>

        {/* Hero Image */}
        <div className="glass rounded-2xl border border-white/10 overflow-hidden mb-6">
          <div className="relative h-64 sm:h-80 lg:h-96">
            {hasImages ? (
              <img
                src={boat.images[activeImage]}
                alt={boat.name}
                className="w-full h-full object-cover"
              />
            ) : (
              <img
                src={getFallbackBoatImage(boat.boat_type, boat.slug || boat.name)}
                alt={boat.name}
                className="w-full h-full object-cover"
              />
            )}
          </div>

          {/* Thumbnail strip */}
          {hasImages && boat.images.length > 1 && (
            <div className="flex gap-2 p-3 overflow-x-auto">
              {boat.images.map((img, i) => (
                <button
                  key={i}
                  onClick={() => setActiveImage(i)}
                  className={`flex-shrink-0 w-16 h-12 rounded-lg overflow-hidden border-2 transition-all ${
                    i === activeImage ? "border-gold" : "border-transparent opacity-60 hover:opacity-100"
                  }`}
                >
                  <img src={img} alt="" className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Title row */}
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-8">
          <div>
            <h1 className="text-2xl sm:text-3xl font-light text-white mb-1">
              {boat.name}
            </h1>
            <div className="flex items-center gap-3 text-gray-400 flex-wrap">
              {(boat.brand || boat.model) && (
                <span>{[boat.brand, boat.model].filter(Boolean).join(" ")}</span>
              )}
              <span className="px-2 py-0.5 rounded-full bg-white/5 border border-white/10 text-xs">
                {boatTypeLabel(boat.boat_type)}
              </span>
              {boat.year && (
                <span className="text-sm text-gray-500">Baujahr {boat.year}</span>
              )}
            </div>
          </div>

          <div className="flex flex-col items-end gap-3">
            {boat.price_per_day != null && (
              <div className="text-right">
                <div className="text-2xl text-gold font-medium">
                  {formatPrice(boat.price_per_day, boat.currency)}
                </div>
                <div className="text-xs text-gray-500">pro Tag</div>
              </div>
            )}
            {boat.detail_url && (
              <a
                href={localizedBoataroundUrlClient(boat.detail_url, locale) || boat.detail_url}
                target="_blank"
                rel="noopener noreferrer sponsored"
                className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-gradient-to-r from-gold to-gold-light text-navy text-sm font-semibold hover:opacity-90 transition-opacity shadow-lg shadow-gold/20"
              >
                <Calendar className="w-4 h-4" />
                Jetzt buchen
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            )}
            <AddToCrmButton
              variant="full"
              listing={{
                name: boat.name,
                source_url: localizedBoataroundUrlClient(boat.detail_url, locale) || boat.detail_url || `https://veliqa.life/charter/${boat.slug}`,
                image_url: boat.images?.[0] || null,
                type: boat.boat_type,
                brand: boat.brand,
                model: boat.model,
                year: boat.year,
                price_per_day: boat.price_per_day,
                currency: boat.currency,
                location: [boat.base_port, boat.country].filter(Boolean).join(", "),
                country: boat.country,
                description: boat.description,
              } as unknown as ExtractedListing}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left column: Specs + Pricing + Charter Info */}
          <div className="lg:col-span-2 space-y-6">
            {/* Description */}
            {boat.description && (
              <div className="glass rounded-2xl p-6 border border-white/10">
                <h2 className="text-lg font-light text-white mb-3">Beschreibung</h2>
                <p className="text-gray-400 text-sm leading-relaxed">{boat.description}</p>
              </div>
            )}

            {/* Specs Grid */}
            <div className="glass rounded-2xl p-6 border border-white/10">
              <h2 className="text-lg font-light text-white mb-4">Technische Daten</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8">
                <div>
                  <SpecItem icon={<Ruler className="w-4 h-4" />} label="Länge" value={boat.length_m ? `${boat.length_m} m` : null} />
                  <SpecItem icon={<Ruler className="w-4 h-4" />} label="Breite" value={boat.beam_m ? `${boat.beam_m} m` : null} />
                  <SpecItem icon={<Waves className="w-4 h-4" />} label="Tiefgang" value={boat.draft_m ? `${boat.draft_m} m` : null} />
                  <SpecItem icon={<Bed className="w-4 h-4" />} label="Kabinen" value={boat.cabins} />
                  <SpecItem icon={<Bed className="w-4 h-4" />} label="Kojen" value={boat.berths} />
                </div>
                <div>
                  <SpecItem icon={<Users className="w-4 h-4" />} label="Max. Gäste" value={boat.max_guests} />
                  <SpecItem icon={<Users className="w-4 h-4" />} label="Nassräume" value={boat.heads} />
                  <SpecItem icon={<Fuel className="w-4 h-4" />} label="Motor" value={boat.engine_type ? `${boat.engine_type}${boat.engine_hp ? ` · ${boat.engine_hp} PS` : ""}` : null} />
                  <SpecItem icon={<Waves className="w-4 h-4" />} label="Wassertank" value={boat.water_tank_l ? `${boat.water_tank_l} L` : null} />
                  <SpecItem icon={<Fuel className="w-4 h-4" />} label="Kraftstofftank" value={boat.fuel_tank_l ? `${boat.fuel_tank_l} L` : null} />
                </div>
              </div>
            </div>

            {/* Pricing */}
            <div className="glass rounded-2xl p-6 border border-white/10">
              <h2 className="text-lg font-light text-white mb-4">Preise</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8">
                <div>
                  <SpecItem icon={<Calendar className="w-4 h-4" />} label="Pro Tag" value={formatPrice(boat.price_per_day, boat.currency)} />
                  <SpecItem icon={<Calendar className="w-4 h-4" />} label="Pro Woche" value={formatPrice(boat.price_per_week, boat.currency)} />
                  <SpecItem icon={<Calendar className="w-4 h-4" />} label="Pro Stunde" value={formatPrice(boat.price_per_hour, boat.currency)} />
                </div>
                <div>
                  <SpecItem icon={<Shield className="w-4 h-4" />} label="Kaution" value={formatPrice(boat.deposit, boat.currency)} />
                  <SpecItem icon={<Users className="w-4 h-4" />} label="Skipper" value={formatPrice(boat.skipper_price, boat.currency)} />
                  <SpecItem icon={<Calendar className="w-4 h-4" />} label="Min. Chartertage" value={boat.min_charter_days > 1 ? `${boat.min_charter_days} Tage` : null} />
                </div>
              </div>
            </div>

            {/* Features */}
            {boat.features && boat.features.length > 0 && (
              <div className="glass rounded-2xl p-6 border border-white/10">
                <h2 className="text-lg font-light text-white mb-4">Ausstattung</h2>
                <div className="flex flex-wrap gap-2">
                  {boat.features.map((f) => (
                    <span
                      key={f}
                      className="px-3 py-1.5 rounded-full bg-white/5 border border-white/10 text-sm text-gray-300"
                    >
                      {f}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Charter Info */}
            <div className="glass rounded-2xl p-6 border border-white/10">
              <h2 className="text-lg font-light text-white mb-4">Charter-Informationen</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8">
                <div>
                  <SpecItem
                    icon={<Anchor className="w-4 h-4" />}
                    label="Charter-Typ"
                    value={CHARTER_TYPE_LABELS[boat.charter_type] || boat.charter_type}
                  />
                  <SpecItem
                    icon={<Shield className="w-4 h-4" />}
                    label="Führerschein erforderlich"
                    value={boat.license_required ? "Ja" : "Nein"}
                  />
                </div>
                <div>
                  <SpecItem
                    icon={<Dog className="w-4 h-4" />}
                    label="Haustiere erlaubt"
                    value={boat.pets_allowed ? "Ja" : "Nein"}
                  />
                  <SpecItem
                    icon={<Cigarette className="w-4 h-4" />}
                    label="Rauchen erlaubt"
                    value={boat.smoking_allowed ? "Ja" : "Nein"}
                  />
                </div>
              </div>

              {/* Available dates */}
              {(boat.available_from || boat.available_to) && (
                <div className="mt-4 pt-4 border-t border-white/5">
                  <div className="flex items-center gap-2 text-sm text-gray-400">
                    <Calendar className="w-4 h-4 text-gold/60" />
                    <span>
                      Verfügbar:{" "}
                      {boat.available_from && new Date(boat.available_from).toLocaleDateString("de-DE")}
                      {boat.available_from && boat.available_to && " — "}
                      {boat.available_to && new Date(boat.available_to).toLocaleDateString("de-DE")}
                    </span>
                  </div>
                </div>
              )}

              {/* Base port */}
              {(boat.base_port || boat.country) && (
                <div className="mt-3 flex items-center gap-2 text-sm text-gray-400">
                  <MapPin className="w-4 h-4 text-gold/60" />
                  <span>Basishafen: {[boat.base_port, boat.region, boat.country].filter(Boolean).join(", ")}</span>
                </div>
              )}
            </div>
          </div>

          {/* Right column: Company Card */}
          <div className="space-y-6">
            {company && (
              <div className="glass rounded-2xl p-6 border border-white/10 sticky top-24">
                <h3 className="text-lg font-light text-white mb-4">Anbieter</h3>

                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-gold/20 to-gold/5 border border-gold/20 flex items-center justify-center">
                    <Anchor className="w-5 h-5 text-gold" />
                  </div>
                  <div>
                    <Link
                      href={`/charter/company/${company.slug}`}
                      className="text-white font-medium hover:text-gold-light transition-colors"
                    >
                      {company.company_name}
                    </Link>
                    {company.country && (
                      <div className="flex items-center gap-1 text-xs text-gray-500">
                        <MapPin className="w-3 h-3" />
                        {[company.city, company.country].filter(Boolean).join(", ")}
                      </div>
                    )}
                  </div>
                </div>

                {company.rating != null && (
                  <div className="flex items-center gap-2 mb-4">
                    <StarRating rating={company.rating} />
                    <span className="text-gold text-sm">{company.rating.toFixed(1)}</span>
                    {company.review_count > 0 && (
                      <span className="text-xs text-gray-500">({company.review_count})</span>
                    )}
                  </div>
                )}

                <div className="space-y-2">
                  {company.website && (
                    <a
                      href={company.website}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 px-4 py-2 rounded-lg bg-gold/10 text-gold text-sm hover:bg-gold/20 transition-colors w-full"
                    >
                      <Globe className="w-4 h-4" />
                      Website
                    </a>
                  )}
                  {company.email && (
                    <a
                      href={`mailto:${company.email}`}
                      className="flex items-center gap-2 px-4 py-2 rounded-lg bg-white/5 text-gray-300 text-sm hover:bg-white/10 transition-colors w-full"
                    >
                      <Mail className="w-4 h-4" />
                      E-Mail
                    </a>
                  )}
                  {company.phone && (
                    <a
                      href={`tel:${company.phone}`}
                      className="flex items-center gap-2 px-4 py-2 rounded-lg bg-white/5 text-gray-300 text-sm hover:bg-white/10 transition-colors w-full"
                    >
                      <Phone className="w-4 h-4" />
                      {company.phone}
                    </a>
                  )}
                </div>

                <Link
                  href={`/charter/company/${company.slug}`}
                  className="mt-4 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-white/5 border border-white/10 text-gray-300 text-sm hover:bg-white/10 transition-colors w-full"
                >
                  Alle Boote ansehen
                </Link>
              </div>
            )}

            {/* Booking CTA — sticky bottom on mobile */}
            {boat.detail_url && (
              <div className="glass rounded-2xl p-5 border border-gold/20 bg-gold/5">
                <h3 className="text-white font-medium mb-1">Boot buchen</h3>
                <p className="text-xs text-gray-400 mb-3">
                  Buchung erfolgt direkt beim Anbieter — sichere Zahlung, sofortige Bestätigung.
                </p>
                <a
                  href={localizedBoataroundUrlClient(boat.detail_url, locale) || boat.detail_url}
                  target="_blank"
                  rel="noopener noreferrer sponsored"
                  className="flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-gradient-to-r from-gold to-gold-light text-navy font-semibold text-sm hover:opacity-90 transition-opacity w-full"
                >
                  <Calendar className="w-4 h-4" />
                  Jetzt buchen bei {boat.source === "boataround_sitemap" ? "Boataround" : boat.source === "samboat_sitemap" ? "Samboat" : (() => { try { return new URL(boat.detail_url!).hostname.replace("www.", "").split(".")[0]; } catch { return "Anbieter"; } })()}
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
                {(boat.source === "boataround_sitemap" || boat.source === "samboat_sitemap") && (
                  <p className="text-[10px] text-gray-500 mt-2 text-center">
                    Affiliate-Partner — VELIQA erhält ggf. eine Provision
                  </p>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      <Footer />
    </main>
  );
}
