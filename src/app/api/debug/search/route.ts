import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { parseUserQuery } from "@/lib/claude-ai";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get("q") || "Segelboot Kroatien";

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;
  if (!url || !key) return NextResponse.json({ error: "no env" }, { status: 500 });

  const parsed = await parseUserQuery(q);
  const db = createClient(url, key);

  // Replicate searchCharterBoats query construction
  const typeMap: Record<string, string[]> = {
    sailing: ["sailboat"], catamaran: ["catamaran"], motor: ["motorboat", "yacht", "speedboat"],
    yacht: ["yacht", "motorboat"], gulet: ["gulet"],
  };

  let query = db
    .from("charter_boats")
    .select("name, boat_type, country, base_port", { count: "exact" })
    .eq("status", "active")
    .limit(5);

  const steps: string[] = ["start: status=active"];

  if (parsed.boat_type) {
    const types = typeMap[parsed.boat_type.toLowerCase()] || [parsed.boat_type.toLowerCase()];
    if (types.length === 1) {
      query = query.eq("boat_type", types[0]);
      steps.push(`boat_type=${types[0]}`);
    } else {
      query = query.in("boat_type", types);
      steps.push(`boat_type in (${types.join(",")})`);
    }
  }
  if (parsed.country) {
    query = query.ilike("country", `%${parsed.country}%`);
    steps.push(`country ilike %${parsed.country}%`);
  }
  if (parsed.region) {
    query = query.ilike("region", `%${parsed.region}%`);
    steps.push(`region ilike %${parsed.region}%`);
  }
  if (parsed.city) {
    query = query.or(`base_port.ilike.%${parsed.city}%,country.ilike.%${parsed.city}%,region.ilike.%${parsed.city}%`);
    steps.push(`OR(port/country/region ilike %${parsed.city}%)`);
  }

  const { data, error, count } = await query;

  return NextResponse.json({
    query: q,
    parsed: {
      boat_type: parsed.boat_type,
      country: parsed.country,
      region: parsed.region,
      city: parsed.city,
    },
    steps,
    error: error?.message || null,
    count,
    rows: data,
  });
}
