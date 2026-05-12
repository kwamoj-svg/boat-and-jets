"use client";

import { use } from "react";
import Image from "next/image";
import { Navbar } from "@/components/Navbar";
import { mockListings } from "@/lib/mock-data";
import { formatPrice } from "@/lib/format";
import {
  ArrowLeft,
  Star,
  Users,
  Ruler,
  MapPin,
  Anchor,
  Calendar,
  Shield,
  Ship,
  Crown,
} from "lucide-react";
import Link from "next/link";

export default function BoatDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const listing = mockListings.find((l) => l.id === id);

  if (!listing) {
    return (
      <main className="min-h-screen bg-navy flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl text-white mb-4">Listing not found</h1>
          <Link href="/" className="text-gold hover:underline">
            Back to search
          </Link>
        </div>
      </main>
    );
  }

  const boat = listing.boat;

  return (
    <main className="relative min-h-screen bg-navy">
      <div className="fixed inset-0 -z-10">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--color-navy-light)_0%,_var(--color-navy)_70%)]" />
      </div>

      <Navbar />

      <div className="pt-20 pb-16 px-4 sm:px-6 lg:px-8 max-w-6xl mx-auto">
        {/* Back link */}
        <button
          onClick={() => window.history.back()}
          className="flex items-center gap-2 text-sm text-gray-400 hover:text-gold transition-colors mb-6"
        >
          <ArrowLeft className="w-4 h-4" /> Back to results
        </button>

        {/* Image gallery */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-10 rounded-2xl overflow-hidden">
          <div className="relative h-72 md:h-96">
            <Image
              src={boat.images[0]}
              alt={boat.name}
              fill
              className="object-cover"
              priority
            />
            {listing.is_sponsored && (
              <span className="absolute top-4 left-4 flex items-center gap-1 px-3 py-1.5 rounded-full bg-gold/90 text-navy text-xs font-medium">
                <Crown className="w-3 h-3" /> Sponsored
              </span>
            )}
          </div>
          {boat.images[1] && (
            <div className="relative h-72 md:h-96 hidden md:block">
              <Image
                src={boat.images[1]}
                alt={boat.name}
                fill
                className="object-cover"
              />
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
          {/* Main content */}
          <div className="lg:col-span-2">
            <div className="mb-6">
              <h1 className="text-3xl sm:text-4xl font-light text-white mb-2">
                {boat.name}
              </h1>
              <p className="text-lg text-gray-400">
                {boat.brand} {boat.model} · {boat.year}
              </p>
            </div>

            {/* Luxury level */}
            <div className="flex items-center gap-1 mb-6">
              {Array.from({ length: 5 }).map((_, i) => (
                <Star
                  key={i}
                  className={`w-5 h-5 ${
                    i < (listing.luxury_level ?? 0)
                      ? "text-gold fill-gold"
                      : "text-gray-600"
                  }`}
                />
              ))}
              <span className="text-sm text-gray-400 ml-2">
                Luxury Level {listing.luxury_level}/5
              </span>
            </div>

            {/* Stats grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
              {[
                { icon: <Ruler className="w-5 h-5" />, value: `${boat.length_ft}ft`, label: "Length" },
                { icon: <Users className="w-5 h-5" />, value: `${boat.guests}`, label: "Guests" },
                { icon: <Anchor className="w-5 h-5" />, value: `${boat.cabins}`, label: "Cabins" },
                { icon: <Ship className="w-5 h-5" />, value: `${boat.crew}`, label: "Crew" },
              ].map((stat) => (
                <div
                  key={stat.label}
                  className="flex flex-col items-center p-4 rounded-xl bg-white/[0.03] border border-white/[0.06]"
                >
                  <span className="text-gold/60 mb-2">{stat.icon}</span>
                  <span className="text-xl text-white font-light">{stat.value}</span>
                  <span className="text-xs text-gray-400">{stat.label}</span>
                </div>
              ))}
            </div>

            {/* Description */}
            <div className="mb-8">
              <h2 className="text-lg font-medium text-white mb-3">About</h2>
              <p className="text-gray-300 leading-relaxed">{boat.description}</p>
            </div>

            {/* Features */}
            <div className="mb-8">
              <h2 className="text-lg font-medium text-white mb-3">Features</h2>
              <div className="flex flex-wrap gap-2">
                {boat.features.map((f) => (
                  <span
                    key={f}
                    className="px-3 py-1.5 rounded-full bg-white/[0.04] border border-white/[0.08] text-sm text-gray-300"
                  >
                    {f}
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* Sidebar — Pricing card */}
          <div className="lg:col-span-1">
            <div className="sticky top-24 rounded-2xl bg-white/[0.03] border border-white/[0.06] p-6">
              {/* Price */}
              <div className="mb-6">
                {listing.listing_type === "charter" && listing.price_per_week && (
                  <div>
                    <span className="text-3xl font-light text-white">
                      €{formatPrice(listing.price_per_week)}
                    </span>
                    <span className="text-gray-400 ml-1">/week</span>
                    {listing.price_per_day && (
                      <p className="text-sm text-gray-500 mt-1">
                        €{formatPrice(listing.price_per_day)}/day
                      </p>
                    )}
                  </div>
                )}
                {listing.listing_type === "sale" && listing.sale_price && (
                  <div>
                    <span className="text-3xl font-light text-white">
                      €{formatPrice(listing.sale_price)}
                    </span>
                    <span className="text-sm text-gray-400 ml-2">Sale Price</span>
                  </div>
                )}
              </div>

              {/* Location */}
              <div className="flex items-center gap-2 text-sm text-gray-300 mb-4">
                <MapPin className="w-4 h-4 text-gold/60" />
                {listing.port}, {listing.country}
              </div>

              {/* Availability */}
              {listing.available_from && (
                <div className="flex items-center gap-2 text-sm text-gray-300 mb-6">
                  <Calendar className="w-4 h-4 text-gold/60" />
                  {listing.available_from} — {listing.available_to}
                </div>
              )}

              {/* Provider */}
              <div className="flex items-center gap-2 text-sm text-gray-400 mb-6 pb-6 border-b border-white/[0.06]">
                <Shield className="w-4 h-4 text-gold/60" />
                {listing.provider}
              </div>

              {/* CTA */}
              <button className="w-full py-3.5 rounded-xl gold-gradient text-navy font-medium hover:shadow-[0_0_20px_rgba(200,165,90,0.3)] active:scale-[0.98] transition-all">
                Request This Yacht
              </button>
              <button className="w-full py-3 mt-3 rounded-xl bg-white/[0.04] border border-white/[0.08] text-white text-sm hover:border-gold/20 transition-colors">
                Save to Favorites
              </button>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
