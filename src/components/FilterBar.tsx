"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  MapPin, Ship, Sailboat, Anchor, Gem, Zap, Users, Euro,
  ArrowRight, X, ChevronDown,
} from "lucide-react";
import type { ReactNode } from "react";

/* ── Destination data (must match GlobeAnimation destinations) ── */
export const DESTINATIONS = [
  { name: "Monaco", region: "Mittelmeer" },
  { name: "Sardinia", region: "Mittelmeer" },
  { name: "Ibiza", region: "Mittelmeer" },
  { name: "Greek Islands", region: "Mittelmeer" },
  { name: "Croatia", region: "Mittelmeer" },
  { name: "Amalfi", region: "Mittelmeer" },
  { name: "Caribbean", region: "Karibik" },
  { name: "Miami", region: "Amerika" },
  { name: "Bahamas", region: "Karibik" },
  { name: "Dubai", region: "Naher Osten" },
  { name: "Maldives", region: "Indischer Ozean" },
  { name: "Seychelles", region: "Indischer Ozean" },
  { name: "Thailand", region: "Asien" },
  { name: "Sydney", region: "Ozeanien" },
] as const;

export type DestinationName = (typeof DESTINATIONS)[number]["name"];

/* ── Boat types ── */
const BOAT_TYPES: { label: string; value: string; icon: ReactNode }[] = [
  { label: "Segelboot", value: "sailing", icon: <Sailboat className="w-3.5 h-3.5" /> },
  { label: "Motorboot", value: "motor", icon: <Zap className="w-3.5 h-3.5" /> },
  { label: "Katamaran", value: "catamaran", icon: <Ship className="w-3.5 h-3.5" /> },
  { label: "Superyacht", value: "superyacht", icon: <Gem className="w-3.5 h-3.5" /> },
  { label: "Gulet", value: "gulet", icon: <Anchor className="w-3.5 h-3.5" /> },
];

/* ── Budget ranges ── */
const BUDGETS = [
  { label: "< 500/Tag", value: "500", query: "unter 500 euro pro tag" },
  { label: "500-1.000", value: "1000", query: "500 bis 1000 euro pro tag" },
  { label: "1.000-3.000", value: "3000", query: "1000 bis 3000 euro pro tag" },
  { label: "3.000+", value: "3000+", query: "ab 3000 euro pro tag luxury" },
];

/* ── Guest counts ── */
const GUESTS = [
  { label: "1-4", value: "4" },
  { label: "5-8", value: "8" },
  { label: "9-12", value: "12" },
  { label: "12+", value: "20" },
];

interface FilterBarProps {
  onDestinationHover?: (dest: DestinationName | null) => void;
  onDestinationSelect?: (dest: DestinationName | null) => void;
}

