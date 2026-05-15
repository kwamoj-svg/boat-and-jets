import { NextRequest, NextResponse } from "next/server";
import { checkCronKillSwitch } from "@/lib/cron-guard";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

export const maxDuration = 300;

/**
 * Backfill missing prices for Samboat boats by fetching each detail page
 * and extracting the daily/weekly price from the HTML.
 *
 * Trigger: GET /api/cron/backfill-prices
 *          ?count=N (default 50, max 200)
 */

function getServiceDb(): SupabaseClient | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  return createClient(url, key);
}

interface Parsed {
  price_per_day: number | null;
  price_per_week: number | null;
  length_m: number | null;
  cabins: number | null;
  max_guests: number | null;
  year: number | null;
  brand: string | null;
  model: string | null;
  image_url: string | null;
}

const UA = "Mozilla/5.0 (Macintosh; Intel Mac OS X 14.0) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36";

async function fetchHtml(url: string): Promise<string | null> {
  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 12000);
    const res = await fetch(url, {
      signal: ctrl.signal,
      headers: {
        "User-Agent": UA,
        Accept: "text/html,application/xhtml+xml",
        "Accept-Language": "de-DE,de;q=0.9,en;q=0.8",
      },
      redirect: "follow",
    });
    clearTimeout(t);
    if (!res.ok) return null;
    return await res.text();
  } catch {
    return null;
  }
}

