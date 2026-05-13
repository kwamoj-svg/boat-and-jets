import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import Link from "next/link";
import {
  Heart, Search, Bell, Anchor, Clock,
  Settings, ChevronRight, MapPin, Star,
  Calendar, Compass, Ship, Globe,
} from "lucide-react";

export const metadata = {
  title: "Dashboard — VELIQA",
  description: "Dein persönliches VELIQA Dashboard",
};

async function getUserData(userId: string) {
  const supabase = await createClient();

  // Parallel fetch all user data
  const [savedRes, historyRes, profileRes] = await Promise.allSettled([
    supabase
      .from("saved_boats")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(6),
    supabase
      .from("search_cache")
      .select("query, created_at")
      .order("created_at", { ascending: false })
      .limit(10),
    supabase
      .from("profiles")
      .select("*")
      .eq("id", userId)
      .single(),
  ]);

  return {
    saved: savedRes.status === "fulfilled" ? savedRes.value.data || [] : [],
    history: historyRes.status === "fulfilled" ? historyRes.value.data || [] : [],
    profile: profileRes.status === "fulfilled" ? profileRes.value.data : null,
  };
}

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?redirect=/dashboard");
  }

  const { saved, history, profile } = await getUserData(user.id);
  const name = user.user_metadata?.full_name || user.email?.split("@")[0] || "Seefahrer";
  const isAdmin = profile?.role === "admin";

  // Time-based greeting
  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Guten Morgen" : hour < 18 ? "Guten Tag" : "Guten Abend";

  return (
    <>
      <Navbar showSearch searchQuery="" />
      <main className="min-h-screen pt-20 pb-16 px-4 sm:px-6 bg-[radial-gradient(ellipse_at_top,_var(--color-navy-light)_0%,_var(--color-navy)_70%)]">
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-2xl sm:text-3xl font-light text-white">
              {greeting}, <span className="text-gold">{name}</span>
            </h1>
            <p className="text-gray-400 mt-1">
              Willkommen in deinem VELIQA Dashboard
            </p>
          </div>

          {/* Quick Actions */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
            <Link
              href="/"
              className="group bg-white/[0.03] border border-white/10 rounded-xl p-4 hover:border-gold/30 hover:bg-gold/[0.03] transition-all"
            >
              <Search className="w-5 h-5 text-gold/60 group-hover:text-gold mb-2" />
              <p className="text-sm text-white font-medium">Neue Suche</p>
              <p className="text-xs text-gray-500 mt-0.5">Boot finden</p>
            </Link>
            <Link
              href="/charter"
              className="group bg-white/[0.03] border border-white/10 rounded-xl p-4 hover:border-gold/30 hover:bg-gold/[0.03] transition-all"
            >
              <Anchor className="w-5 h-5 text-gold/60 group-hover:text-gold mb-2" />
              <p className="text-sm text-white font-medium">Katalog</p>
              <p className="text-xs text-gray-500 mt-0.5">Charter-Boote</p>
            </Link>
            <Link
              href="/network"
              className="group bg-white/[0.03] border border-white/10 rounded-xl p-4 hover:border-gold/30 hover:bg-gold/[0.03] transition-all"
            >
              <Globe className="w-5 h-5 text-gold/60 group-hover:text-gold mb-2" />
              <p className="text-sm text-white font-medium">Netzwerk</p>
              <p className="text-xs text-gray-500 mt-0.5">Yacht-Partner</p>
            </Link>
            {isAdmin ? (
              <Link
                href="/admin"
                className="group bg-white/[0.03] border border-white/10 rounded-xl p-4 hover:border-gold/30 hover:bg-gold/[0.03] transition-all"
              >
                <Settings className="w-5 h-5 text-gold/60 group-hover:text-gold mb-2" />
                <p className="text-sm text-white font-medium">Admin</p>
                <p className="text-xs text-gray-500 mt-0.5">Verwaltung</p>
              </Link>
            ) : (
              <Link
                href="/partner/register"
                className="group bg-white/[0.03] border border-white/10 rounded-xl p-4 hover:border-gold/30 hover:bg-gold/[0.03] transition-all"
              >
                <Ship className="w-5 h-5 text-gold/60 group-hover:text-gold mb-2" />
                <p className="text-sm text-white font-medium">Partner</p>
                <p className="text-xs text-gray-500 mt-0.5">Boot anbieten</p>
              </Link>
            )}
          </div>

          <div className="grid lg:grid-cols-3 gap-6">
            {/* Saved boats */}
            <div className="lg:col-span-2 bg-white/[0.03] border border-white/10 rounded-xl p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-white font-medium flex items-center gap-2">
                  <Heart className="w-4 h-4 text-gold/60" />
                  Gespeicherte Boote
                </h2>
                {saved.length > 0 && (
                  <Link href="/profile" className="text-xs text-gold/60 hover:text-gold flex items-center gap-1">
                    Alle anzeigen <ChevronRight className="w-3 h-3" />
                  </Link>
                )}
              </div>

              {saved.length > 0 ? (
                <div className="grid sm:grid-cols-2 gap-3">
                  {saved.slice(0, 4).map((boat: Record<string, unknown>, i: number) => (
                    <div key={i} className="bg-white/[0.02] border border-white/5 rounded-lg p-3 hover:border-white/10 transition-colors">
                      <p className="text-sm text-white font-medium truncate">{String(boat.boat_name || "Boot")}</p>
                      <div className="flex items-center gap-3 mt-1">
                        {typeof boat.location === "string" && boat.location && (
                          <span className="text-xs text-gray-500 flex items-center gap-1">
                            <MapPin className="w-3 h-3" /> {boat.location}
                          </span>
                        )}
                        {boat.price != null && (
                          <span className="text-xs text-gold/60">
                            {String(boat.price)}
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <Heart className="w-8 h-8 text-gray-600 mx-auto mb-3" />
                  <p className="text-sm text-gray-400">Noch keine gespeicherten Boote</p>
                  <p className="text-xs text-gray-600 mt-1">Suche nach Booten und speichere deine Favoriten</p>
                  <Link
                    href="/"
                    className="inline-block mt-4 text-sm text-gold/80 hover:text-gold border border-gold/30 rounded-lg px-4 py-2"
                  >
                    Suche starten
                  </Link>
                </div>
              )}
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              {/* Profile card */}
              <div className="bg-white/[0.03] border border-white/10 rounded-xl p-6">
                <div className="flex items-center gap-3 mb-4">
                  {user.user_metadata?.avatar_url ? (
                    <img
                      src={user.user_metadata.avatar_url}
                      alt=""
                      className="w-12 h-12 rounded-full border border-white/20"
                    />
                  ) : (
                    <div className="w-12 h-12 rounded-full bg-gold/20 border border-gold/30 flex items-center justify-center text-gold text-lg font-medium">
                      {name.charAt(0).toUpperCase()}
                    </div>
                  )}
                  <div>
                    <p className="text-white font-medium">{name}</p>
                    <p className="text-xs text-gray-500">{user.email}</p>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div className="bg-white/[0.02] rounded-lg py-2">
                    <p className="text-white font-medium text-sm">{saved.length}</p>
                    <p className="text-[10px] text-gray-500">Gespeichert</p>
                  </div>
                  <div className="bg-white/[0.02] rounded-lg py-2">
                    <p className="text-white font-medium text-sm">{history.length}</p>
                    <p className="text-[10px] text-gray-500">Suchen</p>
                  </div>
                  <div className="bg-white/[0.02] rounded-lg py-2">
                    <p className="text-white font-medium text-sm">0</p>
                    <p className="text-[10px] text-gray-500">Anfragen</p>
                  </div>
                </div>
              </div>

              {/* Recent searches */}
              <div className="bg-white/[0.03] border border-white/10 rounded-xl p-6">
                <h3 className="text-white font-medium flex items-center gap-2 mb-3">
                  <Clock className="w-4 h-4 text-gold/60" />
                  Letzte Suchen
                </h3>
                {history.length > 0 ? (
                  <div className="space-y-2">
                    {history.slice(0, 5).map((item: Record<string, unknown>, i: number) => (
                      <Link
                        key={i}
                        href={`/search?q=${encodeURIComponent(String(item.query || ""))}`}
                        className="flex items-center gap-2 text-sm text-gray-400 hover:text-white transition-colors py-1"
                      >
                        <Search className="w-3 h-3 text-gray-600" />
                        <span className="truncate">{String(item.query)}</span>
                      </Link>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-gray-600">Noch keine Suchen</p>
                )}
              </div>

              {/* Popular destinations */}
              <div className="bg-white/[0.03] border border-white/10 rounded-xl p-6">
                <h3 className="text-white font-medium flex items-center gap-2 mb-3">
                  <Compass className="w-4 h-4 text-gold/60" />
                  Beliebte Ziele
                </h3>
                <div className="flex flex-wrap gap-2">
                  {["Mallorca", "Kroatien", "Ibiza", "Griechenland", "Sardinien", "Türkei"].map((dest) => (
                    <Link
                      key={dest}
                      href={`/search?q=Boot+chartern+${dest}`}
                      className="text-xs px-3 py-1.5 rounded-full border border-white/10 text-gray-400 hover:text-white hover:border-gold/30 transition-colors"
                    >
                      {dest}
                    </Link>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
