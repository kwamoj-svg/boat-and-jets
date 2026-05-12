"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  MapPin, Ship, Sailboat, Anchor, Gem, Zap, Users, Euro,
  ArrowRight, X, CalendarDays, ChevronDown, Minus, Plus,
} from "lucide-react";
import type { ReactNode } from "react";

/* ── Destinations grouped by region (names must match GlobeCanvas) ── */
const DEST_REGIONS = [
  {
    region: "Mittelmeer",
    destinations: [
      { name: "Mallorca", flag: "🇪🇸" },
      { name: "Ibiza", flag: "🇪🇸" },
      { name: "Côte d'Azur", flag: "🇫🇷" },
      { name: "Corsica", flag: "🇫🇷" },
      { name: "Monaco", flag: "🇲🇨" },
      { name: "Sardinia", flag: "🇮🇹" },
      { name: "Amalfi", flag: "🇮🇹" },
      { name: "Sicily", flag: "🇮🇹" },
      { name: "Croatia", flag: "🇭🇷" },
      { name: "Montenegro", flag: "🇲🇪" },
      { name: "Greek Islands", flag: "🇬🇷" },
      { name: "Turkey", flag: "🇹🇷" },
    ],
  },
  {
    region: "Karibik & Amerika",
    destinations: [
      { name: "Caribbean", flag: "🏝️" },
      { name: "BVI", flag: "🇻🇬" },
      { name: "St. Barths", flag: "🇧🇱" },
      { name: "Antigua", flag: "🇦🇬" },
      { name: "Bahamas", flag: "🇧🇸" },
      { name: "Miami", flag: "🇺🇸" },
      { name: "Cancún", flag: "🇲🇽" },
    ],
  },
  {
    region: "Orient & Indischer Ozean",
    destinations: [
      { name: "Dubai", flag: "🇦🇪" },
      { name: "Oman", flag: "🇴🇲" },
      { name: "Maldives", flag: "🇲🇻" },
      { name: "Seychelles", flag: "🇸🇨" },
    ],
  },
  {
    region: "Asien & Ozeanien",
    destinations: [
      { name: "Thailand", flag: "🇹🇭" },
      { name: "Bali", flag: "🇮🇩" },
      { name: "Sydney", flag: "🇦🇺" },
      { name: "Whitsundays", flag: "🇦🇺" },
    ],
  },
  {
    region: "Nordeuropa",
    destinations: [
      { name: "Skandinavien", flag: "🇸🇪" },
      { name: "Ostsee", flag: "🇩🇪" },
      { name: "Hamburg", flag: "🇩🇪" },
    ],
  },
];

export type DestinationName = string;

/* ── Boat types ── */
const BOAT_TYPES: { label: string; value: string; icon: ReactNode }[] = [
  { label: "Segelboot", value: "sailing", icon: <Sailboat className="w-4 h-4" /> },
  { label: "Motorboot", value: "motor", icon: <Zap className="w-4 h-4" /> },
  { label: "Katamaran", value: "catamaran", icon: <Ship className="w-4 h-4" /> },
  { label: "Superyacht", value: "superyacht", icon: <Gem className="w-4 h-4" /> },
  { label: "Gulet", value: "gulet", icon: <Anchor className="w-4 h-4" /> },
];

interface FilterBarProps {
  onDestinationHover?: (dest: DestinationName | null) => void;
  onDestinationSelect?: (dest: DestinationName | null) => void;
}

