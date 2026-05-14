"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { AddToCrmButton } from "@/components/AddToCrmButton";
import type { ExtractedListing } from "@/lib/claude-ai";
import {
  Anchor, Ship, MapPin, Ruler, ExternalLink, ChevronLeft,
  Bed, Tag, Calendar, Phone, Mail, Loader2, Euro, Clock,
} from "lucide-react";

interface SaleBoat {
  id: string;
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
  engine_type: string | null;
  engine_hp: number | null;
  engine_hours: number | null;
  fuel_type: string | null;
  sale_price: number;
  currency: string;
  price_negotiable: boolean;
  vat_included: boolean;
  location: string | null;
  base_port: string | null;
  country: string | null;
  region: string | null;
  condition: string | null;
  hours_used: number | null;
  last_refit_year: number | null;
  features: string[];
  images: string[];
  description: string | null;
  history: string | null;
  status: string;
  verified: boolean;
  contact_name: string | null;
  contact_phone: string | null;
  contact_email: string | null;
  contact_whatsapp: string | null;
  detail_url: string | null;
  source_domain: string | null;
  created_at: string;
}

function formatPrice(n: number | null, currency = "EUR"): string {
  if (n == null) return "Preis auf Anfrage";
  const sym = currency === "USD" ? "$" : currency === "GBP" ? "£" : "€";
  return `${sym}${Math.round(n).toLocaleString("de-DE")}`;
}

const CONDITION_LABELS: Record<string, string> = {
  new: "Neu",
  like_new: "Wie neu",
  good: "Gut",
  fair: "Mäßig",
  project: "Projekt / zu restaurieren",
};

