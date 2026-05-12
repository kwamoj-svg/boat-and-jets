import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getProfile, getSavedBoats, getSearchHistory } from "@/app/actions/user";
import { Navbar } from "@/components/Navbar";
import {
  Heart,
  Search,
  Bell,
  Clock,
  Anchor,
  ExternalLink,
  ChevronRight,
} from "lucide-react";
import Link from "next/link";

export const metadata = {
  title: "My Profile — VELIQA",
  description: "Your VELIQA dashboard — saved boats, search history, and alerts.",
};

export default async function ProfilePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/login?redirect=/profile");
  }

  const [profile, savedBoats, searchHistory] = await Promise.all([
    getProfile(),
    getSavedBoats(),
    getSearchHistory(),
  ]);

  const displayName = profile?.display_name || "Explorer";
  const totalSearches = searchHistory.length;
  const totalSaved = savedBoats.length;

  return (
    <>
      <Navbar showSearch />
      <main className="min-h-screen bg-navy pt-24 pb-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <div className="mb-10">
            <h1 className="text-3xl sm:text-4xl font-light text-white">
              Welcome back,{" "}
              <span className="text-gold-gradient font-medium">
                {displayName}
              </span>
            </h1>
            <p className="text-gray-400 mt-2">
              Your yacht discovery dashboard
            </p>
          </div>

          {/* Quick Stats */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-10">
            <div className="glass rounded-2xl p-6 flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-gold/10 flex items-center justify-center">
                <Search className="w-5 h-5 text-gold" />
              </div>
              <div>
                <p className="text-2xl font-light text-white">{totalSearches}</p>
                <p className="text-sm text-gray-400">Searches</p>
              </div>
            </div>
            <div className="glass rounded-2xl p-6 flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-gold/10 flex items-center justify-center">
                <Heart className="w-5 h-5 text-gold" />
              </div>
              <div>
                <p className="text-2xl font-light text-white">{totalSaved}</p>
                <p className="text-sm text-gray-400">Saved Boats</p>
              </div>
            </div>
            <Link
              href="/profile/alerts"
              className="glass rounded-2xl p-6 flex items-center gap-4 hover:border-gold/20 transition-all group"
            >
              <div className="w-12 h-12 rounded-xl bg-gold/10 flex items-center justify-center">
                <Bell className="w-5 h-5 text-gold" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-white group-hover:text-gold-light transition-colors">
                  Notification Alerts
                </p>
                <p className="text-sm text-gray-400">Manage your alerts</p>
              </div>
              <ChevronRight className="w-4 h-4 text-gray-500 group-hover:text-gold transition-colors" />
            </Link>
          </div>

          {/* Saved Boats */}
          <section className="mb-12">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-medium text-white flex items-center gap-2">
                <Heart className="w-5 h-5 text-gold" />
                Saved Boats
              </h2>
              {totalSaved > 6 && (
                <span className="text-sm text-gray-400">
                  Showing {Math.min(6, totalSaved)} of {totalSaved}
                </span>
              )}
            </div>

            {savedBoats.length === 0 ? (
              <div className="glass rounded-2xl p-12 text-center">
                <Anchor className="w-10 h-10 text-gray-600 mx-auto mb-4" />
                <p className="text-gray-400 mb-2">No saved boats yet</p>
                <p className="text-sm text-gray-500">
                  Tap the heart icon on any listing to save it here.
                </p>
                <Link
                  href="/"
                  className="inline-block mt-6 px-6 py-2.5 rounded-full bg-gradient-to-r from-gold to-gold-light text-navy font-medium text-sm hover:opacity-90 transition-opacity"
                >
                  Start Exploring
                </Link>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {savedBoats.slice(0, 6).map((boat) => {
                  const data = boat.boat_data as Record<string, unknown> | null;
                  const imageUrl =
                    (data?.image_url as string) ||
                    "https://images.unsplash.com/photo-1567899378494-47b22a2ae96a?w=600&h=400&fit=crop";
                  const price =
                    (data?.price_per_week as number) ||
                    (data?.sale_price as number);
                  const currency =
                    (data?.currency as string) === "USD"
                      ? "$"
                      : (data?.currency as string) === "GBP"
                        ? "£"
                        : "€";
                  const boatType = (data?.type as string) || "";

                  return (
                    <div
                      key={boat.id}
                      className="glass rounded-2xl overflow-hidden hover:border-gold/20 transition-all group"
                    >
                      <div className="relative h-40 overflow-hidden">
                        <img
                          src={imageUrl}
                          alt={boat.boat_name}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                          loading="lazy"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-navy/90 via-navy/20 to-transparent" />
                        {boatType && (
                          <span className="absolute bottom-2 right-3 text-xs text-gold-light bg-navy/60 backdrop-blur-sm px-2 py-1 rounded-lg capitalize">
                            {boatType}
                          </span>
                        )}
                      </div>
                      <div className="p-4">
                        <h3 className="text-sm font-medium text-white truncate group-hover:text-gold-light transition-colors">
                          {boat.boat_name}
                        </h3>
                        <div className="flex items-center justify-between mt-2">
                          {price ? (
                            <span className="text-sm text-gold">
                              {currency}
                              {price.toLocaleString()}
                            </span>
                          ) : (
                            <span className="text-xs text-gray-500">
                              Price on request
                            </span>
                          )}
                          <a
                            href={boat.source_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-gray-500 hover:text-gold transition-colors"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                          </a>
                        </div>
                        {boat.notes && (
                          <p className="text-xs text-gray-500 mt-2 truncate">
                            {boat.notes}
                          </p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>

          {/* Recent Searches */}
          <section>
            <h2 className="text-xl font-medium text-white flex items-center gap-2 mb-6">
              <Clock className="w-5 h-5 text-gold" />
              Recent Searches
            </h2>

            {searchHistory.length === 0 ? (
              <div className="glass rounded-2xl p-12 text-center">
                <Search className="w-10 h-10 text-gray-600 mx-auto mb-4" />
                <p className="text-gray-400 mb-2">No searches yet</p>
                <p className="text-sm text-gray-500">
                  Your search history will appear here.
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {searchHistory.map((entry) => {
                  const createdAt = new Date(entry.created_at);
                  const timeAgo = getTimeAgo(createdAt);

                  return (
                    <Link
                      key={entry.id}
                      href={`/search?q=${encodeURIComponent(entry.query_text)}`}
                      className="glass rounded-xl p-4 flex items-center gap-4 hover:border-gold/20 transition-all group block"
                    >
                      <Search className="w-4 h-4 text-gray-500 group-hover:text-gold shrink-0 transition-colors" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-white truncate group-hover:text-gold-light transition-colors">
                          {entry.query_text}
                        </p>
                      </div>
                      <div className="flex items-center gap-3 shrink-0">
                        {entry.result_count != null && (
                          <span className="text-xs text-gray-500">
                            {entry.result_count} results
                          </span>
                        )}
                        <span className="text-xs text-gray-600">{timeAgo}</span>
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}
          </section>
        </div>
      </main>
    </>
  );
}

function getTimeAgo(date: Date): string {
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return date.toLocaleDateString();
}
