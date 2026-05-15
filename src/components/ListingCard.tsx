"use client";

import { useState } from "react";
import { Users, Ruler, MapPin, Sparkles, ExternalLink, Anchor } from "lucide-react";
import { formatPrice } from "@/lib/format";
import type { ExtractedListing } from "@/lib/claude-ai";
import { AddToCrmButton } from "./AddToCrmButton";

// Fallback images by boat type — always show a relevant photo
const FALLBACK_IMAGES: Record<string, string[]> = {
  sailing: [
    "https://images.unsplash.com/photo-1540946485063-a40da27545f8?w=600&h=400&fit=crop",
    "https://images.unsplash.com/photo-1569263979104-865ab7cd8d13?w=600&h=400&fit=crop",
    "https://images.unsplash.com/photo-1534854638093-bada1813ca19?w=600&h=400&fit=crop",
  ],
  catamaran: [
    "https://images.unsplash.com/photo-1567899378494-47b22a2ae96a?w=600&h=400&fit=crop",
    "https://images.unsplash.com/photo-1605281317010-fe5ffe798166?w=600&h=400&fit=crop",
    "https://images.unsplash.com/photo-1544551763-46a013bb70d5?w=600&h=400&fit=crop",
  ],
  motor: [
    "https://images.unsplash.com/photo-1569263979104-865ab7cd8d13?w=600&h=400&fit=crop",
    "https://images.unsplash.com/photo-1622397745000-91bc577d69e0?w=600&h=400&fit=crop",
    "https://images.unsplash.com/photo-1588359348347-9bc6cbbb689e?w=600&h=400&fit=crop",
  ],
  superyacht: [
    "https://images.unsplash.com/photo-1567899378494-47b22a2ae96a?w=600&h=400&fit=crop",
    "https://images.unsplash.com/photo-1605281317010-fe5ffe798166?w=600&h=400&fit=crop",
    "https://images.unsplash.com/photo-1622397745000-91bc577d69e0?w=600&h=400&fit=crop",
  ],
  gulet: [
    "https://images.unsplash.com/photo-1544551763-46a013bb70d5?w=600&h=400&fit=crop",
    "https://images.unsplash.com/photo-1540946485063-a40da27545f8?w=600&h=400&fit=crop",
    "https://images.unsplash.com/photo-1567899378494-47b22a2ae96a?w=600&h=400&fit=crop",
  ],
  speedboat: [
    "https://images.unsplash.com/photo-1588359348347-9bc6cbbb689e?w=600&h=400&fit=crop",
    "https://images.unsplash.com/photo-1622397745000-91bc577d69e0?w=600&h=400&fit=crop",
    "https://images.unsplash.com/photo-1569263979104-865ab7cd8d13?w=600&h=400&fit=crop",
  ],
  default: [
    "https://images.unsplash.com/photo-1567899378494-47b22a2ae96a?w=600&h=400&fit=crop",
    "https://images.unsplash.com/photo-1540946485063-a40da27545f8?w=600&h=400&fit=crop",
    "https://images.unsplash.com/photo-1544551763-46a013bb70d5?w=600&h=400&fit=crop",
    "https://images.unsplash.com/photo-1605281317010-fe5ffe798166?w=600&h=400&fit=crop",
    "https://images.unsplash.com/photo-1622397745000-91bc577d69e0?w=600&h=400&fit=crop",
    "https://images.unsplash.com/photo-1588359348347-9bc6cbbb689e?w=600&h=400&fit=crop",
  ],
};

function getFallbackImage(type: string, index: number): string {
  const images = FALLBACK_IMAGES[type?.toLowerCase()] || FALLBACK_IMAGES.default;
  return images[index % images.length];
}

