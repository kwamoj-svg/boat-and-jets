"use client";

import { useRouter } from "next/navigation";
import { Sparkles, Heart, PartyPopper, Compass, Crown, Waves, Utensils, Zap } from "lucide-react";
import { getExperienceChips } from "@/lib/experience-search";

const ICONS: Record<string, React.ReactNode> = {
  "romantic-sunset": <Heart className="w-3.5 h-3.5" />,
  "family-adventure": <Compass className="w-3.5 h-3.5" />,
  "party-boat": <PartyPopper className="w-3.5 h-3.5" />,
  "island-hopping": <Compass className="w-3.5 h-3.5" />,
  "luxury-escape": <Crown className="w-3.5 h-3.5" />,
  "diving-expedition": <Waves className="w-3.5 h-3.5" />,
  "sunset-dinner": <Utensils className="w-3.5 h-3.5" />,
  "watersports": <Zap className="w-3.5 h-3.5" />,
};

export function ExperienceChips() {
  const router = useRouter();
  const chips = getExperienceChips();

  return (
    <div className="mt-6">
      <div className="flex items-center gap-2 mb-3">
        <Sparkles className="w-4 h-4 text-gold" />
        <span className="text-sm text-gray-400">Erlebnisse entdecken</span>
      </div>
      <div className="flex flex-wrap gap-2 justify-center">
        {chips.map((chip) => (
          <button
            key={chip.slug}
            onClick={() => router.push(`/search?q=${encodeURIComponent(chip.query)}`)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/5 border border-white/10 text-gray-300 text-sm hover:bg-gold/10 hover:border-gold/30 hover:text-gold-light transition-all duration-200"
          >
            {ICONS[chip.slug]}
            {chip.label}
          </button>
        ))}
      </div>
    </div>
  );
}