export default function SaleBoatDetailPage() {
  const params = useParams<{ slug: string }>();
  const slug = params?.slug;
  const [boat, setBoat] = useState<SaleBoat | null>(null);
  const [loading, setLoading] = useState(true);
  const [imgIdx, setImgIdx] = useState(0);

  useEffect(() => {
    if (!slug) return;
    setLoading(true);
    fetch(`/api/sale/${slug}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => setBoat(data?.boat ?? null))
      .catch(() => setBoat(null))
      .finally(() => setLoading(false));
  }, [slug]);

  if (loading) {
    return (
      <main className="min-h-screen bg-[radial-gradient(ellipse_at_top,_var(--color-navy-light)_0%,_var(--color-navy)_70%)]">
        <Navbar />
        <div className="flex items-center justify-center pt-32">
          <Loader2 className="w-8 h-8 text-gold animate-spin" />
        </div>
      </main>
    );
  }

  if (!boat) {
    return (
      <main className="min-h-screen bg-[radial-gradient(ellipse_at_top,_var(--color-navy-light)_0%,_var(--color-navy)_70%)]">
        <Navbar />
        <div className="max-w-3xl mx-auto px-4 pt-32 text-center">
          <Ship className="w-12 h-12 text-gray-600 mx-auto mb-4" />
          <h1 className="text-white text-xl mb-2">Boot nicht gefunden</h1>
          <p className="text-gray-500 text-sm mb-6">
            Dieses Verkaufsboot ist nicht mehr verfügbar oder wurde entfernt.
          </p>
          <Link href="/sale" className="inline-block px-5 py-2.5 rounded-xl bg-gold/90 hover:bg-gold text-navy text-sm font-medium transition-colors">
            Zurück zum Bootkauf
          </Link>
        </div>
        <Footer />
      </main>
    );
  }

  const images = boat.images?.length ? boat.images : [];
  const titleParts = [boat.brand, boat.model || boat.name].filter(Boolean);
  const heading = titleParts.length ? titleParts.join(" ") : boat.name;

  return (
    <main className="min-h-screen bg-[radial-gradient(ellipse_at_top,_var(--color-navy-light)_0%,_var(--color-navy)_70%)]">
      <Navbar />

      <div className="max-w-6xl mx-auto px-4 sm:px-6 pt-20 pb-12">
        {/* Back link */}
        <Link
          href="/sale"
          className="inline-flex items-center gap-1.5 text-sm text-gray-400 hover:text-gold-light transition-colors mb-6"
        >
          <ChevronLeft className="w-4 h-4" />
          Zurück zum Bootkauf
        </Link>

        {/* Image gallery */}
        <div className="mb-8">
          {images.length > 0 ? (
            <div>
              <div className="relative aspect-[16/9] rounded-2xl overflow-hidden bg-white/5">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={images[imgIdx]} alt={heading} className="w-full h-full object-cover" />
                {boat.condition && (
                  <span className="absolute top-4 left-4 px-3 py-1 rounded-full text-xs bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 backdrop-blur">
                    {CONDITION_LABELS[boat.condition] || boat.condition}
                  </span>
                )}
                {boat.verified && (
                  <span className="absolute top-4 right-4 px-3 py-1 rounded-full text-xs bg-gold/20 text-gold border border-gold/30 backdrop-blur">
                    ✓ Verifiziert
                  </span>
                )}
              </div>
              {images.length > 1 && (
                <div className="flex gap-2 mt-3 overflow-x-auto pb-1">
                  {images.map((img, i) => (
                    <button
                      key={img + i}
                      onClick={() => setImgIdx(i)}
                      className={`w-20 h-20 flex-shrink-0 rounded-lg overflow-hidden border-2 transition-colors ${
                        i === imgIdx ? "border-gold" : "border-transparent hover:border-white/20"
                      }`}
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={img} alt="" className="w-full h-full object-cover" />
                    </button>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="aspect-[16/9] rounded-2xl bg-gradient-to-br from-navy-light via-navy to-gold/10 flex items-center justify-center">
              <Ship className="w-16 h-16 text-white/10" />
            </div>
          )}
        </div>

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-8">
          <div>
            <h1 className="text-2xl sm:text-3xl font-light text-white mb-1">{heading}</h1>
            <div className="flex items-center gap-3 text-gray-400 flex-wrap">
              <span className="px-2 py-0.5 rounded-full bg-white/5 border border-white/10 text-xs capitalize">
                {boat.boat_type.replace(/_/g, " ")}
              </span>
              {boat.year && <span className="text-sm">Baujahr {boat.year}</span>}
              {boat.location && (
                <span className="flex items-center gap-1 text-sm">
                  <MapPin className="w-3.5 h-3.5" />
                  {boat.location}
                </span>
              )}
              {boat.length_m && (
                <span className="flex items-center gap-1 text-sm">
                  <Ruler className="w-3.5 h-3.5" />
                  {boat.length_m}m
                </span>
              )}
            </div>
          </div>

          <div className="flex flex-col items-end gap-3">
            <div className="text-right">
              <div className="text-3xl text-gold font-medium">
                {formatPrice(boat.sale_price, boat.currency)}
              </div>
              <div className="text-xs text-gray-500">
                {boat.price_negotiable ? "Verhandelbar" : "Festpreis"}
                {boat.vat_included && " · MwSt. inkl."}
              </div>
            </div>
            {boat.detail_url && (
              <a
                href={boat.detail_url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-gradient-to-r from-gold to-gold-light text-navy text-sm font-semibold hover:opacity-90 transition-opacity shadow-lg shadow-gold/20"
              >
                <Tag className="w-4 h-4" />
                Beim Anbieter ansehen
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            )}
            <AddToCrmButton
              variant="full"
              listing={{
                name: heading,
                source_url: boat.detail_url || `https://veliqa.life/sale/${boat.slug}`,
                image_url: images[0] || null,
                type: boat.boat_type,
                brand: boat.brand,
                model: boat.model,
                year: boat.year,
                sale_price: boat.sale_price,
                currency: boat.currency,
                location: boat.location || [boat.base_port, boat.country].filter(Boolean).join(", "),
                country: boat.country,
                description: boat.description,
                is_sale: true,
              } as unknown as ExtractedListing}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left: Description + Specs + Features */}
          <div className="lg:col-span-2 space-y-6">
            {boat.description && (
              <div className="glass rounded-2xl p-6 border border-white/10">
                <h2 className="text-lg font-light text-white mb-3">Beschreibung</h2>
                <p className="text-gray-400 text-sm leading-relaxed whitespace-pre-wrap">
                  {boat.description}
                </p>
              </div>
            )}

            {boat.history && (
              <div className="glass rounded-2xl p-6 border border-white/10">
                <h2 className="text-lg font-light text-white mb-3">Historie</h2>
                <p className="text-gray-400 text-sm leading-relaxed whitespace-pre-wrap">
                  {boat.history}
                </p>
              </div>
            )}

            {/* Specs */}
            <div className="glass rounded-2xl p-6 border border-white/10">
              <h2 className="text-lg font-light text-white mb-4">Technische Daten</h2>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-sm">
                {boat.length_m && <Spec label="Länge" value={`${boat.length_m} m`} />}
                {boat.beam_m && <Spec label="Breite" value={`${boat.beam_m} m`} />}
                {boat.draft_m && <Spec label="Tiefgang" value={`${boat.draft_m} m`} />}
                {boat.year && <Spec label="Baujahr" value={String(boat.year)} />}
                {boat.last_refit_year && <Spec label="Letztes Refit" value={String(boat.last_refit_year)} />}
                {boat.cabins != null && <Spec label="Kabinen" value={String(boat.cabins)} />}
                {boat.berths != null && <Spec label="Kojen" value={String(boat.berths)} />}
                {boat.heads != null && <Spec label="Nasszellen" value={String(boat.heads)} />}
                {boat.engine_type && <Spec label="Motor" value={boat.engine_type} />}
                {boat.engine_hp && <Spec label="Leistung" value={`${boat.engine_hp} PS`} />}
                {boat.engine_hours && (
                  <Spec label="Motorstunden" value={`${boat.engine_hours.toLocaleString("de-DE")} h`} icon={<Clock className="w-3 h-3" />} />
                )}
                {boat.fuel_type && <Spec label="Treibstoff" value={boat.fuel_type} />}
              </div>
            </div>

            {boat.features?.length > 0 && (
              <div className="glass rounded-2xl p-6 border border-white/10">
                <h2 className="text-lg font-light text-white mb-4">Ausstattung</h2>
                <div className="flex flex-wrap gap-2">
                  {boat.features.map((f, i) => (
                    <span key={i} className="px-3 py-1 rounded-full bg-white/5 border border-white/10 text-xs text-gray-300">
                      {f}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Right: Contact + Provider info */}
          <div className="space-y-6">
            {/* Quick contact card */}
            {(boat.contact_name || boat.contact_phone || boat.contact_email || boat.contact_whatsapp) && (
              <div className="glass rounded-2xl p-5 border border-white/10">
                <h3 className="text-white font-medium mb-3">Verkäufer kontaktieren</h3>
                {boat.contact_name && (
                  <p className="text-sm text-gray-300 mb-3">{boat.contact_name}</p>
                )}
                <div className="space-y-2">
                  {boat.contact_phone && (
                    <a href={`tel:${boat.contact_phone}`} className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white/5 hover:bg-white/10 text-sm text-gray-300 transition-colors">
                      <Phone className="w-4 h-4" />
                      {boat.contact_phone}
                    </a>
                  )}
                  {boat.contact_email && (
                    <a href={`mailto:${boat.contact_email}`} className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white/5 hover:bg-white/10 text-sm text-gray-300 transition-colors">
                      <Mail className="w-4 h-4" />
                      {boat.contact_email}
                    </a>
                  )}
                  {boat.contact_whatsapp && (
                    <a href={`https://wa.me/${boat.contact_whatsapp.replace(/[^\d+]/g, "")}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 px-3 py-2 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-sm text-emerald-300 transition-colors">
                      WhatsApp
                    </a>
                  )}
                </div>
              </div>
            )}

            {/* Provider / Source */}
            {boat.source_domain && (
              <div className="glass rounded-2xl p-5 border border-white/10">
                <h3 className="text-white font-medium mb-1">Quelle</h3>
                <p className="text-xs text-gray-500 mb-3">{boat.source_domain}</p>
                {boat.detail_url && (
                  <a
                    href={boat.detail_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-white/5 border border-white/10 text-gray-300 text-sm hover:bg-white/10 transition-colors w-full"
                  >
                    Original-Inserat öffnen
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                )}
              </div>
            )}

            {/* CTA */}
            <div className="glass rounded-2xl p-5 border border-gold/20 bg-gold/5">
              <h3 className="text-white font-medium mb-1">Interessiert?</h3>
              <p className="text-xs text-gray-400 mb-3">
                Speichere das Boot in dein CRM und verhandle weiter. Wir benachrichtigen
                dich auch bei ähnlichen Modellen.
              </p>
              <Link
                href="/profile/alerts"
                className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-white/5 border border-gold/30 text-gold text-sm hover:bg-gold/10 transition-colors w-full"
              >
                🔔 Alert für ähnliche anlegen
              </Link>
            </div>

            <div className="text-xs text-gray-500 text-center">
              <Euro className="w-3 h-3 inline mr-1" />
              {formatPrice(boat.sale_price, boat.currency)} ·
              eingestellt {new Date(boat.created_at).toLocaleDateString("de-DE")}
            </div>
          </div>
        </div>
      </div>

      <Footer />
    </main>
  );
}

function Spec({ label, value, icon }: { label: string; value: string; icon?: React.ReactNode }) {
  return (
    <div>
      <div className="text-xs text-gray-500 mb-0.5 flex items-center gap-1">
        {icon}
        {label}
      </div>
      <div className="text-white text-sm font-medium">{value}</div>
    </div>
  );
}
