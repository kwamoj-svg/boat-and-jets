"use client";

import Link from "next/link";
import Image from "next/image";
import { Star, Users, Ruler, MapPin, Sparkles, BadgeCheck, Crown } from "lucide-react";
import type { Recommendation } from "@/types";
import { formatPrice } from "@/lib/format";

export function RecommendationCard({ rec, index }: { rec: Recommendation; index: number }) {
  const { listing, score, match_reasons, ai_summary } = rec;
  const boat = listing.boat;
  const matchPercent = Math.round(score * 100);

  return (
    <Link href={`/boat/${listing.id}`}>
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
        {/* Sponsored / Featured badges */}
        {(listing.is_sponsored || listing.is_featured) && (
          <div className="absolute top-3 left-3 z-10 flex gap-2">
            {listing.is_sponsored && (
              <span className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-gold/90 text-navy text-xs font-medium">
                <Crown className="w-3 h-3" /> Sponsored
              </span>
            )}
            {listing.is_featured && !listing.is_sponsored && (
              <span className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-white/10 text-white text-xs font-medium backdrop-blur-sm">
                <BadgeCheck className="w-3 h-3" /> Featured
              </span>
            )}
          </div>
        )}

        {/* Match score */}
        <div className="absolute top-3 right-3 z-10">
          <div className={`
            flex items-center gap-1.5 px-3 py-1.5 rounded-full backdrop-blur-sm text-xs font-medium
            ${matchPercent >= 70 ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/20" :
              matchPercent >= 50 ? "bg-gold/20 text-gold-light border border-gold/20" :
              "bg-white/10 text-gray-300 border border-white/10"}
          `}>
            <Sparkles className="w-3 h-3" />
            {matchPercent}% match
          </div>
        </div>

        {/* Image */}
        <div className="relative h-52 overflow-hidden">
          <Image
            src={boat.images[0]}
            alt={boat.name}
            fill
            className="object-cover group-hover:scale-105 transition-transform duration-500"
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-navy/80 via-transparent to-transparent" />
        </div>

        {/* Content */}
        <div className="p-5">
          {/* Title row */}
          <div className="flex items-start justify-between gap-3 mb-2">
            <div>
              <h3 className="text-lg font-medium text-white group-hover:text-gold-light transition-colors">
                {boat.name}
              </h3>
              <p className="text-sm text-gray-400">
                {boat.brand} {boat.model} · {boat.year}
              </p>
            </div>
          </div>

          {/* Stats */}
          <div className="flex items-center gap-4 text-sm text-gray-400 mb-3">
            <span className="flex items-center gap-1">
              <Ruler className="w-3.5 h-3.5" /> {boat.length_ft}ft
            </span>
            <span className="flex items-center gap-1">
              <Users className="w-3.5 h-3.5" /> {boat.guests} guests
            </span>
            <span className="flex items-center gap-1">
              <MapPin className="w-3.5 h-3.5" /> {listing.port}
            </span>
          </div>

          {/* Luxury level */}
          <div className="flex items-center gap-1 mb-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <Star
                key={i}
                className={`w-3.5 h-3.5 ${i < (listing.luxury_level ?? 0) ? "text-gold fill-gold" : "text-gray-600"}`}
              />
            ))}
          </div>

          {/* Match reasons */}
          <div className="flex flex-wrap gap-1.5 mb-3">
            {match_reasons.slice(0, 3).map((reason, i) => (
              <span
                key={i}
                className={`
                  text-xs px-2 py-0.5 rounded-full
                  ${reason.strength === "strong" ? "bg-emerald-500/10 text-emerald-300 border border-emerald-500/10" :
                    reason.strength === "moderate" ? "bg-gold/10 text-gold-light border border-gold/10" :
                    "bg-white/5 text-gray-400 border border-white/5"}
                `}
              >
                {reason.label}
              </span>
            ))}
          </div>

          {/* AI Summary */}
          <p className="text-sm text-gray-400 leading-relaxed line-clamp-2 mb-4">
            {ai_summary}
          </p>

          {/* Price */}
          <div className="flex items-end justify-between pt-3 border-t border-white/[0.06]">
            <div>
              {listing.listing_type === "charter" && listing.price_per_week && (
                <>
                  <span className="text-xl font-light text-white">
                    €{formatPrice(listing.price_per_week)}
                  </span>
                  <span className="text-sm text-gray-400 ml-1">/week</span>
                </>
              )}
              {listing.listing_type === "sale" && listing.sale_price && (
                <>
                  <span className="text-xl font-light text-white">
                    €{listing.sale_price.toLocaleString()}
                  </span>
                  <span className="text-sm text-gray-400 ml-1">sale</span>
                </>
              )}
            </div>
            <span className="text-xs text-gold/60 uppercase tracking-wider">
              {listing.listing_type}
            </span>
          </div>
        </div>
      </article>
    </Link>
  );
}