export function ListingCard({ listing, index }: { listing: ExtractedListing; index: number }) {
  const matchPercent = Math.round((listing.match_score ?? 0) * 100);
  const [imgError, setImgError] = useState(false);

  const imgSrc = (listing.image_url && !imgError)
    ? listing.image_url
    : getFallbackImage(listing.type, index);

  const price = listing.price_per_week || listing.sale_price;
  const priceLabel = listing.price_per_week ? "/week" : listing.sale_price ? "" : null;
  const currency = listing.currency === "USD" ? "$" : listing.currency === "GBP" ? "£" : "€";

  return (
    <a
      href={listing.source_url}
      target="_blank"
      rel="noopener noreferrer"
      className="block"
    >
      <article
        className="
          group relative rounded-2xl overflow-hidden
          bg-white/[0.03] border border-white/[0.06]
          hover:border-gold/20 hover:bg-white/[0.05]
          transition-all duration-300
          animate-fade-in h-full flex flex-col
        "
        style={{ animationDelay: `${index * 0.06}s`, opacity: 0 }}
      >
        {/* Top-right: Match badge + CRM button */}
        <div className="absolute top-3 right-3 z-10 flex items-center gap-2">
          <AddToCrmButton listing={listing} />
          <div
            className={`
            flex items-center gap-1.5 px-3 py-1.5 rounded-full backdrop-blur-md text-xs font-medium
            ${
              matchPercent >= 80
                ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/20"
                : matchPercent >= 60
                  ? "bg-gold/20 text-gold-light border border-gold/20"
                  : "bg-white/10 text-gray-300 border border-white/10"
            }
          `}
          >
            <Sparkles className="w-3 h-3" />
            {matchPercent}%
          </div>
        </div>

        {/* Image — always visible */}
        <div className="relative h-48 overflow-hidden">
          <img
            src={imgSrc}
            alt={listing.name}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
            onError={() => setImgError(true)}
            loading="lazy"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-navy/90 via-navy/20 to-transparent" />

          {/* Source + type badges */}
          <div className="absolute bottom-2 left-3 right-3 flex items-center justify-between">
            <div className="flex items-center gap-1 text-xs text-gray-300 bg-navy/60 backdrop-blur-sm px-2 py-1 rounded-lg">
              <ExternalLink className="w-3 h-3" />
              <span className="truncate max-w-[150px]">
                {(() => { try { return new URL(listing.source_url).hostname.replace("www.", ""); } catch { return "source"; } })()}
              </span>
            </div>
            {listing.type && (
              <span className="text-xs text-gold-light bg-navy/60 backdrop-blur-sm px-2 py-1 rounded-lg capitalize">
                {listing.type}
              </span>
            )}
          </div>
        </div>

        {/* Content */}
        <div className="p-5 flex-1 flex flex-col">
          <div className="mb-3">
            <h3 className="text-lg font-medium text-white group-hover:text-gold-light transition-colors leading-tight">
              {listing.name}
            </h3>
            <p className="text-sm text-gray-400 mt-0.5">
              {[listing.brand, listing.model, listing.year].filter(Boolean).join(" · ") || ""}
            </p>
          </div>

          {/* Stats */}
          <div className="flex items-center gap-4 text-sm text-gray-400 mb-3">
            {listing.length_ft ? (
              <span className="flex items-center gap-1">
                <Ruler className="w-3.5 h-3.5 text-gold/40" /> {listing.length_ft}ft
              </span>
            ) : null}
            {listing.guests ? (
              <span className="flex items-center gap-1">
                <Users className="w-3.5 h-3.5 text-gold/40" /> {listing.guests}
              </span>
            ) : null}
            {listing.cabins ? (
              <span className="flex items-center gap-1">
                <Anchor className="w-3.5 h-3.5 text-gold/40" /> {listing.cabins} cab
              </span>
            ) : null}
            {listing.port ? (
              <span className="flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5 text-gold/40" /> {listing.port}
              </span>
            ) : null}
          </div>

          {/* Price per day (if available, show prominently) */}
          {listing.price_per_day && (
            <div className="mb-3">
              <span className="text-sm font-medium text-gold">
                ab {currency}{formatPrice(listing.price_per_day)}/Tag
              </span>
            </div>
          )}

          {/* Match reasons */}
          {listing.match_reasons?.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mb-3">
              {listing.match_reasons.slice(0, 3).map((reason, i) => (
                <span key={i} className="text-xs px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-300 border border-emerald-500/10">
                  {reason}
                </span>
              ))}
            </div>
          )}

          {/* AI Summary */}
          <p className="text-sm text-gray-400 leading-relaxed line-clamp-2 mb-4 flex-1">
            {listing.ai_summary}
          </p>

          {/* Price */}
          <div className="flex items-end justify-between pt-3 border-t border-white/[0.06]">
            <div>
              {price ? (
                <>
                  <span className="text-xl font-light text-white">
                    {currency}{formatPrice(price)}
                  </span>
                  {priceLabel && <span className="text-sm text-gray-400 ml-1">{priceLabel}</span>}
                </>
              ) : (
                <span className="text-sm text-gray-400">Price on request</span>
              )}
            </div>
            <span className="text-xs text-gold/60 uppercase tracking-wider">
              {listing.country}
            </span>
          </div>

        </div>
      </article>
    </a>
  );
}
