"use client";

import { MapPin, Wallet, Ship, Users, Gem, Target, Calendar } from "lucide-react";
import { formatPrice } from "@/lib/format";

interface ParsedQuery {
  intent?: string;
  region?: string;
  country?: string;
  budget_max?: number;
  currency?: string;
  boat_type?: string;
  guests?: number;
  date?: string;
  style?: string;
  keywords?: string[];
}

export function QueryInsight({ parsed }: { parsed: ParsedQuery }) {
  const tags: { icon: React.ReactNode; label: string }[] = [];

  if (parsed.intent) tags.push({ icon: <Target className="w-3.5 h-3.5" />, label: parsed.intent });
  if (parsed.country) tags.push({ icon: <MapPin className="w-3.5 h-3.5" />, label: parsed.country });
  if (parsed.region && !parsed.country) tags.push({ icon: <MapPin className="w-3.5 h-3.5" />, label: parsed.region });
  if (parsed.boat_type) tags.push({ icon: <Ship className="w-3.5 h-3.5" />, label: parsed.boat_type });
  if (parsed.guests) tags.push({ icon: <Users className="w-3.5 h-3.5" />, label: `${parsed.guests} guests` });
  if (parsed.date) tags.push({ icon: <Calendar className="w-3.5 h-3.5" />, label: parsed.date });
  if (parsed.budget_max) {
    const sym = parsed.currency === "USD" ? "$" : "€";
    tags.push({ icon: <Wallet className="w-3.5 h-3.5" />, label: `≤ ${sym}${formatPrice(parsed.budget_max)}` });
  }
  if (parsed.style) tags.push({ icon: <Gem className="w-3.5 h-3.5" />, label: parsed.style });

  if (tags.length === 0) return null;

  return (
    <div className="flex flex-wrap items-center gap-2 mb-6">
      <span className="text-xs text-gray-500 uppercase tracking-wider mr-1">AI detected:</span>
      {tags.map((tag, i) => (
        <span
          key={i}
          className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-gold/[0.06] border border-gold/10 text-xs text-gold-light"
        >
          {tag.icon}
          {tag.label}
        </span>
      ))}
    </div>
  );
}