/** Extract price + specs from a Samboat detail HTML page */
function parseSamboatHtml(html: string): Parsed {
  const result: Parsed = {
    price_per_day: null,
    price_per_week: null,
    length_m: null,
    cabins: null,
    max_guests: null,
    year: null,
    brand: null,
    model: null,
    image_url: null,
  };

  // 1) JSON-LD <script type="application/ld+json"> — most reliable
  const jsonLdRe = /<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  let m;
  while ((m = jsonLdRe.exec(html)) !== null) {
    try {
      const data = JSON.parse(m[1]);
      const items = Array.isArray(data) ? data : [data];
      for (const item of items) {
        // Schema.org Product / Offer
        if (item?.offers) {
          const offers = Array.isArray(item.offers) ? item.offers : [item.offers];
          for (const o of offers) {
            const price = parseFloat(o.price || o.lowPrice || o.priceSpecification?.price || "");
            if (!isNaN(price) && price > 0) {
              // Heuristic: under 5000 = day, over = week
              if (price < 5000) result.price_per_day = price;
              else result.price_per_week = price;
            }
          }
        }
        if (item?.image && !result.image_url) {
          result.image_url = Array.isArray(item.image) ? item.image[0] : item.image;
        }
        if (item?.brand?.name && !result.brand) result.brand = item.brand.name;
        if (item?.model && !result.model) result.model = item.model;
      }
    } catch { /* skip bad JSON */ }
  }

  // 2) Next.js __NEXT_DATA__ embed
  const nextDataRe = /<script id="__NEXT_DATA__" type="application\/json">([\s\S]*?)<\/script>/;
  const ndMatch = nextDataRe.exec(html);
  if (ndMatch) {
    try {
      const data = JSON.parse(ndMatch[1]);
      const props = data?.props?.pageProps;
      const boat = props?.boat || props?.listing || props?.product;
      if (boat) {
        if (!result.price_per_day && boat.pricePerDay) result.price_per_day = Number(boat.pricePerDay);
        if (!result.price_per_week && boat.pricePerWeek) result.price_per_week = Number(boat.pricePerWeek);
        if (!result.length_m && boat.length) result.length_m = Number(boat.length);
        if (!result.cabins && boat.cabins) result.cabins = Number(boat.cabins);
        if (!result.max_guests && (boat.maxPassengers || boat.passengers)) {
          result.max_guests = Number(boat.maxPassengers || boat.passengers);
        }
        if (!result.year && boat.constructionYear) result.year = Number(boat.constructionYear);
        if (!result.brand && boat.brand) result.brand = String(boat.brand);
        if (!result.model && boat.model) result.model = String(boat.model);
        if (!result.image_url && boat.coverImage) result.image_url = String(boat.coverImage);
      }
    } catch { /* skip */ }
  }

  // 3) Plain-HTML fallback regex
  if (!result.price_per_day) {
    // patterns: "ab 250 €", "250€/Tag", "Tagespreis: 250"
    const re = /(?:ab|ab nur|from|à partir de|desde)\s*(\d{2,5})(?:[.,]\d+)?\s*(?:€|EUR)/i;
    const mm = re.exec(html);
    if (mm) result.price_per_day = parseInt(mm[1]);
  }
  if (!result.price_per_day) {
    const re = /(\d{2,5})\s*(?:€|EUR)\s*\/?\s*(?:Tag|day|jour|día|giorno)/i;
    const mm = re.exec(html);
    if (mm) result.price_per_day = parseInt(mm[1]);
  }
  if (!result.price_per_week) {
    const re = /(\d{2,5})\s*(?:€|EUR)\s*\/?\s*(?:Woche|week|semaine|semana|settimana)/i;
    const mm = re.exec(html);
    if (mm) result.price_per_week = parseInt(mm[1]);
  }

  // 4) Open-Graph image as fallback
  if (!result.image_url) {
    const og = /<meta\s+property=["']og:image["']\s+content=["']([^"']+)["']/i.exec(html);
    if (og) result.image_url = og[1];
  }

  // Sanity-check prices (filter junk)
  if (result.price_per_day && (result.price_per_day < 30 || result.price_per_day > 100000)) {
    result.price_per_day = null;
  }
  if (result.price_per_week && (result.price_per_week < 200 || result.price_per_week > 500000)) {
    result.price_per_week = null;
  }

  return result;
}

export async function GET(req: NextRequest) {
  const kill = checkCronKillSwitch(req.nextUrl.searchParams);
  if (kill) return kill;
  const secret = req.headers.get("x-cron-secret") || req.nextUrl.searchParams.get("secret");
  const expected = process.env.CRON_SECRET || "veliqa-scrape-2024";
  if (secret !== expected) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const db = getServiceDb();
  if (!db) return NextResponse.json({ error: "DB not configured" }, { status: 500 });

  const count = Math.min(Math.max(1, parseInt(req.nextUrl.searchParams.get("count") || "50")), 200);

  // Pick Samboat boats without a price, oldest first (so we don't re-process the same ones)
  const { data: rows, error: fetchErr } = await db
    .from("charter_boats")
    .select("id, name, detail_url, source")
    .eq("source", "samboat_sitemap")
    .is("price_per_day", null)
    .not("detail_url", "is", null)
    .order("created_at", { ascending: true })
    .limit(count);

  if (fetchErr) return NextResponse.json({ error: fetchErr.message }, { status: 500 });
  if (!rows || rows.length === 0) {
    return NextResponse.json({ ok: true, processed: 0, message: "No boats to backfill" });
  }

  let updated = 0;
  let withPrice = 0;
  const errors: string[] = [];

  // Process in parallel batches of 5 (avoid rate-limits but not too slow)
  const CONCURRENCY = 5;
  for (let i = 0; i < rows.length; i += CONCURRENCY) {
    const batch = rows.slice(i, i + CONCURRENCY);
    const results = await Promise.allSettled(
      batch.map(async (row) => {
        const html = await fetchHtml(String(row.detail_url));
        if (!html) return { id: row.id, parsed: null };
        const parsed = parseSamboatHtml(html);
        return { id: row.id, parsed };
      })
    );

    for (const r of results) {
      if (r.status !== "fulfilled" || !r.value.parsed) continue;
      const p = r.value.parsed;

      // Build update object — only set fields that we parsed
      const patch: Record<string, unknown> = {};
      if (p.price_per_day) patch.price_per_day = p.price_per_day;
      if (p.price_per_week) patch.price_per_week = p.price_per_week;
      if (p.length_m) patch.length_m = p.length_m;
      if (p.cabins) patch.cabins = p.cabins;
      if (p.max_guests) patch.max_guests = p.max_guests;
      if (p.year) patch.year = p.year;
      if (p.brand) patch.brand = p.brand;
      if (p.model) patch.model = p.model;
      if (p.image_url) patch.images = [p.image_url];

      if (Object.keys(patch).length === 0) continue;

      const { error: ue } = await db
        .from("charter_boats")
        .update(patch)
        .eq("id", r.value.id);
      if (ue) {
        if (errors.length < 5) errors.push(ue.message);
      } else {
        updated++;
        if (p.price_per_day) withPrice++;
      }
    }
  }

  return NextResponse.json({
    ok: true,
    fetched: rows.length,
    updated,
    withPrice,
    errors,
  });
}
