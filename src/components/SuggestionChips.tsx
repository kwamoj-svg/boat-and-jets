"use client";

import { useRouter } from "next/navigation";
import { Anchor, Gem, Users, Zap, PartyPopper, Sun, Sailboat, Ship } from "lucide-react";
import type { ReactNode } from "react";

interface Suggestion {
  label: string;
  query: string;
  icon: ReactNode;
}

const suggestions: Suggestion[] = [
  { label: "Segeln Kroatien", query: "Segelboot chartern Kroatien 6 Personen eine Woche", icon: <Sailboat className="w-3.5 h-3.5" /> },
  { label: "Luxury Dubai", query: "Luxury superyacht charter Dubai 10 guests", icon: <Gem className="w-3.5 h-3.5" /> },
  { label: "Katamaran Griechenland", query: "Katamaran mieten Griechenland 8 Personen unter 15000€", icon: <Ship className="w-3.5 h-3.5" /> },
  { label: "Family Mallorca", query: "Familienboot Mallorca 4 Kabinen Kinder", icon: <Users className="w-3.5 h-3.5" /> },
  { label: "Party Ibiza", query: "Party catamaran Ibiza 20 guests weekend", icon: <PartyPopper className="w-3.5 h-3.5" /> },
  { label: "Motor Monaco", query: "High-performance motor yacht Monaco", icon: <Zap className="w-3.5 h-3.5" /> },
  { label: "Côte d'Azur", query: "Location yacht Côte d'Azur Saint-Tropez luxe", icon: <Sun className="w-3.5 h-3.5" /> },
  { label: "Karibik Törn", query: "Katamaran chartern Karibik BVI 2 Wochen All Inclusive", icon: <Anchor className="w-3.5 h-3.5" /> },
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