export function FilterBar({ onDestinationHover, onDestinationSelect }: FilterBarProps) {
  const router = useRouter();
  const [selectedDest, setSelectedDest] = useState<DestinationName | null>(null);
  const [selectedType, setSelectedType] = useState<string | null>(null);
  const [selectedBudget, setSelectedBudget] = useState<string | null>(null);
  const [selectedGuests, setSelectedGuests] = useState<string | null>(null);
  const [expandedSection, setExpandedSection] = useState<string | null>("destination");

  const hasFilters = selectedDest || selectedType || selectedBudget || selectedGuests;

  const toggleSection = useCallback((section: string) => {
    setExpandedSection((prev) => (prev === section ? null : section));
  }, []);

  const handleDestSelect = useCallback(
    (dest: DestinationName) => {
      const next = selectedDest === dest ? null : dest;
      setSelectedDest(next);
      onDestinationSelect?.(next);
    },
    [selectedDest, onDestinationSelect]
  );

  const clearAll = useCallback(() => {
    setSelectedDest(null);
    setSelectedType(null);
    setSelectedBudget(null);
    setSelectedGuests(null);
    onDestinationSelect?.(null);
  }, [onDestinationSelect]);

  const handleSearch = useCallback(() => {
    const parts: string[] = [];
    if (selectedType) {
      const bt = BOAT_TYPES.find((t) => t.value === selectedType);
      parts.push(bt?.label || selectedType);
    }
    if (selectedDest) parts.push(selectedDest);
    if (selectedGuests) parts.push(`${selectedGuests} Gäste`);
    if (selectedBudget) {
      const b = BUDGETS.find((b) => b.value === selectedBudget);
      if (b) parts.push(b.query);
    }
    if (parts.length === 0) return;
    router.push(`/search?q=${encodeURIComponent(parts.join(" "))}`);
  }, [selectedDest, selectedType, selectedBudget, selectedGuests, router]);

  return (
    <div className="w-full max-w-4xl mx-auto mt-6">
      {/* Filter section headers */}
      <div className="flex flex-wrap justify-center gap-2 mb-4">
        {[
          { key: "destination", label: "Ziel", icon: <MapPin className="w-3.5 h-3.5" /> },
          { key: "type", label: "Bootstyp", icon: <Ship className="w-3.5 h-3.5" /> },
          { key: "budget", label: "Budget", icon: <Euro className="w-3.5 h-3.5" /> },
          { key: "guests", label: "Gäste", icon: <Users className="w-3.5 h-3.5" /> },
        ].map((sec) => {
          const isActive = expandedSection === sec.key;
          const hasValue =
            (sec.key === "destination" && selectedDest) ||
            (sec.key === "type" && selectedType) ||
            (sec.key === "budget" && selectedBudget) ||
            (sec.key === "guests" && selectedGuests);
          return (
            <button
              key={sec.key}
              onClick={() => toggleSection(sec.key)}
              className={`
                flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-medium
                transition-all duration-200
                ${isActive
                  ? "bg-gold/20 border-gold/40 text-gold"
                  : hasValue
                    ? "bg-gold/10 border-gold/25 text-gold-light"
                    : "bg-white/[0.04] border-white/[0.08] text-gray-400 hover:bg-white/[0.06] hover:text-gray-300"
                }
                border
              `}
            >
              <span className={isActive ? "text-gold" : hasValue ? "text-gold/70" : "text-gray-500"}>
                {sec.icon}
              </span>
              {sec.label}
              {hasValue && !isActive && (
                <span className="w-1.5 h-1.5 rounded-full bg-gold ml-1" />
              )}
              <ChevronDown
                className={`w-3 h-3 transition-transform duration-200 ${isActive ? "rotate-180" : ""}`}
              />
            </button>
          );
        })}
      </div>

      {/* Expanded filter content */}
      <div className="overflow-hidden transition-all duration-300">
        {/* ── Destinations ── */}
        {expandedSection === "destination" && (
          <div className="animate-fade-in">
            <div className="flex flex-wrap justify-center gap-2 px-2">
              {DESTINATIONS.map((d) => {
                const active = selectedDest === d.name;
                return (
                  <button
                    key={d.name}
                    onClick={() => handleDestSelect(d.name)}
                    onMouseEnter={() => onDestinationHover?.(d.name)}
                    onMouseLeave={() => onDestinationHover?.(null)}
                    className={`
                      px-3.5 py-1.5 rounded-full text-sm
                      transition-all duration-200
                      ${active
                        ? "bg-gold/25 border-gold/50 text-gold shadow-[0_0_12px_rgba(200,165,90,0.15)]"
                        : "bg-white/[0.03] border-white/[0.06] text-gray-400 hover:bg-white/[0.06] hover:border-gold/20 hover:text-gray-200"
                      }
                      border
                    `}
                  >
                    <span className="flex items-center gap-1.5">
                      <MapPin className={`w-3 h-3 ${active ? "text-gold" : "text-gray-600"}`} />
                      {d.name}
                      <span className={`text-[10px] ${active ? "text-gold/60" : "text-gray-600"}`}>
                        {d.region}
                      </span>
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* ── Boat Type ── */}
        {expandedSection === "type" && (
          <div className="animate-fade-in">
            <div className="flex flex-wrap justify-center gap-2 px-2">
              {BOAT_TYPES.map((t) => {
                const active = selectedType === t.value;
                return (
                  <button
                    key={t.value}
                    onClick={() => setSelectedType(active ? null : t.value)}
                    className={`
                      px-4 py-2 rounded-full text-sm
                      transition-all duration-200 flex items-center gap-2
                      ${active
                        ? "bg-gold/25 border-gold/50 text-gold shadow-[0_0_12px_rgba(200,165,90,0.15)]"
                        : "bg-white/[0.03] border-white/[0.06] text-gray-400 hover:bg-white/[0.06] hover:border-gold/20 hover:text-gray-200"
                      }
                      border
                    `}
                  >
                    <span className={active ? "text-gold" : "text-gray-500"}>{t.icon}</span>
                    {t.label}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* ── Budget ── */}
        {expandedSection === "budget" && (
          <div className="animate-fade-in">
            <div className="flex flex-wrap justify-center gap-2 px-2">
              {BUDGETS.map((b) => {
                const active = selectedBudget === b.value;
                return (
                  <button
                    key={b.value}
                    onClick={() => setSelectedBudget(active ? null : b.value)}
                    className={`
                      px-4 py-2 rounded-full text-sm
                      transition-all duration-200 flex items-center gap-2
                      ${active
                        ? "bg-gold/25 border-gold/50 text-gold shadow-[0_0_12px_rgba(200,165,90,0.15)]"
                        : "bg-white/[0.03] border-white/[0.06] text-gray-400 hover:bg-white/[0.06] hover:border-gold/20 hover:text-gray-200"
                      }
                      border
                    `}
                  >
                    <Euro className={`w-3 h-3 ${active ? "text-gold" : "text-gray-500"}`} />
                    {b.label}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* ── Guests ── */}
        {expandedSection === "guests" && (
          <div className="animate-fade-in">
            <div className="flex flex-wrap justify-center gap-2 px-2">
              {GUESTS.map((g) => {
                const active = selectedGuests === g.value;
                return (
                  <button
                    key={g.value}
                    onClick={() => setSelectedGuests(active ? null : g.value)}
                    className={`
                      px-4 py-2 rounded-full text-sm
                      transition-all duration-200 flex items-center gap-2
                      ${active
                        ? "bg-gold/25 border-gold/50 text-gold shadow-[0_0_12px_rgba(200,165,90,0.15)]"
                        : "bg-white/[0.03] border-white/[0.06] text-gray-400 hover:bg-white/[0.06] hover:border-gold/20 hover:text-gray-200"
                      }
                      border
                    `}
                  >
                    <Users className={`w-3 h-3 ${active ? "text-gold" : "text-gray-500"}`} />
                    {g.label} Gäste
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Active filters + Search button */}
      {hasFilters && (
        <div className="flex flex-wrap items-center justify-center gap-2 mt-4 animate-fade-in">
          {selectedDest && (
            <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs bg-gold/15 text-gold border border-gold/30">
              <MapPin className="w-3 h-3" />
              {selectedDest}
              <button onClick={() => { setSelectedDest(null); onDestinationSelect?.(null); }} className="ml-1 hover:text-white">
                <X className="w-3 h-3" />
              </button>
            </span>
          )}
          {selectedType && (
            <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs bg-gold/15 text-gold border border-gold/30">
              {BOAT_TYPES.find((t) => t.value === selectedType)?.label}
              <button onClick={() => setSelectedType(null)} className="ml-1 hover:text-white">
                <X className="w-3 h-3" />
              </button>
            </span>
          )}
          {selectedBudget && (
            <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs bg-gold/15 text-gold border border-gold/30">
              <Euro className="w-3 h-3" />
              {BUDGETS.find((b) => b.value === selectedBudget)?.label}
              <button onClick={() => setSelectedBudget(null)} className="ml-1 hover:text-white">
                <X className="w-3 h-3" />
              </button>
            </span>
          )}
          {selectedGuests && (
            <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs bg-gold/15 text-gold border border-gold/30">
              <Users className="w-3 h-3" />
              {selectedGuests} Gäste
              <button onClick={() => setSelectedGuests(null)} className="ml-1 hover:text-white">
                <X className="w-3 h-3" />
              </button>
            </span>
          )}
          <button onClick={clearAll} className="text-xs text-gray-500 hover:text-gray-300 underline ml-1">
            Alle löschen
          </button>
          <button
            onClick={handleSearch}
            className="ml-2 flex items-center gap-2 px-5 py-2 rounded-full gold-gradient text-navy font-medium text-sm hover:shadow-[0_0_20px_rgba(200,165,90,0.3)] active:scale-95 transition-all duration-200"
          >
            Suchen
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );
}
