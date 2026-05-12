"use client";

import { useState } from "react";
import { Star, Users, Ruler, MapPin, Sparkles, ExternalLink, Anchor } from "lucide-react";
import { formatPrice } from "@/lib/format";
import type { ExtractedListing } from "@/lib/claude-ai";

const TYPE_EMOJI: Record<string, string> = {
  sailing: "⛵",
  catamaran: "🛥️",
  gulet: "🚢",
  superyacht: "🛳️",
  motor: "🚤",
  speedboat: "🏎️",
};

export function ListingCard({ listing, index }: { listing: ExtractedListing; index: number }) {
  const matchPercent = Math.round((listing.match_score ?? 0) * 100);
  const [imgError, setImgError] = useState(false);
  const hasImage = listing.image_url && !imgError;

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
        {/* Match score badge */}
        <div className="absolute top-3 right-3 z-10">
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

        {/* Image area */}
        <div className="relative h-48 overflow-hidden bg-gradient-to-br from-navy-light to-navy-lighter">
          {hasImage ? (
            <img
              src={listing.image_url}
              alt={listing.name}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
              onError={() => setImgError(true)}
              loading="lazy"
            />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-center">
                <span className="text-5xl">
                  {TYPE_EMOJI[listing.type] || "🚤"}
                </span>
                <p className="text-xs text-gray-500 mt-2 capitalize">{listing.type}</p>
              </div>
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-navy/90 via-navy/20 to-transparent" />

          {/* Source badge */}
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

          {/* Stats row */}
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

          {/* Luxury stars */}
          {listing.luxury_level > 0 && (
            <div className="flex items-center gap-0.5 mb-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <Star
                  key={i}
                  className={`w-3.5 h-3.5 ${
                    i < listing.luxury_level ? "text-gold fill-gold" : "text-gray-700"
                  }`}
                />
              ))}
            </div>
          )}

          {/* Match reasons */}
          {listing.match_reasons?.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mb-3">
              {listing.match_reasons.slice(0, 3).map((reason, i) => (
                <span
                  key={i}
                  className="text-xs px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-300 border border-emerald-500/10"
                >
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
                  {priceLabel && (
                    <span className="text-sm text-gray-400 ml-1">{priceLabel}</span>
                  )}
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
