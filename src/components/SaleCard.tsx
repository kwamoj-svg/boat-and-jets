"use client";

import { useState } from "react";
import Link from "next/link";
import { Ruler, MapPin, Calendar, Gauge, Ship, Anchor } from "lucide-react";
import { formatPrice } from "@/lib/format";

export interface SaleBoatSummary {
  name: string;
  slug: string;
  boat_type: string;
  brand?: string;
  model?: string;
  year?: number;
  length_m?: number;
  sale_price: number;
  currency: string;
  price_negotiable?: boolean;
  condition?: string;
  location?: string;
  country?: string;
  image_url?: string;
  source_domain?: string;
  verified?: boolean;
}

const CONDITION_DE: Record<string, string> = {
  new: "Neu",
  like_new: "Wie neu",
  good: "Gut",
  fair: "Gebraucht",
  project: "Projekt",
};

const CONDITION_COLOR: Record<string, string> = {
  new: "bg-emerald-500/20 text-emerald-300 border-emerald-500/20",
  like_new: "bg-blue-500/20 text-blue-300 border-blue-500/20",
  good: "bg-gold/20 text-gold border-gold/20",
  fair: "bg-orange-500/20 text-orange-300 border-orange-500/20",
  project: "bg-red-500/20 text-red-300 border-red-500/20",
};

const FALLBACK_IMAGES = [
  "https://images.unsplash.com/photo-1567899378494-47b22a2ae96a?w=600&h=400&fit=crop",
  "https://images.unsplash.com/photo-1540946485063-a40da27545f8?w=600&h=400&fit=crop",
  "https://images.unsplash.com/photo-1544551763-46a013bb70d5?w=600&h=400&fit=crop",
  "https://images.unsplash.com/photo-1605281317010-fe5ffe798166?w=600&h=400&fit=crop",
  "https://images.unsplash.com/photo-1622397745000-91bc577d69e0?w=600&h=400&fit=crop",
  "https://images.unsplash.com/photo-1588359348347-9bc6cbbb689e?w=600&h=400&fit=crop",
];

const TYPE_DE: Record<string, string> = {
  sailboat: "Segelboot",
  catamaran: "Katamaran",
  motorboat: "Motorboot",
  yacht: "Yacht",
  superyacht: "Superyacht",
  speedboat: "Speedboot",
  gulet: "Gulet",
  houseboat: "Hausboot",
};

export function SaleCard({ boat, index }: { boat: SaleBoatSummary; index: number }) {
  const [imgError, setImgError] = useState(false);

  const imgSrc = (boat.image_url && !imgError)
    ? boat.image_url
    : FALLBACK_IMAGES[index % FALLBACK_IMAGES.length];

  const currency = boat.currency === "USD" ? "$" : boat.currency === "GBP" ? "£" : "€";
  const subtitle = [boat.brand, boat.model, boat.year].filter(Boolean).join(" · ");

  return (
    <Link href={`/sale/${boat.slug}`} className="block">
      <article
        className="
          group relative rounded-2xl overflow-hidden
          bg-white/[0.03] border border-white/[0.06]
          hover:border-gold/20 hover:bg-white/[0.05]
          transition-all duration-300
          animate-fade-in h-full flex flex-col
        "
        style={{ animationDelay: `${index * 0.04}s`, opacity: 0 }}
      >
        {/* Zustand-Badge */}
        {boat.condition && (
          <div className="absolute top-3 left-3 z-10">
            <span className={`px-2.5 py-1 rounded-full text-xs font-medium border backdrop-blur-md ${CONDITION_COLOR[boat.condition] || "bg-white/10 text-gray-300 border-white/10"}`}>
              {CONDITION_DE[boat.condition] || boat.condition}
            </span>
          </div>
        )}

        {/* Verified Badge */}
        {boat.verified && (
          <div className="absolute top-3 right-3 z-10">
            <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-gold/20 text-gold border border-gold/30 backdrop-blur-md">
              ✓ Geprüft
            </span>
          </div>
        )}

        {/* Bild */}
        <div className="relative h-48 overflow-hidden">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={imgSrc}
            alt={boat.name}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
            onError={() => setImgError(true)}
            loading="lazy"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-navy/90 via-navy/20 to-transparent" />

          {/* Typ + Quelle */}
          <div className="absolute bottom-2 left-3 right-3 flex items-center justify-between">
            <span className="text-xs text-gold-light bg-navy/60 backdrop-blur-sm px-2 py-1 rounded-lg capitalize">
              {TYPE_DE[boat.boat_type] || boat.boat_type}
            </span>
            {boat.source_domain && (
              <span className="text-xs text-gray-400 bg-navy/60 backdrop-blur-sm px-2 py-1 rounded-lg truncate max-w-[140px]">
                {boat.source_domain}
              </span>
            )}
          </div>
        </div>

        {/* Inhalt */}
        <div className="p-5 flex-1 flex flex-col">
          <div className="mb-3">
            <h3 className="text-lg font-medium text-white group-hover:text-gold-light transition-colors leading-tight line-clamp-1">
              {boat.name}
            </h3>
            {subtitle && (
              <p className="text-sm text-gray-400 mt-0.5">{subtitle}</p>
            )}
          </div>

          {/* Spezifikationen */}
          <div className="flex items-center gap-3 text-sm text-gray-400 mb-4 flex-wrap">
            {boat.year && (
              <span className="flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-gold/40" /> {boat.year}
              </span>
            )}
            {boat.length_m && (
              <span className="flex items-center gap-1">
                <Ruler className="w-3.5 h-3.5 text-gold/40" /> {boat.length_m} m
              </span>
            )}
            {boat.country && (
              <span className="flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5 text-gold/40" /> {boat.country}
              </span>
            )}
          </div>

          {/* Preis */}
          <div className="mt-auto pt-3 border-t border-white/[0.06] flex items-end justify-between">
            <div>
              {boat.sale_price && boat.sale_price > 0 ? (
                <span className="text-xl font-light text-white">
                  {currency}{formatPrice(boat.sale_price)}
                </span>
              ) : (
                <span className="text-sm text-gray-400">Preis auf Anfrage</span>
              )}
              {boat.price_negotiable && boat.sale_price > 0 && (
                <span className="text-xs text-gray-500 ml-2">VB</span>
              )}
            </div>
            {boat.location && (
              <span className="text-xs text-gold/50 max-w-[120px] truncate text-right">
                {boat.location}
              </span>
            )}
          </div>
        </div>
      </article>
    </Link>
  );
}
