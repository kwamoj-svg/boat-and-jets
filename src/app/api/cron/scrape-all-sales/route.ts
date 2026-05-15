import { NextRequest, NextResponse } from "next/server";

export const maxDuration = 300;

/**
 * Meta-scraper: fires all sale-boat scrapers in parallel.
 *
 *   GET /api/cron/scrape-all-sales?secret=...
 *
 * Calls:
 *   - /api/cron/scrape-scanboat?count=500
 *   - /api/cron/scrape-yachtmarket?count=500
 *   - /api/cron/scrape-sale-boats?count=40
 */

export async function GET(req: NextRequest) {
  const secret = req.headers.get("x-cron-secret") || req.nextUrl.searchParams.get("secret");
  const expected = process.env.CRON_SECRET || "veliqa-scrape-2024";
  if (secret !== expected) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const baseUrl = req.nextUrl.origin;
  const headers: Record<string, string> = { "x-cron-secret": secret };

  const scrapers = [
    { name: "scanboat", url: `${baseUrl}/api/cron/scrape-scanboat?count=500` },
    { name: "yachtmarket", url: `${baseUrl}/api/cron/scrape-yachtmarket?count=500` },
    { name: "serper", url: `${baseUrl}/api/cron/scrape-sale-boats?count=40` },
  ];

  const results = await Promise.allSettled(
    scrapers.map(async (s) => {
      try {
        const res = await fetch(s.url, { headers });
        const data = await res.json();
        return { name: s.name, status: res.status, ...data };
      } catch (err) {
        return { name: s.name, error: String(err) };
      }
    })
  );

  const summary = results.map((r) =>
    r.status === "fulfilled" ? r.value : { error: String(r.reason) }
  );

  const totalInserted = summary.reduce(
    (sum: number, s: Record<string, unknown>) => sum + (Number(s.inserted || s.totalInserted) || 0),
    0
  );

  return NextResponse.json({
    ok: true,
    totalInserted,
    scrapers: summary,
  });
}
