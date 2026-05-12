import type { ExtractedListing } from "./claude-ai";

export interface ExperienceTag {
  slug: string;
  label_en: string;
  label_de: string;
  keywords: string[];
  boat_type_affinity: string[];
  luxury_min: number;
  luxury_max: number;
  guest_min?: number;
  guest_max?: number;
  features_required?: string[];
}

// Local experience definitions for fast matching (mirrors DB seed data)
const EXPERIENCES: ExperienceTag[] = [
  { slug: "romantic-sunset", label_en: "Romantic Sunset Cruise", label_de: "Romantischer Sonnenuntergang", keywords: ["romantic", "sunset", "couple", "honeymoon", "anniversary", "love", "zweisamkeit", "romantisch", "sonnenuntergang", "paar"], boat_type_affinity: ["sailing", "catamaran"], luxury_min: 3, luxury_max: 5, guest_max: 4 },
  { slug: "family-adventure", label_en: "Family Adventure", label_de: "Familienabenteuer", keywords: ["family", "kids", "children", "familie", "kinder", "safe", "adventure", "abenteuer", "familienurlaub"], boat_type_affinity: ["catamaran", "motor", "sailing"], luxury_min: 2, luxury_max: 4, guest_min: 4 },
  { slug: "party-boat", label_en: "Party Boat", label_de: "Partyboot", keywords: ["party", "celebration", "birthday", "jga", "bachelor", "bachelorette", "music", "dj", "feier", "geburtstag"], boat_type_affinity: ["motor", "catamaran"], luxury_min: 2, luxury_max: 5, guest_min: 8 },
  { slug: "fishing-trip", label_en: "Fishing Trip", label_de: "Angelausflug", keywords: ["fishing", "angeln", "deep sea", "sport fishing", "trolling", "angel", "fischen"], boat_type_affinity: ["motor", "speedboat"], luxury_min: 1, luxury_max: 3 },
  { slug: "diving-expedition", label_en: "Diving Expedition", label_de: "Tauchexpedition", keywords: ["diving", "tauchen", "snorkeling", "schnorcheln", "reef", "coral", "underwater", "unterwasser"], boat_type_affinity: ["motor", "catamaran"], luxury_min: 2, luxury_max: 4 },
  { slug: "luxury-escape", label_en: "Luxury Escape", label_de: "Luxus-Auszeit", keywords: ["luxury", "luxus", "premium", "exclusive", "vip", "5-star", "champagne", "exklusiv", "erstklassig"], boat_type_affinity: ["superyacht", "catamaran", "motor"], luxury_min: 4, luxury_max: 5 },
  { slug: "island-hopping", label_en: "Island Hopping", label_de: "Insel-Hopping", keywords: ["island", "insel", "hopping", "cruise", "tour", "multi-stop", "exploring", "inseln", "inselhopping"], boat_type_affinity: ["sailing", "catamaran"], luxury_min: 2, luxury_max: 5 },
  { slug: "weekend-getaway", label_en: "Weekend Getaway", label_de: "Wochenendausflug", keywords: ["weekend", "wochenende", "short", "kurz", "2 tage", "3 tage", "mini-urlaub", "kurztrip"], boat_type_affinity: ["motor", "sailing", "catamaran"], luxury_min: 2, luxury_max: 4 },
  { slug: "corporate-event", label_en: "Corporate Event", label_de: "Firmenevent", keywords: ["corporate", "firma", "business", "team", "event", "meeting", "incentive", "teambuilding", "firmenfeier"], boat_type_affinity: ["motor", "catamaran", "superyacht"], luxury_min: 3, luxury_max: 5, guest_min: 10 },
  { slug: "sailing-lesson", label_en: "Sailing Lesson", label_de: "Segelkurs", keywords: ["sailing", "lesson", "kurs", "lernen", "learn", "training", "anfaenger", "beginner", "skipper", "segelschein", "segelkurs"], boat_type_affinity: ["sailing"], luxury_min: 1, luxury_max: 3 },
  { slug: "watersports", label_en: "Watersports Adventure", label_de: "Wassersport", keywords: ["watersport", "wassersport", "jetski", "wakeboard", "waterski", "tube", "paddle", "sup", "kayak", "jet"], boat_type_affinity: ["motor", "speedboat"], luxury_min: 2, luxury_max: 4 },
  { slug: "sunset-dinner", label_en: "Sunset Dinner Cruise", label_de: "Dinner bei Sonnenuntergang", keywords: ["dinner", "abendessen", "sunset", "sonnenuntergang", "food", "essen", "gourmet", "chef", "kulinarisch"], boat_type_affinity: ["motor", "catamaran", "sailing"], luxury_min: 3, luxury_max: 5 },
  { slug: "day-trip", label_en: "Day Trip", label_de: "Tagesausflug", keywords: ["day", "tag", "trip", "ausflug", "afternoon", "nachmittag", "tagesausflug", "halbtag"], boat_type_affinity: ["motor", "speedboat", "sailing"], luxury_min: 1, luxury_max: 4 },
];

