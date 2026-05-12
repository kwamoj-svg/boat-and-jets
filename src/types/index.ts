export type BoatType = "sailing" | "motor" | "catamaran" | "superyacht" | "speedboat" | "gulet";
export type ListingType = "charter" | "sale";
export type LuxuryLevel = 1 | 2 | 3 | 4 | 5;

export interface Boat {
  id: string;
  name: string;
  type: BoatType;
  brand: string;
  model: string;
  year: number;
  length_ft: number;
  cabins: number;
  guests: number;
  crew: number;
  images: string[];
  features: string[];
  description: string;
}

export interface Listing {
  id: string;
  boat_id: string;
  boat: Boat;
  listing_type: ListingType;
  price_per_week?: number;
  price_per_day?: number;
  sale_price?: number;
  currency: string;
  region: string;
  country: string;
  port: string;
  available_from?: string;
  available_to?: string;
  provider: string;
  provider_url: string;
  luxury_level: LuxuryLevel;
  is_featured: boolean;
  is_sponsored: boolean;
  created_at: string;
  updated_at: string;
}

export interface SearchQuery {
  raw_query: string;
  parsed: ParsedQuery;
}

export interface ParsedQuery {
  intent: "charter" | "buy" | "explore";
  region?: string;
  country?: string;
  budget_min?: number;
  budget_max?: number;
  currency: string;
  boat_type?: BoatType;
  guests?: number;
  style?: string;
  luxury_level?: LuxuryLevel;
  dates?: { from: string; to: string };
  keywords: string[];
}

export interface Recommendation {
  listing: Listing;
  score: number;
  match_reasons: MatchReason[];
  ai_summary: string;
}

export interface MatchReason {
  category: "region" | "budget" | "style" | "luxury" | "size" | "type" | "features";
  label: string;
  strength: "strong" | "moderate" | "partial";
}

export interface SearchResult {
  query: SearchQuery;
  recommendations: Recommendation[];
  total_found: number;
  search_id: string;
}

// B2B Sponsorship types
export interface SponsorTier {
  id: string;
  name: "basic" | "premium" | "featured";
  price_monthly: number;
  boost_factor: number;
  max_listings: number;
  badge: string;
}

export interface Provider {
  id: string;
  name: string;
  type: "charter_company" | "broker" | "dealer" | "private";
  website: string;
  logo?: string;
  sponsor_tier?: SponsorTier;
  verified: boolean;
  rating: number;
  listing_count: number;
}

// Scraping pipeline types
export interface ScrapedListing {
  source_url: string;
  source_platform: string;
  raw_data: Record<string, unknown>;
  normalized: Partial<Listing> & Partial<Boat>;
  confidence: number;
  scraped_at: string;
}

export interface DeduplicationResult {
  canonical_id: string;
  duplicate_ids: string[];
  similarity_score: number;
}
