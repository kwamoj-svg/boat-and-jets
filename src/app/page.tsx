"use client";

import { useState, useCallback } from "react";
import { Logo } from "@/components/Logo";
import { SearchInput } from "@/components/SearchInput";
import { SuggestionChips } from "@/components/SuggestionChips";
import { Waves, Shield, Sparkles, Globe } from "lucide-react";

export default function Home() {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const handleDropdown = useCallback((open: boolean) => setDropdownOpen(open), []);

  return (
    <main className="relative min-h-screen flex flex-col">
      {/* Background layers */}
      <div className="fixed inset-0 -z-10">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--color-navy-light)_0%,_var(--color-navy)_70%)]" />
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[600px] bg-gold/[0.02] rounded-full blur-[120px]" />
        <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-gold/10 to-transparent" />
      </div>

      {/* Hero */}
      <section className="flex-1 flex flex-col items-center justify-center px-4 sm:px-6 pt-12 pb-24">
        <div className="w-full max-w-3xl mx-auto text-center">
          <div className="mb-12 animate-fade-in">
            <Logo size="large" />
          </div>

          <p
            className="text-gray-400 text-lg sm:text-xl mb-10 font-light tracking-wide animate-fade-in"
            style={{ animationDelay: "0.15s", opacity: 0 }}
          >
            AI-Powered Yacht & Boat Discovery
          </p>

          <div
            className="animate-fade-in"
            style={{ animationDelay: "0.3s", opacity: 0 }}
          >
            <SearchInput size="large" autoFocus onDropdownChange={handleDropdown} />
          </div>

          <div
            className={`animate-fade-in transition-all duration-200 ${dropdownOpen ? "opacity-0 pointer-events-none" : ""}`}
            style={{ animationDelay: "0.45s", ...(!dropdownOpen ? {} : {}) }}
          >
            <SuggestionChips />
          </div>
        </div>
      </section>

      {/* Trust bar */}
      <section className="border-t border-white/[0.04] py-12 px-4">
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

      {/* Footer */}
      <footer className="border-t border-white/[0.04] py-6 px-4 text-center">
        <p className="text-xs text-gray-500 tracking-wider">
          BOAT — THE FUTURE OF YACHT DISCOVERY
        </p>
      </footer>
    </main>
  );
}