/* ── Small dropdown wrapper (for boat type) ── */
function Dropdown({ label, icon, value, children, isOpen, onToggle }: {
  label: string; icon: ReactNode; value?: string; children: ReactNode;
  isOpen: boolean; onToggle: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node) && isOpen) onToggle();
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [isOpen, onToggle]);

  return (
    <div ref={ref} className="relative">
      <button
        onClick={onToggle}
        className={`
          flex items-center gap-2 px-4 py-3 rounded-xl text-sm
          transition-all duration-200 whitespace-nowrap
          ${isOpen
            ? "bg-gold/15 border-gold/40 text-gold"
            : value
              ? "bg-gold/10 border-gold/25 text-gold-light"
              : "bg-white/[0.04] border-white/[0.08] text-gray-400 hover:bg-white/[0.06] hover:text-gray-300"
          }
          border
        `}
      >
        <span className={isOpen ? "text-gold" : value ? "text-gold/70" : "text-gray-500"}>
          {icon}
        </span>
        {value || label}
        <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`} />
      </button>
      {isOpen && (
        <div className="absolute top-full left-0 mt-2 z-50 min-w-[220px] rounded-2xl bg-[#131d2e] border border-white/[0.08] shadow-2xl overflow-hidden animate-fade-in">
          {children}
        </div>
      )}
    </div>
  );
}

export function FilterBar({ onDestinationHover, onDestinationSelect }: FilterBarProps) {
  const router = useRouter();
  const [selectedDest, setSelectedDest] = useState<DestinationName | null>(null);
  const [selectedType, setSelectedType] = useState<string | null>(null);
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [guests, setGuests] = useState(2);
  const [budget, setBudget] = useState("");
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);
  const [showDests, setShowDests] = useState(false);
  const destRef = useRef<HTMLDivElement>(null);

  const hasFilters = selectedDest || selectedType || dateFrom || dateTo || budget || guests !== 2;

  // Close dest panel on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (destRef.current && !destRef.current.contains(e.target as Node) && showDests) setShowDests(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [showDests]);

  const toggleDD = useCallback((name: string) => {
    setOpenDropdown((prev) => (prev === name ? null : name));
    if (name !== "dest") setShowDests(false);
  }, []);

  const handleDestSelect = useCallback(
    (dest: DestinationName) => {
      const next = selectedDest === dest ? null : dest;
      setSelectedDest(next);
      onDestinationSelect?.(next);
      if (next) setShowDests(false);
    },
    [selectedDest, onDestinationSelect]
  );

  const clearAll = useCallback(() => {
    setSelectedDest(null);
    setSelectedType(null);
    setDateFrom("");
    setDateTo("");
    setGuests(2);
    setBudget("");
    onDestinationSelect?.(null);
  }, [onDestinationSelect]);

  const handleSearch = useCallback(() => {
    const parts: string[] = [];
    if (selectedType) {
      const bt = BOAT_TYPES.find((t) => t.value === selectedType);
      parts.push(bt?.label || selectedType);
    } else {
      parts.push("Boot");
    }
    if (selectedDest) parts.push(selectedDest);
    if (guests !== 2) parts.push(`${guests} Personen`);
    if (budget) parts.push(`max ${budget}€ pro Tag`);
    if (dateFrom) parts.push(dateFrom);
    if (parts.length <= 1 && !selectedDest) return;
    router.push(`/search?q=${encodeURIComponent(parts.join(" "))}`);
  }, [selectedDest, selectedType, dateFrom, guests, budget, router]);

  const today = new Date().toISOString().split("T")[0];

  return (
    <div className="w-full max-w-5xl mx-auto" ref={destRef}>
      {/* Main filter row */}
      <div className="flex flex-wrap items-center justify-center gap-2">
        {/* Destination toggle */}
        <button
          onClick={() => { setShowDests(!showDests); setOpenDropdown(null); }}
          className={`
            flex items-center gap-2 px-4 py-3 rounded-xl text-sm
            transition-all duration-200 whitespace-nowrap border
            ${showDests
              ? "bg-gold/15 border-gold/40 text-gold"
              : selectedDest
                ? "bg-gold/10 border-gold/25 text-gold-light"
                : "bg-white/[0.04] border-white/[0.08] text-gray-400 hover:bg-white/[0.06] hover:text-gray-300"
            }
          `}
        >
          <MapPin className={`w-4 h-4 ${showDests ? "text-gold" : selectedDest ? "text-gold/70" : "text-gray-500"}`} />
          {selectedDest || "Ziel wählen"}
          <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${showDests ? "rotate-180" : ""}`} />
        </button>

        {/* Boat type */}
        <Dropdown
          label="Bootstyp"
          icon={<Ship className="w-4 h-4" />}
          value={selectedType ? BOAT_TYPES.find((t) => t.value === selectedType)?.label : undefined}
          isOpen={openDropdown === "type"}
          onToggle={() => toggleDD("type")}
        >
          <div className="p-2">
            {BOAT_TYPES.map((t) => {
              const active = selectedType === t.value;
              return (
                <button
                  key={t.value}
                  onClick={() => { setSelectedType(active ? null : t.value); setOpenDropdown(null); }}
                  className={`
                    w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm
                    transition-all duration-150
                    ${active ? "bg-gold/20 text-gold" : "text-gray-300 hover:bg-white/[0.05] hover:text-white"}
                  `}
                >
                  <span className={active ? "text-gold" : "text-gray-500"}>{t.icon}</span>
                  {t.label}
                  {active && <span className="ml-auto text-gold">✓</span>}
                </button>
              );
            })}
          </div>
        </Dropdown>

        {/* Date inputs */}
        <div className="flex items-center gap-1 bg-white/[0.04] border border-white/[0.08] rounded-xl px-3 py-1.5 hover:border-white/[0.12] transition-colors">
          <CalendarDays className="w-4 h-4 text-gray-500 mr-1" />
          <input
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            min={today}
            className="bg-transparent text-sm text-gray-300 outline-none w-[120px] [&::-webkit-calendar-picker-indicator]:invert [&::-webkit-calendar-picker-indicator]:opacity-40"
          />
          <span className="text-gray-600 mx-1">—</span>
          <input
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            min={dateFrom || today}
            className="bg-transparent text-sm text-gray-300 outline-none w-[120px] [&::-webkit-calendar-picker-indicator]:invert [&::-webkit-calendar-picker-indicator]:opacity-40"
          />
        </div>

        {/* Guest counter */}
        <div className="flex items-center gap-2 bg-white/[0.04] border border-white/[0.08] rounded-xl px-3 py-2 hover:border-white/[0.12] transition-colors">
          <Users className="w-4 h-4 text-gray-500" />
          <button
            onClick={() => setGuests(Math.max(1, guests - 1))}
            className="w-6 h-6 rounded-full bg-white/[0.06] flex items-center justify-center text-gray-400 hover:bg-white/[0.12] hover:text-white transition-colors"
          >
            <Minus className="w-3 h-3" />
          </button>
          <span className="text-sm text-gray-200 min-w-[16px] text-center tabular-nums">{guests}</span>
          <button
            onClick={() => setGuests(Math.min(30, guests + 1))}
            className="w-6 h-6 rounded-full bg-white/[0.06] flex items-center justify-center text-gray-400 hover:bg-white/[0.12] hover:text-white transition-colors"
          >
            <Plus className="w-3 h-3" />
          </button>
          <span className="text-xs text-gray-500">Gäste</span>
        </div>

        {/* Budget input */}
        <div className="flex items-center gap-1.5 bg-white/[0.04] border border-white/[0.08] rounded-xl px-3 py-2 hover:border-white/[0.12] transition-colors">
          <Euro className="w-4 h-4 text-gray-500" />
          <input
            type="number"
            value={budget}
            onChange={(e) => setBudget(e.target.value)}
            placeholder="Budget"
            min={0}
            step={100}
            className="bg-transparent text-sm text-gray-300 outline-none w-[70px] placeholder:text-gray-500 [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none"
          />
          <span className="text-xs text-gray-500">/Tag</span>
        </div>

        {/* Search button */}
        <button
          onClick={handleSearch}
          disabled={!hasFilters}
          className="
            flex items-center gap-2 px-6 py-3 rounded-xl
            gold-gradient text-navy font-semibold text-sm
            disabled:opacity-30 disabled:cursor-not-allowed
            hover:shadow-[0_0_20px_rgba(200,165,90,0.3)]
            active:scale-95 transition-all duration-200
          "
        >
          Suchen
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>

      {/* ── Destination region grid (full width, no scroll) ── */}
      {showDests && (
        <div className="mt-4 rounded-2xl bg-[#111b2b]/90 border border-white/[0.06] p-5 animate-fade-in backdrop-blur-sm">
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
            {DEST_REGIONS.map((group) => (
              <div key={group.region}>
                <h4 className="text-[11px] uppercase tracking-wider text-gray-500 mb-2 font-medium">
                  {group.region}
                </h4>
                <div className="flex flex-col gap-0.5">
                  {group.destinations.map((d) => {
                    const active = selectedDest === d.name;
                    return (
                      <button
                        key={d.name}
                        onClick={() => handleDestSelect(d.name)}
                        onMouseEnter={() => onDestinationHover?.(d.name)}
                        onMouseLeave={() => onDestinationHover?.(null)}
                        className={`
                          flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-sm text-left
                          transition-all duration-150
                          ${active
                            ? "bg-gold/20 text-gold"
                            : "text-gray-300 hover:bg-white/[0.05] hover:text-white"
                          }
                        `}
                      >
                        <span className="text-sm leading-none">{d.flag}</span>
                        <span className={active ? "font-medium" : ""}>{d.name}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Active filter tags */}
      {hasFilters && (
        <div className="flex flex-wrap items-center justify-center gap-2 mt-3 animate-fade-in">
          {selectedDest && (
            <Tag onRemove={() => { setSelectedDest(null); onDestinationSelect?.(null); }}>
              <MapPin className="w-3 h-3" /> {selectedDest}
            </Tag>
          )}
          {selectedType && (
            <Tag onRemove={() => setSelectedType(null)}>
              {BOAT_TYPES.find((t) => t.value === selectedType)?.label}
            </Tag>
          )}
          {dateFrom && (
            <Tag onRemove={() => setDateFrom("")}>
              <CalendarDays className="w-3 h-3" /> {dateFrom}
            </Tag>
          )}
          {dateTo && (
            <Tag onRemove={() => setDateTo("")}>
              bis {dateTo}
            </Tag>
          )}
          {guests !== 2 && (
            <Tag onRemove={() => setGuests(2)}>
              <Users className="w-3 h-3" /> {guests} Gäste
            </Tag>
          )}
          {budget && (
            <Tag onRemove={() => setBudget("")}>
              <Euro className="w-3 h-3" /> {budget}€/Tag
            </Tag>
          )}
          <button onClick={clearAll} className="text-xs text-gray-500 hover:text-gray-300 underline ml-1 transition-colors">
            Alle löschen
          </button>
        </div>
      )}
    </div>
  );
}

function Tag({ children, onRemove }: { children: ReactNode; onRemove: () => void }) {
  return (
    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs bg-gold/10 text-gold border border-gold/25">
      {children}
      <button onClick={onRemove} className="ml-0.5 hover:text-white transition-colors">
        <X className="w-3 h-3" />
      </button>
    </span>
  );
}