/**
 * Detect experience type from user query text.
 * Returns the best matching experience or null.
 */
export function detectExperience(query: string): ExperienceTag | null {
  const lower = query.toLowerCase();
  let bestMatch: ExperienceTag | null = null;
  let bestScore = 0;

  for (const exp of EXPERIENCES) {
    let score = 0;
    for (const keyword of exp.keywords) {
      if (lower.includes(keyword)) {
        score += keyword.length; // Longer keyword matches = higher confidence
      }
    }
    if (score > bestScore && score >= 4) { // Minimum threshold
      bestScore = score;
      bestMatch = exp;
    }
  }

  return bestMatch;
}

/**
 * Apply experience-based scoring adjustments to listings.
 * Boosts boats that match the detected experience profile.
 */
export function applyExperienceFilters(
  listings: ExtractedListing[],
  experience: ExperienceTag
): ExtractedListing[] {
  for (const l of listings) {
    let boost = 0;

    // Boat type affinity
    if (l.type && experience.boat_type_affinity.includes(l.type.toLowerCase())) {
      boost += 0.1;
    }

    // Luxury level match
    if (l.luxury_level >= experience.luxury_min && l.luxury_level <= experience.luxury_max) {
      boost += 0.05;
    }

    // Guest capacity match
    if (experience.guest_min && l.guests && l.guests >= experience.guest_min) {
      boost += 0.05;
    }
    if (experience.guest_max && l.guests && l.guests <= experience.guest_max) {
      boost += 0.03;
    }

    // Feature match
    if (experience.features_required && l.features) {
      const featureLower = l.features.map(f => f.toLowerCase());
      const matchCount = experience.features_required.filter(f =>
        featureLower.some(fl => fl.includes(f))
      ).length;
      boost += matchCount * 0.05;
    }

    // Description keyword match
    const desc = `${l.description || ""} ${l.ai_summary || ""}`.toLowerCase();
    const keywordHits = experience.keywords.filter(k => desc.includes(k)).length;
    boost += Math.min(keywordHits * 0.03, 0.15);

    // Apply boost
    if (boost > 0) {
      l.match_score = Math.min(1.0, (l.match_score || 0.5) + boost);
    }

    // Penalize boats that clearly don't fit
    if (l.type && experience.boat_type_affinity.length > 0 &&
        !experience.boat_type_affinity.includes(l.type.toLowerCase())) {
      l.match_score = Math.min(l.match_score, 0.5);
    }
  }

  return listings;
}

/**
 * Get experience chips for the homepage.
 */
export function getExperienceChips(): { slug: string; label: string; query: string }[] {
  return [
    { slug: "romantic-sunset", label: "Romantischer Sonnenuntergang", query: "romantic sunset cruise" },
    { slug: "family-adventure", label: "Familienabenteuer", query: "family boat adventure kids" },
    { slug: "party-boat", label: "Partyboot", query: "party boat 20 guests music" },
    { slug: "island-hopping", label: "Insel-Hopping", query: "island hopping sailing" },
    { slug: "luxury-escape", label: "Luxus-Auszeit", query: "luxury yacht exclusive VIP" },
    { slug: "diving-expedition", label: "Tauchexpedition", query: "diving snorkeling boat" },
    { slug: "sunset-dinner", label: "Dinner-Cruise", query: "sunset dinner cruise gourmet" },
    { slug: "watersports", label: "Wassersport", query: "watersports jetski wakeboard" },
  ];
}
