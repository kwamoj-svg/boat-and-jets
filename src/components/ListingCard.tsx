"use client";

import { Star, Users, Ruler, MapPin, Sparkles, ExternalLink } from "lucide-react";
import { formatPrice } from "@/lib/format";
import type { ExtractedListing } from "@/lib/claude-ai";

export function ListingCard({ listing, index }: { listing: ExtractedListing; index: number }) {
  const matchPercent = Math.round(listing.match_score * 100);

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
          animate-fade-in
        "
        style={{ animationDelay: `${index * 0.08}s`, opacity: 0 }}
      >
        {/* Match score */}
        <div className="absolute top-3 right-3 z-10">
          <div
            className={`
            flex items-center gap-1.5 px-3 py-1.5 rounded-full backdrop-blur-sm text-xs font-medium
            ${
              matchPercent >= 70
                ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/20"
                : matchPercent >= 50
                  ? "bg-gold/20 text-gold-light border border-gold/20"
                  : "bg-white/10 text-gray-300 border border-white/10"
            }
          `}
          >
            <Sparkles className="w-3 h-3" />
            {matchPercent}% match
          </div>
        </div>

        {/* Image placeholder with gradient */}
        <div className="relative h-44 overflow-hidden bg-gradient-to-br from-navy-light to-navy-lighter">
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center">
              <span className="text-4xl">
                {listing.type === "sailing"
                  ? "⛵"
                  : listing.type === "catamaran"
                    ? "🚢"
                    : listing.type === "gulet"
                      ? "🚤"
                      : listing.type === "superyacht"
                        ? "🛥️"
                        : "🚤"}
              </span>
              <p className="text-xs text-gray-500 mt-2">{listing.type}</p>
            </div>
          </div>
          <div className="absolute inset-0 bg-gradient-to-t from-navy/80 via-transparent to-transparent" />
          <div className="absolute bottom-2 left-3 right-3">
            <div className="flex items-center gap-1 text-xs text-gray-400">
              <ExternalLink className="w-3 h-3" />
              <span className="truncate">{new URL(listing.source_url).hostname.replace("www.", "")}</span>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-5">
          <div className="mb-2">
            <h3 className="text-lg font-medium text-white group-hover:text-gold-light transition-colors">
              {listing.name}
            </h3>
            <p className="text-sm text-gray-400">
              {[listing.brand, listing.model, listing.year].filter(Boolean).join(" · ")}
            </p>
          </div>

          {/* Stats */}
          <div className="flex items-center gap-4 text-sm text-gray-400 mb-3">
            {listing.length_ft && (
              <span className="flex items-center gap-1">
                <Ruler className="w-3.5 h-3.5" /> {listing.length_ft}ft
              </span>
            )}
            {listing.guests && (
              <span className="flex items-center gap-1">
                <Users className="w-3.5 h-3.5" /> {listing.guests} guests
              </span>
            )}
            {listing.port && (
              <span className="flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5" /> {listing.port}
              </span>
            )}
          </div>

          {/* Luxury level */}
          <div className="flex items-center gap-1 mb-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <Star
                key={i}
                className={`w-3.5 h-3.5 ${
                  i < listing.luxury_level
                    ? "text-gold fill-gold"
                    : "text-gray-600"
                }`}
              />
            ))}
          </div>

          {/* Match reasons */}
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

          {/* AI Summary */}
          <p className="text-sm text-gray-400 leading-relaxed line-clamp-2 mb-4">
            {listing.ai_summary}
          </p>

          {/* Price */}
          <div className="flex items-end justify-between pt-3 border-t border-white/[0.06]">
            <div>
              {listing.price_per_week ? (
                <>
                  <span className="text-xl font-light text-white">
                    {listing.currency === "USD" ? "$" : "€"}
                    {formatPrice(listing.price_per_week)}
                  </span>
                  <span className="text-sm text-gray-400 ml-1">/week</span>
                </>
              ) : listing.sale_price ? (
                <>
                  <span className="text-xl font-light text-white">
                    {listing.currency === "USD" ? "$" : "€"}
                    {formatPrice(listing.sale_price)}
                  </span>
                  <span className="text-sm text-gray-400 ml-1">sale</span>
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
