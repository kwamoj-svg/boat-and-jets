export interface Suggestion {
  text: string;
  category: "destination" | "type" | "popular";
  icon: "map" | "ship" | "sparkles";
}

const DESTINATIONS = [
  "Mallorca",
  "Ibiza",
  "Kroatien",
  "Griechenland",
  "Sardinien",
  "Korsika",
  "Türkei",
  "Dubrovnik",
  "Split",
  "Athen",
  "Barcelona",
  "Amalfi",
  "Montenegro",
  "Malta",
  "Nizza",
  "Amsterdam",
  "Hamburg",
];

const BOAT_TYPES = ["Motorboot", "Segelboot", "Katamaran", "Yacht"];

// Generate destination + boat type combos
const DESTINATION_COMBOS: Suggestion[] = DESTINATIONS.flatMap((dest) =>
  BOAT_TYPES.map((type) => ({
    text: `${type} ${dest}`,
    category: "destination" as const,
    icon: "map" as const,
  }))
);

const POPULAR_QUERIES: Suggestion[] = [
  { text: "Motorboot chartern Mallorca bis 300€", category: "popular", icon: "sparkles" },
  { text: "Segelboot Kroatien 4 Personen", category: "popular", icon: "sparkles" },
  { text: "Luxusyacht Ibiza mit Skipper", category: "popular", icon: "sparkles" },
  { text: "Katamaran Griechenland Familie", category: "popular", icon: "sparkles" },
  { text: "Boot mieten Sardinien günstig", category: "popular", icon: "sparkles" },
  { text: "Yacht chartern Türkei", category: "popular", icon: "sparkles" },
  { text: "Segelboot mieten Mallorca Woche", category: "popular", icon: "sparkles" },
  { text: "Motorboot Ibiza Party 20 Gäste", category: "popular", icon: "sparkles" },
  { text: "Katamaran mieten Mallorca unter 5000€", category: "popular", icon: "sparkles" },
  { text: "Yacht kaufen Mittelmeer", category: "popular", icon: "sparkles" },
  { text: "Gulet mieten Türkei 8 Personen", category: "popular", icon: "sparkles" },
  { text: "Familienboot Griechenland 6 Kabinen", category: "popular", icon: "sparkles" },
  { text: "Luxusyacht Dubai 12 Gäste", category: "popular", icon: "sparkles" },
  { text: "Segelboot chartern Kroatien 4 Personen", category: "popular", icon: "sparkles" },
  { text: "Motorboot mieten Split Tagesausflug", category: "popular", icon: "sparkles" },
  { text: "Katamaran Sardinien All-Inclusive", category: "popular", icon: "sparkles" },
  { text: "Yacht mieten Dubrovnik Wochenende", category: "popular", icon: "sparkles" },
  { text: "Segelboot Athen Inselhüpfen", category: "popular", icon: "sparkles" },
  { text: "Motorboot Barcelona Küstentour", category: "popular", icon: "sparkles" },
  { text: "Katamaran Montenegro günstig", category: "popular", icon: "sparkles" },
  { text: "Boot mieten Amalfi Tagestour", category: "popular", icon: "sparkles" },
  { text: "Yacht chartern Nizza Côte d'Azur", category: "popular", icon: "sparkles" },
  { text: "Hausboot Amsterdam 4 Personen", category: "popular", icon: "sparkles" },
  { text: "Motorboot Hamburg Hafenrundfahrt", category: "popular", icon: "sparkles" },
  { text: "Segelboot Malta Blaue Lagune", category: "popular", icon: "sparkles" },
  { text: "Katamaran Korsika 6 Personen", category: "popular", icon: "sparkles" },
];

// Boat type entries for type-category suggestions
const TYPE_SUGGESTIONS: Suggestion[] = BOAT_TYPES.map((type) => ({
  text: type,
  category: "type" as const,
  icon: "ship" as const,
}));

const ALL_SUGGESTIONS: Suggestion[] = [
  ...POPULAR_QUERIES,
  ...DESTINATION_COMBOS,
  ...TYPE_SUGGESTIONS,
];

/**
 * Compute Levenshtein distance between two strings.
 */
function levenshtein(a: string, b: string): number {
  const m = a.length;
  const n = b.length;
  if (m === 0) return n;
  if (n === 0) return m;

  const dp: number[][] = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));
  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      dp[i][j] =
        a[i - 1] === b[j - 1]
          ? dp[i - 1][j - 1]
          : 1 + Math.min(dp[i - 1][j - 1], dp[i - 1][j], dp[i][j - 1]);
    }
  }
  return dp[m][n];
}

/**
 * Check if a word fuzzy-matches any word in the text (max distance 2).
 */
function fuzzyMatch(queryWord: string, text: string): boolean {
  const textWords = text.toLowerCase().split(/\s+/);
  return textWords.some((tw) => {
    if (queryWord.length < 3 || tw.length < 3) return false;
    const maxDist = queryWord.length <= 4 ? 1 : 2;
    return levenshtein(queryWord, tw) <= maxDist;
  });
}

/**
 * Score a suggestion against a query. Higher score = better match.
 * Returns 0 if no match.
 */
function scoreSuggestion(query: string, suggestion: Suggestion): number {
  const q = query.toLowerCase().trim();
  const t = suggestion.text.toLowerCase();

  // Exact prefix match (the whole query matches start of suggestion)
  if (t.startsWith(q)) return 100;

  // Substring match
  if (t.includes(q)) return 80;

  // Word-by-word matching
  const queryWords = q.split(/\s+/).filter((w) => w.length >= 1);
  let prefixCount = 0;
  let substringCount = 0;
  let fuzzyCount = 0;

  for (const word of queryWords) {
    const textWords = t.split(/\s+/);
    if (textWords.some((tw) => tw.startsWith(word))) {
      prefixCount++;
    } else if (t.includes(word)) {
      substringCount++;
    } else if (word.length >= 3 && fuzzyMatch(word, t)) {
      fuzzyCount++;
    }
  }

  const totalMatched = prefixCount + substringCount + fuzzyCount;
  if (totalMatched === 0) return 0;

  // Score based on match quality and coverage
  const coverage = totalMatched / queryWords.length;
  if (coverage < 0.5) return 0; // require at least half the words to match

  const score =
    prefixCount * 30 + substringCount * 20 + fuzzyCount * 10 + coverage * 20;

  // Boost popular queries
  if (suggestion.category === "popular") return score + 5;

  return score;
}

/**
 * Get up to 6 matching suggestions for a query string.
 */
export function getSuggestions(query: string): Suggestion[] {
  const trimmed = query.trim();
  if (trimmed.length < 1) return [];

  const scored = ALL_SUGGESTIONS
    .map((s) => ({ suggestion: s, score: scoreSuggestion(trimmed, s) }))
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score);

  // Deduplicate by text
  const seen = new Set<string>();
  const results: Suggestion[] = [];
  for (const { suggestion } of scored) {
    if (seen.has(suggestion.text)) continue;
    seen.add(suggestion.text);
    results.push(suggestion);
    if (results.length >= 6) break;
  }

  return results;
}
