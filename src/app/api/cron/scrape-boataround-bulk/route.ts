import { NextRequest, NextResponse } from "next/server";
import { checkCronKillSwitch } from "@/lib/cron-guard";

export const maxDuration = 600;
export const dynamic = "force-dynamic";

/**
 * Bulk-trigger the per-type Boataround scraper across multiple
 * lang × type × index combinations so the user can populate the
 * whole catalog with one HTTP call instead of 15.
 *
 *   GET /api/cron/scrape-boataround-bulk?secret=...
 *     &langs=de,en          (default de)
 *     &types=catamaran,sailing,motor   (default all three)
 *     &indices=1-5          (default 1-3 → 1,2,3)
 *     &count=1              (count per inner call, default 1)
 *
 * Each combo runs through /api/cron/scrape-boataround and the results
 * are aggregated. Existing slugs are deduped by the inner route.
 *
 * Note: each inner sub-sitemap fetch can take 10-30s; with many combos
 * you can hit the 600s maxDuration. Start small (indices=1-2).
 */

function parseList(raw: string | null, fallback: string[]): string[] {
  if (!raw) return fallback;
  return raw
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

function parseRange(raw: string | null, fallback: number[]): number[] {
  if (!raw) return fallback;
  const out: number[] = [];
  for (const part of raw.split(",")) {
    const m = /^(\d+)-(\d+)$/.exec(part.trim());
    if (m) {
      const a = parseInt(m[1], 10);
      const b = parseInt(m[2], 10);
      for (let i = Math.min(a, b); i <= Math.max(a, b); i++) out.push(i);
    } else if (/^\d+$/.test(part.trim())) {
      out.push(parseInt(part.trim(), 10));
    }
  }
  return out.length > 0 ? out : fallback;
}

export async function GET(req: NextRequest) {
  const kill = checkCronKillSwitch(req.nextUrl.searchParams);
  if (kill) return kill;

  const secret = req.headers.get("x-cron-secret") || req.nextUrl.searchParams.get("secret");
  const expected = process.env.CRON_SECRET || "veliqa-scrape-2024";
  if (secret !== expected) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const langs = parseList(req.nextUrl.searchParams.get("langs"), ["de"]);
  const types = parseList(req.nextUrl.searchParams.get("types"), [
    "catamaran",
    "sailing",
    "motor",
  ]);
  const indices = parseRange(req.nextUrl.searchParams.get("indices"), [1, 2, 3]);
  const count = parseInt(req.nextUrl.searchParams.get("count") || "1", 10);

  const origin = req.nextUrl.origin;
  const innerSecret = process.env.CRON_SECRET || "veliqa-scrape-2024";

  const results: Array<{
    lang: string;
    type: string;
    index: number;
    ok: boolean;
    inserted?: number;
    entries?: number;
    error?: string;
  }> = [];

  let totalInserted = 0;

  for (const lang of langs) {
    for (const type of types) {
      for (const index of indices) {
        const url = new URL("/api/cron/scrape-boataround", origin);
        url.searchParams.set("lang", lang);
        url.searchParams.set("type", type);
        url.searchParams.set("index", String(index));
        url.searchParams.set("count", String(count));
        url.searchParams.set("force", "1"); // bypass kill switch in inner call

        try {
          const res = await fetch(url.toString(), {
            headers: { "x-cron-secret": innerSecret },
          });
          const body = (await res.json()) as Record<string, unknown>;
          const inserted = Number(body.totalInserted ?? body.inserted ?? 0);
          const entries = Number(body.totalEntries ?? body.entries ?? 0);
          totalInserted += inserted;
          results.push({
            lang,
            type,
            index,
            ok: res.ok,
            inserted,
            entries,
            error: res.ok ? undefined : String(body.error || `HTTP ${res.status}`),
          });
        } catch (e) {
          const msg = e instanceof Error ? e.message : String(e);
          results.push({ lang, type, index, ok: false, error: msg });
        }
      }
    }
  }

  return NextResponse.json({
    ok: true,
    combos: results.length,
    totalInserted,
    results,
  });
}
