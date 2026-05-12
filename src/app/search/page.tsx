"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { Navbar } from "@/components/Navbar";
import { SearchInput } from "@/components/SearchInput";
import { QueryInsight } from "@/components/QueryInsight";
import { ListingCard } from "@/components/ListingCard";
import { SearchLoading } from "@/components/SearchLoading";
import { SlidersHorizontal } from "lucide-react";
import type { ExtractedListing } from "@/lib/claude-ai";

interface SearchResponse {
  query: {
    raw_query: string;
    parsed: {
      intent: string;
      region?: string;
      country?: string;
      budget_max?: number;
      currency: string;
      boat_type?: string;
      guests?: number;
      date?: string;
      style?: string;
      keywords: string[];
    };
  };
  recommendations: ExtractedListing[];
  total_found: number;
  search_id: string;
  error?: string;
}

function SearchContent() {
  const searchParams = useSearchParams();
  const q = searchParams.get("q") ?? "";
  const [result, setResult] = useState<SearchResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!q) return;
    setLoading(true);
    setResult(null);
    setError(null);

    const controller = new AbortController();

    (async () => {
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(q)}`, {
          signal: controller.signal,
        });
        const data = await res.json();
        if (data.error) {
          setError(data.error);
        } else {
          setResult(data);
        }
      } catch (e) {
        if (e instanceof Error && e.name !== "AbortError") {
          setError("Search failed. Please try again.");
        }
      } finally {
        setLoading(false);
      }
    })();

    return () => controller.abort();
  }, [q]);

  return (
    <main className="relative min-h-screen bg-navy">
      <div className="fixed inset-0 -z-10">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--color-navy-light)_0%,_var(--color-navy)_70%)]" />
      </div>

      <Navbar showSearch searchQuery={q} />

      <div className="pt-24 pb-16 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        <div className="sm:hidden mb-6">
          <SearchInput initialValue={q} />
        </div>

        {loading ? (
          <SearchLoading />
        ) : error ? (
          <div className="text-center py-24">
            <p className="text-red-400 mb-4">{error}</p>
            <button
              onClick={() => window.location.reload()}
              className="px-6 py-2 rounded-xl bg-gold/10 border border-gold/20 text-gold-light text-sm hover:bg-gold/20 transition-colors"
            >
              Try again
            </button>
          </div>
        ) : result && result.recommendations.length > 0 ? (
          <>
            <div className="mb-8">
              <h1 className="text-2xl sm:text-3xl font-light text-white mb-2">
                <span className="text-gold">{result.total_found}</span>{" "}
                recommendations found
              </h1>
              <p className="text-gray-400 text-sm">
                Live AI-powered results for &ldquo;{q}&rdquo;
              </p>
            </div>

            <QueryInsight parsed={result.query.parsed} />

            <div className="flex items-center gap-3 mb-8 overflow-x-auto pb-2">
              <button className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/[0.04] border border-white/[0.08] text-sm text-gray-300 hover:border-gold/20 transition-colors shrink-0">
                <SlidersHorizontal className="w-4 h-4" />
                Filters
              </button>
              {["Charter", "Sale", "Luxury", "Family", "Under €50k"].map(
                (f) => (
                  <button
                    key={f}
                    className="px-4 py-2 rounded-xl bg-white/[0.04] border border-white/[0.08] text-sm text-gray-300 hover:border-gold/20 hover:text-gold-light transition-colors shrink-0"
                  >
                    {f}
                  </button>
                )
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {result.recommendations.map((listing, i) => (
                <ListingCard
                  key={listing.source_url + i}
                  listing={listing}
                  index={i}
                />
              ))}
            </div>
          </>
        ) : (
          <div className="text-center py-24 text-gray-400">
            No results found. Try a different search.
          </div>
        )}
      </div>
    </main>
  );
}

export default function SearchPage() {
  return (
    <Suspense fallback={<SearchLoading />}>
      <SearchContent />
    </Suspense>
  );
}
