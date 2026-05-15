import { NextRequest, NextResponse } from "next/server";
import { checkCronKillSwitch } from "@/lib/cron-guard";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

export const maxDuration = 300;
export const dynamic = "force-dynamic";

/**
 * Backfill prices + location for Boataround boats.
 *
 * Boataround embeds JSON-LD Offer in the detail page:
 *   {"@type":"Offer","price":680,"priceCurrency":"EUR"}
 * And a Product description in the form:
 *   "... liegt in Marina di Portisco Spa, Italien. ..."  (DE)
 *   "... located in Palma, Spain. ..."                   (EN)
 *
 *  GET /api/cron/backfill-boataround-prices?count=100
 *  Header: x-cron-secret: <secret>
 */

const UA = "Mozilla/5.0 (Macintosh; Intel Mac OS X 14.0) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36";

function getServiceDb(): SupabaseClient | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  return createClient(url, key);
}

interface Parsed {
  price_per_day: number | null;
  price_per_week: number | null;
  country: string | null;
  base_port: string | null;
  description: string | null;
  // Spec fields (from embedded Vue prop JSON)
  year: number | null;
  length_m: number | null;
  beam_m: number | null;
  draft_m: number | null;
  cabins: number | null;
  max_guests: number | null;
  crew_size: number | null;
  engine_type: string | null;
  engine_hp: number | null;
  fuel_tank_l: number | null;
  water_tank_l: number | null;
  features: string[] | null;
}

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

// Map German/French/Spanish/Italian country names back to canonical English
const COUNTRY_NORMALIZE: Record<string, string> = {
  italien: "Italy", italie: "Italy", italia: "Italy",
  spanien: "Spain", espagne: "Spain", españa: "Spain", spagna: "Spain",
  kroatien: "Croatia", croatie: "Croatia", croacia: "Croatia", croazia: "Croatia",
  griechenland: "Greece", grèce: "Greece", grecia: "Greece",
  frankreich: "France", francia: "France",
  türkei: "Turkey", turquie: "Turkey", turquía: "Turkey", turchia: "Turkey",
  portugal: "Portugal", "portugal,": "Portugal",
  montenegro: "Montenegro", malta: "Malta",
  niederlande: "Netherlands", "pays-bas": "Netherlands", "países bajos": "Netherlands", "paesi bassi": "Netherlands",
  schweden: "Sweden", suède: "Sweden", suecia: "Sweden", svezia: "Sweden",
  norwegen: "Norway", norvège: "Norway", noruega: "Norway", norvegia: "Norway",
};

function normalizeCountry(raw: string | null): string | null {
  if (!raw) return null;
  const key = raw.trim().toLowerCase().replace(/[.,;]$/, "");
  return COUNTRY_NORMALIZE[key] || raw.trim().replace(/[.,;]$/, "");
}

