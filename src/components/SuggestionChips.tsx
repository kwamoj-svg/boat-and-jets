"use client";

import { useRouter } from "next/navigation";
import { Anchor, Gem, Users, Zap, PartyPopper } from "lucide-react";
import type { ReactNode } from "react";

interface Suggestion {
  label: string;
  query: string;
  icon: ReactNode;
}

const suggestions: Suggestion[] = [
  { label: "Charter in Croatia", query: "Luxury yacht charter in Croatia for a week", icon: <Anchor className="w-3.5 h-3.5" /> },
  { label: "Luxury Yacht Dubai", query: "Luxury superyacht in Dubai", icon: <Gem className="w-3.5 h-3.5" /> },
  { label: "Family Boat Greece", query: "Family-friendly sailing boat in Greece with 4 cabins", icon: <Users className="w-3.5 h-3.5" /> },
  { label: "Sport Yacht Monaco", query: "High-performance sport yacht in Monaco", icon: <Zap className="w-3.5 h-3.5" /> },
  { label: "Ibiza Party Boat", query: "Party catamaran in Ibiza for 20 guests", icon: <PartyPopper className="w-3.5 h-3.5" /> },
];

export function SuggestionChips() {
  const router = useRouter();

  return (
    <div className="flex flex-wrap justify-center gap-2 mt-6">
      {suggestions.map((s) => (
        <button
          key={s.label}
          onClick={() => router.push(`/search?q=${encodeURIComponent(s.query)}`)}
          className="
            group flex items-center gap-2
            px-4 py-2 rounded-full
            bg-white/[0.04] border border-white/[0.06]
            text-sm text-gray-300
            hover:bg-white/[0.08] hover:border-gold/20 hover:text-gold-light
            active:scale-95
            transition-all duration-200
          "
        >
          <span className="text-gold/40 group-hover:text-gold transition-colors">{s.icon}</span>
          {s.label}
        </button>
      ))}
    </div>
  );
}
