import { NextRequest, NextResponse } from "next/server";
import { searchSaleBoats } from "@/lib/sale-boats-search";
import { parseUserQuery } from "@/lib/claude-ai";

export const dynamic = "force-dynamic";

/**
 * GET /api/sale — Browse / search the sale_boats catalog
 *
 * Filters: ?q= ?country= ?region= ?type= ?brand= ?minPrice= ?maxPrice=
 *          ?minYear= ?maxYear= ?minLength= ?maxLength= ?condition=
 *          ?limit= (max 60)
 */
export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const q = sp.get("q") || "";

  // If free-text query, run it through the AI parser to extract structured filters
  let parsed: { country?: string; region?: string; city?: string; boat_type?: string; budget_max?: number; keywords?: string[] } = {};
  if (q.trim()) {
    try {
      parsed = await parseUserQuery(q);
    } catch { /* fallback to raw params */ }
  }

  const opts = {
    query: q,
    country: sp.get("country") || parsed.country || undefined,
    region: sp.get("region") || parsed.region || undefined,
    city: sp.get("city") || parsed.city || undefined,
    boatType: sp.get("type") || parsed.boat_type || undefined,
    brand: sp.get("brand") || undefined,
    minPrice: sp.get("minPrice") ? Number(sp.get("minPrice")) : undefined,
    maxPrice: sp.get("maxPrice") ? Number(sp.get("maxPrice")) : (parsed.budget_max || undefined),
    minYear: sp.get("minYear") ? Number(sp.get("minYear")) : undefined,
    maxYear: sp.get("maxYear") ? Number(sp.get("maxYear")) : undefined,
    minLength: sp.get("minLength") ? Number(sp.get("minLength")) : undefined,
    maxLength: sp.get("maxLength") ? Number(sp.get("maxLength")) : undefined,
    condition: sp.get("condition") || undefined,
    limit: Math.min(Math.max(1, parseInt(sp.get("limit") || "30")), 60),
  };

  const results = await searchSaleBoats(opts);

  return NextResponse.json({
    results,
    total: results.length,
    filters: opts,
    parsed,
  });
}
