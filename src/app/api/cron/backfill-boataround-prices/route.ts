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

function parseBoataround(html: string): Parsed {
  const out: Parsed = {
    price_per_day: null,
    price_per_week: null,
    country: null,
    base_port: null,
    description: null,
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
              if (p < 5000) out.price_per_day = p;
              else out.price_per_week = p;
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

  // Sanity-check
  if (out.price_per_day && (out.price_per_day < 30 || out.price_per_day > 100000)) {
    out.price_per_day = null;
  }
  if (out.price_per_week && (out.price_per_week < 200 || out.price_per_week > 500000)) {
    out.price_per_week = null;
  }

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

  const { data: rows, error: fetchErr } = await db
    .from("charter_boats")
    .select("id, name, detail_url")
    .eq("source", "boataround_sitemap")
    .is("price_per_day", null)
    .not("detail_url", "is", null)
    .order("created_at", { ascending: true })
    .limit(count);

  if (fetchErr) return NextResponse.json({ error: fetchErr.message }, { status: 500 });
  if (!rows || rows.length === 0) {
    return NextResponse.json({ ok: true, processed: 0, message: "Nothing to backfill" });
  }

  let updated = 0;
  let withPrice = 0;
  let withCountry = 0;
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
      if (Object.keys(patch).length === 0) continue;

      const { error: ue } = await db.from("charter_boats").update(patch).eq("id", r.value.id);
      if (ue) {
        if (errors.length < 5) errors.push(ue.message);
      } else {
        updated++;
        if (p.price_per_day) withPrice++;
        if (p.country) withCountry++;
      }
    }
  }

  return NextResponse.json({
    ok: true,
    fetched: rows.length,
    updated,
    withPrice,
    withCountry,
    errors,
  });
}
