import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { ExtractedListing } from "./claude-ai";

let _client: SupabaseClient | null = null;
function getClient(): SupabaseClient | null {
  if (_client) return _client;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  _client = createClient(url, key);
  return _client;
}

export interface SaleBoatRow {
  id: string;
  name: string;
  slug: string | null;
  boat_type: string;
  brand: string | null;
  model: string | null;
  year: number | null;
  length_m: number | null;
  cabins: number | null;
  berths: number | null;
  sale_price: number;
  currency: string;
  price_negotiable: boolean;
  vat_included: boolean;
  location: string | null;
  base_port: string | null;
  country: string | null;
  region: string | null;
  condition: string | null;
  hours_used: number | null;
  features: string[];
  images: string[];
  description: string | null;
  status: string;
  featured: boolean;
  verified: boolean;
  contact_name: string | null;
  contact_phone: string | null;
  contact_email: string | null;
  detail_url: string | null;
  source_domain: string | null;
}

export async function searchSaleBoats(opts: {
  query?: string;
  country?: string;
  region?: string;
  city?: string;
  boatType?: string;
  brand?: string;
  minPrice?: number;
  maxPrice?: number;
  minYear?: number;
  maxYear?: number;
  minLength?: number;
  maxLength?: number;
  condition?: string;
  limit?: number;
}): Promise<ExtractedListing[]> {
  const db = getClient();
  if (!db) return [];

  try {
    let query = db
      .from("sale_boats")
      .select("*")
      .eq("status", "active")
      .limit(opts.limit || 30);

    if (opts.boatType) {
      const typeMap: Record<string, string[]> = {
        motor: ["motorboat", "yacht", "speedboat"],
        motorboat: ["motorboat", "yacht", "speedboat"],
        motorboot: ["motorboat", "yacht", "speedboat"],
        sailing: ["sailboat"],
        sailboat: ["sailboat"],
        segelboot: ["sailboat"],
        catamaran: ["catamaran"],
        katamaran: ["catamaran"],
        gulet: ["gulet"],
        yacht: ["yacht", "motorboat", "sailboat", "catamaran", "superyacht"],
        speedboat: ["speedboat", "motorboat"],
      };
      const types = typeMap[opts.boatType.toLowerCase()] || [opts.boatType.toLowerCase()];
      if (types.length === 1) query = query.eq("boat_type", types[0]);
      else query = query.in("boat_type", types);
    }

    const locationTerms: string[] = [];
    if (opts.country) locationTerms.push(opts.country);
    if (opts.region && !locationTerms.includes(opts.region)) locationTerms.push(opts.region);
    if (opts.city && !locationTerms.includes(opts.city)) locationTerms.push(opts.city);

    if (locationTerms.length > 0) {
      const orParts = locationTerms.flatMap((t) => {
        const safe = t.replace(/[(),%]/g, "");
        return [
          `country.ilike.%${safe}%`,
          `region.ilike.%${safe}%`,
          `location.ilike.%${safe}%`,
          `base_port.ilike.%${safe}%`,
        ];
      });
      query = query.or(orParts.join(","));
    }

    if (opts.brand) query = query.ilike("brand", `%${opts.brand}%`);
    if (opts.minPrice) query = query.gte("sale_price", opts.minPrice);
    if (opts.maxPrice) query = query.lte("sale_price", opts.maxPrice);
    if (opts.minYear) query = query.gte("year", opts.minYear);
    if (opts.maxYear) query = query.lte("year", opts.maxYear);
    if (opts.minLength) query = query.gte("length_m", opts.minLength);
    if (opts.maxLength) query = query.lte("length_m", opts.maxLength);
    if (opts.condition) query = query.eq("condition", opts.condition);

    query = query
      .order("featured", { ascending: false })
      .order("sale_price", { ascending: true, nullsFirst: false });

    const { data, error } = await query;
    if (error) {
      console.error("[searchSaleBoats]", error.message);
      return [];
    }
    if (!data) return [];

    return (data as SaleBoatRow[]).map((b) => ({
      name: b.name || `${b.brand || ""} ${b.model || ""}`.trim(),
      type: b.boat_type,
      brand: b.brand || undefined,
      model: b.model || undefined,
      year: b.year || undefined,
      length_ft: b.length_m ? Math.round(b.length_m * 3.281) : undefined,
      cabins: b.cabins || undefined,
      guests: undefined,
      crew: undefined,
      price_per_day: undefined,
      price_per_week: undefined,
      sale_price: b.sale_price,
      currency: b.currency || "EUR",
      region: b.region || "",
      country: b.country || "",
      port: b.base_port || undefined,
      location: [b.location, b.base_port, b.country].filter(Boolean).join(", "),
      features: b.features || [],
      description: (b.description || "").slice(0, 300),
      source_url: b.detail_url || `https://veliqa.life/sale/${b.slug}`,
      source_title: b.source_domain || b.brand || "Boot zu verkaufen",
      image_url: b.images?.[0] || null,
      ai_summary: `${b.year ? b.year + " " : ""}${b.brand || ""} ${b.model || b.name} — ${b.condition || "good"} condition${b.hours_used ? `, ${b.hours_used} Bh` : ""}`,
      match_score: b.featured ? 0.9 : b.verified ? 0.82 : 0.75,
      match_reasons: [
        "Zum Verkauf",
        b.verified ? "Verifiziert" : null,
        b.condition ? `Zustand: ${b.condition}` : null,
        b.hours_used ? `${b.hours_used} Betriebsstunden` : null,
      ].filter((x): x is string => !!x),
      luxury_level: b.sale_price > 500000 ? 4 : b.sale_price > 100000 ? 3 : 2,
      verified: b.verified,
      is_sale: true,
    } as unknown as ExtractedListing));
  } catch (err) {
    console.error("[searchSaleBoats] catch", err);
    return [];
  }
}