/** Decode HTML entities relevant inside Vue prop JSON blobs. */
function unescapeHtml(s: string): string {
  return s
    .replace(/&quot;/g, '"')
    .replace(/&#34;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&");
}

/** Extract a JSON value embedded as an HTML attribute (Vue :prop style). */
function extractJsonProp(html: string, pattern: RegExp): unknown | null {
  const m = pattern.exec(html);
  if (!m) return null;
  try {
    return JSON.parse(unescapeHtml(m[1]));
  } catch {
    return null;
  }
}

function parseBoataround(html: string): Parsed {
  const out: Parsed = {
    price_per_day: null,
    price_per_week: null,
    country: null,
    base_port: null,
    description: null,
    year: null,
    length_m: null,
    beam_m: null,
    draft_m: null,
    cabins: null,
    max_guests: null,
    crew_size: null,
    engine_type: null,
    engine_hp: null,
    fuel_tank_l: null,
    water_tank_l: null,
    features: null,
  };

  // 1) JSON-LD blocks
  const jsonLdRe = /<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  let m;
  while ((m = jsonLdRe.exec(html)) !== null) {
    try {
      const data = JSON.parse(m[1]);
      const items = Array.isArray(data) ? data : [data];
      for (const item of items) {
        if (item?.offers) {
          const offers = Array.isArray(item.offers) ? item.offers : [item.offers];
          for (const o of offers) {
            const p = parseFloat(o.price || o.lowPrice || "");
            if (!isNaN(p) && p > 0) {
              if (out.price_per_day == null || p < out.price_per_day) {
                out.price_per_day = p;
              }
            }
          }
        }
        if (item?.description && !out.description) {
          out.description = String(item.description);
        }
      }
    } catch { /* ignore */ }
  }

  // 2) Location from description — match "in <city>, <country>"
  if (out.description) {
    const patterns = [
      /(?:liegt|located|liegt im|liegt in|se trouve|ubicado|si trova)[^.]*?\bin\s+([A-ZÄÖÜ][^,.]{2,60}),\s*([A-ZÄÖÜ][^.,;]{2,40})/i,
      /\bin\s+([A-ZÄÖÜ][^,.]{2,60}),\s*([A-ZÄÖÜ][a-zäöü]{3,30})\b/,
    ];
    for (const re of patterns) {
      const mm = re.exec(out.description);
      if (mm) {
        out.base_port = mm[1].trim();
        out.country = normalizeCountry(mm[2]);
        break;
      }
    }
  }

  // 3) Boat specs blob — Boataround embeds the boat-info-list :boat-information
  //    prop as an HTML-encoded JSON object with all numeric specs.
  //    Pattern: ...,"length":14.28,"beam":7.88,... (HTML-encoded with &quot;)
  const specMatch = /(\{[^{}]*"length":[\d.]+[^{}]*"year":\d+[^{}]*\})/.exec(
    unescapeHtml(html.slice(0, 400000))
  );
  if (specMatch) {
    try {
      const spec = JSON.parse(specMatch[1]) as Record<string, unknown>;
      const num = (v: unknown) => (typeof v === "number" && v > 0 ? v : null);
      out.year = num(spec.year);
      out.length_m = num(spec.length);
      out.beam_m = num(spec.beam);
      out.draft_m = num(spec.draft);
      out.cabins = num(spec.cabins);
      out.max_guests = num(spec.allowed_people) ?? num(spec.max_sleeps) ?? num(spec.sleeps);
      out.crew_size = num(spec.crew_sleeps);
      out.engine_hp = num(spec.total_engine_power) ?? num(spec.engine_power);
      out.fuel_tank_l = num(spec.fuel);
      out.water_tank_l = num(spec.water_tank);
      if (typeof spec.engine === "string" && spec.engine.length > 0 && spec.engine !== "0") {
        out.engine_type = String(spec.engine);
      }
    } catch { /* ignore malformed spec */ }
  }

  // 4) Equipment / Entertainment / Cockpit arrays — three separate Vue props,
  //    each is HTML-encoded `[{"name":"...","is_present":true|false,...}, ...]`.
  //    We collect names where is_present === true into one features list.
  const features: string[] = [];
  for (const prop of ["equipment", "entertainment", "cockpit"]) {
    const re = new RegExp(`:${prop}="(\\[[^"]+\\])"`, "i");
    const arr = extractJsonProp(html, re);
    if (Array.isArray(arr)) {
      for (const item of arr) {
        const it = item as { name?: string; is_present?: boolean };
        if (it && it.is_present && typeof it.name === "string" && it.name.length > 0) {
          features.push(it.name);
        }
      }
    }
  }
  if (features.length > 0) {
    // dedupe, preserve order
    out.features = Array.from(new Set(features));
  }

  // Sanity-check
  if (out.price_per_day && (out.price_per_day < 30 || out.price_per_day > 100000)) {
    out.price_per_day = null;
  }
  if (out.price_per_week && (out.price_per_week < 200 || out.price_per_week > 500000)) {
    out.price_per_week = null;
  }
  if (out.length_m && (out.length_m < 3 || out.length_m > 200)) out.length_m = null;
  if (out.beam_m && (out.beam_m < 1 || out.beam_m > 30)) out.beam_m = null;
  if (out.draft_m && (out.draft_m < 0.2 || out.draft_m > 15)) out.draft_m = null;
  if (out.year && (out.year < 1900 || out.year > new Date().getFullYear() + 1)) out.year = null;
  if (out.cabins && (out.cabins < 1 || out.cabins > 30)) out.cabins = null;
  if (out.max_guests && (out.max_guests < 1 || out.max_guests > 50)) out.max_guests = null;

  return out;
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

  const count = Math.min(Math.max(1, parseInt(req.nextUrl.searchParams.get("count") || "100")), 300);
  // Re-fill mode: ?refill=1 processes boats that already have a price but
  //   are missing specs (length_m null). Without it, only price-less boats.
  const refill = req.nextUrl.searchParams.get("refill") === "1";

  let q = db
    .from("charter_boats")
    .select("id, name, detail_url")
    .eq("source", "boataround_sitemap")
    .not("detail_url", "is", null)
    .order("created_at", { ascending: true })
    .limit(count);
  q = refill ? q.is("length_m", null) : q.is("price_per_day", null);
  const { data: rows, error: fetchErr } = await q;

  if (fetchErr) return NextResponse.json({ error: fetchErr.message }, { status: 500 });
  if (!rows || rows.length === 0) {
    return NextResponse.json({ ok: true, processed: 0, message: "Nothing to backfill" });
  }

  let updated = 0;
  let withPrice = 0;
  let withCountry = 0;
  let withSpecs = 0;
  let withFeatures = 0;
  const errors: string[] = [];

  const CONCURRENCY = 6;
  for (let i = 0; i < rows.length; i += CONCURRENCY) {
    const batch = rows.slice(i, i + CONCURRENCY);
    const results = await Promise.allSettled(
      batch.map(async (row) => {
        // Always hit the canonical (no-locale-prefix) URL for parsing — server picks default locale
        const url = String(row.detail_url);
        const html = await fetchHtml(url);
        if (!html) return { id: row.id, parsed: null };
        return { id: row.id, parsed: parseBoataround(html) };
      })
    );

    for (const r of results) {
      if (r.status !== "fulfilled" || !r.value.parsed) continue;
      const p = r.value.parsed;
      const patch: Record<string, unknown> = {};
      if (p.price_per_day) patch.price_per_day = p.price_per_day;
      if (p.price_per_week) patch.price_per_week = p.price_per_week;
      if (p.country) patch.country = p.country;
      if (p.base_port) patch.base_port = p.base_port;
      if (p.year) patch.year = p.year;
      if (p.length_m) patch.length_m = p.length_m;
      if (p.beam_m) patch.beam_m = p.beam_m;
      if (p.draft_m) patch.draft_m = p.draft_m;
      if (p.cabins) patch.cabins = p.cabins;
      if (p.max_guests) patch.max_guests = p.max_guests;
      if (p.crew_size !== null && p.crew_size !== undefined) patch.crew_size = p.crew_size;
      if (p.engine_type) patch.engine_type = p.engine_type;
      if (p.engine_hp) patch.engine_hp = p.engine_hp;
      if (p.fuel_tank_l) patch.fuel_tank_l = p.fuel_tank_l;
      if (p.water_tank_l) patch.water_tank_l = p.water_tank_l;
      if (p.features && p.features.length > 0) patch.features = p.features;
      if (Object.keys(patch).length === 0) continue;

      const { error: ue } = await db.from("charter_boats").update(patch).eq("id", r.value.id);
      if (ue) {
        if (errors.length < 5) errors.push(ue.message);
      } else {
        updated++;
        if (p.price_per_day) withPrice++;
        if (p.country) withCountry++;
        if (p.length_m) withSpecs++;
        if (p.features && p.features.length > 0) withFeatures++;
      }
    }
  }

  return NextResponse.json({
    ok: true,
    fetched: rows.length,
    updated,
    withPrice,
    withCountry,
    withSpecs,
    withFeatures,
    refill,
    errors,
  });
}
