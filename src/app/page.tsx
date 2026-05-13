"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { Logo } from "@/components/Logo";
import { SearchInput } from "@/components/SearchInput";
import { FilterBar } from "@/components/FilterBar";
import { ExperienceChips } from "@/components/ExperienceChips";
import { GlobeCanvas } from "@/components/GlobeCanvas";
import { ListingCard } from "@/components/ListingCard";
import { Navbar } from "@/components/Navbar";
import { Waves, Shield, Sparkles, Globe, Loader2, Ship } from "lucide-react";
import { Footer } from "@/components/Footer";
import { CookieBanner } from "@/components/CookieBanner";
import type { DestinationName } from "@/components/FilterBar";
import type { ExtractedListing } from "@/lib/claude-ai";

export default function Home() {
  const router = useRouter();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [globeHighlight, setGlobeHighlight] = useState<DestinationName | null>(null);
  const [selectedDest, setSelectedDest] = useState<DestinationName | null>(null);
  const handleDropdown = useCallback((open: boolean) => setDropdownOpen(open), []);

  // Search results state
  const [listings, setListings] = useState<ExtractedListing[]>([]);
  const [searching, setSearching] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [stageMessage, setStageMessage] = useState("");
  const [searchDone, setSearchDone] = useState(false);
  const resultsRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  const handleDestHover = useCallback((dest: DestinationName | null) => {
    setGlobeHighlight(dest ?? selectedDest);
  }, [selectedDest]);

  const handleDestSelect = useCallback((dest: DestinationName | null) => {
    setSelectedDest(dest);
    setGlobeHighlight(dest);
  }, []);

  // Stream search results inline
  const startSearch = useCallback(async (query: string) => {
    if (!query.trim()) return;

    // Abort previous search
    if (abortRef.current) abortRef.current.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setSearching(true);
    setListings([]);
    setSearchQuery(query);
    setStageMessage("Suche wird vorbereitet...");
    setSearchDone(false);

    // Scroll to results area
    setTimeout(() => {
      resultsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 200);

    try {
      const res = await fetch(`/api/search?q=${encodeURIComponent(query)}`, {
        signal: controller.signal,
      });
      if (!res.ok || !res.body) {
        setSearching(false);
        setSearchDone(true);
        return;
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        let currentEvent = "";
        for (const line of lines) {
          if (line.startsWith("event: ")) {
            currentEvent = line.slice(7);
          } else if (line.startsWith("data: ") && currentEvent) {
            try {
              const data = JSON.parse(line.slice(6));
              switch (currentEvent) {
                case "stage":
                  setStageMessage(data.message);
                  break;
                case "listing":
                  setListings((prev) => [...prev, data]);
                  setSearching(false); // Show results as they arrive
                  break;
                case "done":
                  setSearchDone(true);
                  setSearching(false);
                  break;
                case "error":
                  setSearching(false);
                  setSearchDone(true);
                  break;
              }
            } catch { /* skip */ }
            currentEvent = "";
          }
        }
      }
    } catch (e) {
      if (e instanceof Error && e.name !== "AbortError") {
        setSearching(false);
        setSearchDone(true);
      }
    } finally {
      setSearching(false);
      setSearchDone(true);
    }
  }, []);

  // Intercept SearchInput navigation — search inline instead
  useEffect(() => {
    const handleNavigation = (e: PopStateEvent) => {
      const url = new URL(window.location.href);
      if (url.pathname === "/search" && url.searchParams.get("q")) {
        e.preventDefault();
        startSearch(url.searchParams.get("q")!);
      }
    };
    window.addEventListener("popstate", handleNavigation);
    return () => window.removeEventListener("popstate", handleNavigation);
  }, [startSearch]);

  // Override router push for /search
  useEffect(() => {
    const originalPush = router.push;
    const interceptedPush = (href: string, ...args: Parameters<typeof router.push> extends [unknown, ...infer R] ? R : never[]) => {
      if (typeof href === "string" && href.startsWith("/search?q=")) {
        const url = new URL(href, window.location.origin);
        const q = url.searchParams.get("q");
        if (q) {
          startSearch(q);
          // Update URL without navigation
          window.history.pushState({}, "", href);
          return;
        }
      }
      return originalPush(href, ...args);
    };
    router.push = interceptedPush as typeof router.push;
    return () => { router.push = originalPush; };
  }, [router, startSearch]);

  const hasResults = listings.length > 0 || searching || searchDone;

  return (
    <main className="relative min-h-screen flex flex-col">
      {/* Navbar always visible — shows search bar only when results are showing */}
      <Navbar showSearch={hasResults} searchQuery={searchQuery} />

      {/* Background gradient */}
      <div className="fixed inset-0 -z-10">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--color-navy-light)_0%,_var(--color-navy)_70%)]" />
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[600px] bg-gold/[0.02] rounded-full blur-[120px]" />
        <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-gold/10 to-transparent" />
      </div>

      {/* Hero section — collapse when results showing */}
      <section className={`relative flex flex-col items-center justify-center px-4 sm:px-6 transition-all duration-500 ${
        hasResults ? "pt-6 pb-4 min-h-0" : "flex-1 pt-10 pb-16 min-h-[85vh]"
      }`}>
        {/* Globe — hide when results showing */}
        {!hasResults && (
          <div
            className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-[42%] pointer-events-none select-none transition-opacity duration-700"
            style={{ opacity: globeHighlight ? 0.65 : 0.35 }}
          >
            <div
              className="transition-all duration-700"
              style={{
                filter: globeHighlight
                  ? "drop-shadow(0 0 60px rgba(200,165,90,0.12))"
                  : "none",
              }}
            >
              <GlobeCanvas highlightDestination={globeHighlight} size={520} />
            </div>
          </div>
        )}

        {/* Content */}
        <div className={`relative z-10 w-full max-w-5xl mx-auto text-center ${hasResults ? "" : ""}`}>
          {!hasResults && (
            <>
              <div className="mb-6 animate-fade-in">
                <Logo size="large" />
              </div>
              <p
                className="text-gray-400 text-lg sm:text-xl mb-8 font-light tracking-wide animate-fade-in"
                style={{ animationDelay: "0.15s", opacity: 0 }}
              >
                AI-Powered Yacht & Boat Discovery — veliqa.life
              </p>
            </>
          )}

          {/* Search bar */}
          <div className={`max-w-3xl mx-auto relative z-20 ${hasResults ? "" : "animate-fade-in"}`}
            style={hasResults ? {} : { animationDelay: "0.3s", opacity: 0 }}
          >
            <SearchInput size={hasResults ? "default" : "large"} onDropdownChange={handleDropdown} />
          </div>

          {/* Filters — only show when no results */}
          {!hasResults && !dropdownOpen && (
            <div
              className="animate-fade-in mt-6 relative z-10"
              style={{ animationDelay: "0.45s", opacity: 0 }}
            >
              <FilterBar
                onDestinationHover={handleDestHover}
                onDestinationSelect={handleDestSelect}
              />
              <ExperienceChips />
            </div>
          )}
        </div>
      </section>

      {/* ═══════ SEARCH RESULTS ═══════ */}
      <div ref={resultsRef}>
        {/* Loading state */}
        {searching && listings.length === 0 && (
          <section className="px-4 sm:px-6 py-12">
            <div className="max-w-6xl mx-auto text-center">
              <Loader2 className="w-10 h-10 text-gold/60 mx-auto mb-4 animate-spin" />
              <p className="text-gray-400 text-lg">{stageMessage || "Suche läuft..."}</p>
              <p className="text-gray-600 text-sm mt-2">
                {searchQuery && <>Suche nach &quot;{searchQuery}&quot;</>}
              </p>
            </div>
          </section>
        )}

        {/* Stage message while results are streaming */}
        {searching && listings.length > 0 && (
          <div className="px-4 sm:px-6 pt-4 pb-2">
            <div className="max-w-6xl mx-auto flex items-center gap-3">
              <Loader2 className="w-4 h-4 text-gold/60 animate-spin flex-shrink-0" />
              <p className="text-sm text-gray-500">{stageMessage}</p>
            </div>
          </div>
        )}

        {/* Results grid */}
        {listings.length > 0 && (
          <section className="px-4 sm:px-6 py-6">
            <div className="max-w-6xl mx-auto">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-white text-lg font-light">
                  {searchDone
                    ? `${listings.length} Ergebnisse für "${searchQuery}"`
                    : `${listings.length} Ergebnisse bisher...`
                  }
                </h2>
                {searchDone && (
                  <button
                    onClick={() => {
                      setListings([]);
                      setSearchDone(false);
                      setSearchQuery("");
                      window.history.pushState({}, "", "/");
                    }}
                    className="text-sm text-gray-500 hover:text-gold transition-colors"
                  >
                    Neue Suche
                  </button>
                )}
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                {listings.map((listing, i) => (
                  <ListingCard key={`${listing.name}-${i}`} listing={listing} index={i} />
                ))}
              </div>
            </div>
          </section>
        )}

        {/* No results */}
        {searchDone && listings.length === 0 && searchQuery && (
          <section className="px-4 sm:px-6 py-16">
            <div className="max-w-6xl mx-auto text-center">
              <Ship className="w-12 h-12 text-gray-600 mx-auto mb-4" />
              <p className="text-gray-400 text-lg">Keine Ergebnisse für &quot;{searchQuery}&quot;</p>
              <p className="text-gray-600 text-sm mt-2">Versuche einen anderen Suchbegriff</p>
            </div>
          </section>
        )}
      </div>

      {/* Trust bar — only when no results */}
      {!hasResults && (
        <section className="border-t border-white/[0.04] py-10 px-4">
          <div className="max-w-5xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
            {[
              { icon: <Sparkles className="w-5 h-5" />, label: "AI-Powered Matching" },
              { icon: <Globe className="w-5 h-5" />, label: "Global Discovery" },
              { icon: <Waves className="w-5 h-5" />, label: "10,000+ Yachts" },
              { icon: <Shield className="w-5 h-5" />, label: "Verified Listings" },
            ].map((item) => (
              <div key={item.label} className="flex flex-col items-center gap-2">
                <span className="text-gold/60">{item.icon}</span>
                <span className="text-sm text-gray-400 font-light">{item.label}</span>
              </div>
            ))}
          </div>
        </section>
      )}

      <Footer />
      <CookieBanner />
    </main>
  );
}
