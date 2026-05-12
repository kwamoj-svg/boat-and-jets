/**
 * VELIQA — Verified Global Yacht Network
 *
 * Structured intelligence database for luxury charter operators worldwide.
 * Each entry is curated, scored, and verified — not raw scraped data.
 */

export interface YachtNetworkPartner {
  // Company identity
  company_name: string;
  slug: string;
  country: string;
  region: string;
  city?: string;
  marina?: string;

  // Contact
  website: string;
  email: string;
  phone: string;
  whatsapp?: string;

  // Social presence
  instagram?: string;
  facebook?: string;
  youtube?: string;
  linkedin?: string;

  // Services offered
  categories: ServiceCategory[];

  // Intelligence scores (1-10)
  luxury_score: number;       // How premium is their fleet/service
  ai_quality_score: number;   // Based on fleet data, reviews, web presence
  price_level: PriceLevel;    // $, $$, $$$, $$$$, $$$$$
  response_time: ResponseTime;

  // Metadata
  languages: string[];
  vip_friendly: boolean;
  verified: boolean;
  fleet_size?: number;
  year_founded?: number;
  description: string;

  // Operational
  operating_regions: string[];
  peak_season?: string;
  booking_url?: string;
}

export type ServiceCategory =
  | "charter_weekly"
  | "day_charter"
  | "brokerage"
  | "luxury_yacht"
  | "sport_boats"
  | "explorer_yachts"
  | "vip_services"
  | "crewed_charter"
  | "bareboat"
  | "catamaran"
  | "superyacht"
  | "sailing"
  | "motor_yacht"
  | "gulet"
  | "event_charter"
  | "corporate"
  | "fishing"
  | "diving";

export type PriceLevel = "$" | "$$" | "$$$" | "$$$$" | "$$$$$";
export type ResponseTime = "instant" | "within_1h" | "within_24h" | "slow" | "unknown";

export type NetworkRegion =
  | "dubai"
  | "monaco"
  | "greece"
  | "croatia"
  | "miami"
  | "maldives"
  | "caribbean"
  | "italy"
  | "spain"
  | "turkey"
  | "thailand"
  | "french_riviera"
  | "sardinia"
  | "ibiza"
  | "bahamas"
  | "seychelles"
  | "montenegro"
  | "south_france"
  | "amalfi"
  | "sicily"
  | "mallorca"
  | "british_virgin_islands"
  | "antigua"
  | "st_barths";
