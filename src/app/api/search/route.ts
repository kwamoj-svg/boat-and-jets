import { NextRequest } from "next/server";
import { parseUserQuery } from "@/lib/claude-ai";
import { searchCharterBoats, searchCharterCompanies } from "@/lib/database";
import { searchSaleBoats } from "@/lib/sale-boats-search";

export const maxDuration = 30;

/**
 * GET /api/search?q=...
 *
 * DB-ONLY search — matches against charter_boats populated by the hourly cron job.
 * No live scraping during user requests. Fast (<1s), reliable, deterministic.
 *
 * Returns SSE stream for compatibility with existing UI.
 */
export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get("q");
  if (!q || q.trim().length === 0) {
    return new Response(JSON.stringify({ error: "Query parameter 'q' is required" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      function send(event: string, data: unknown) {
        controller.enqueue(encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`));
      }

      try {
        send("stage", { stage: "parsing", message: "Suchanfrage wird analysiert..." });

        const parsed = await parseUserQuery(q);
        send("parsed", parsed);

        send("stage", { stage: "database", message: "Durchsuche Bootskatalog..." });

        // Detect buy/charter intent — buy intent comes from AI parse OR
        // from common German/English keywords in the raw query
        const rawLower = q.toLowerCase();
        const isBuy =
          parsed.intent === "buy" ||
          /\b(kauf|kaufen|verkauf|sell|sale|for sale|gebraucht|zu verkaufen)\b/.test(rawLower);

        // Search all three sources in parallel — charter boats, sale boats,
        // and charter companies (only if charter intent)
        const [boats, saleBoats, companies] = await Promise.all([
          searchCharterBoats({
            query: q,
            country: parsed.country || undefined,
            region: parsed.region || undefined,
            city: parsed.city || undefined,
            boatType: parsed.boat_type || undefined,
            guests: parsed.guests || undefined,
            budgetPerDay: parsed.budget_per_day || undefined,
            limit: isBuy ? 10 : 40,
          }),
          searchSaleBoats({
            query: q,
            country: parsed.country || undefined,
            region: parsed.region || undefined,
            city: parsed.city || undefined,
            boatType: parsed.boat_type || undefined,
            maxPrice: parsed.budget_max || undefined,
            limit: isBuy ? 40 : 10,
          }),
          isBuy
            ? Promise.resolve([])
            : searchCharterCompanies({
                query: q,
                country: parsed.country || undefined,
                region: parsed.region || undefined,
                city: parsed.city || undefined,
                boatType: parsed.boat_type || undefined,
                limit: 30,
              }),
        ]);

        // Order: buy → sale boats first, charter → charter boats first.
        // Companies last (broader, less specific).
        const results = isBuy
          ? [...saleBoats, ...boats, ...companies]
          : [...boats, ...saleBoats, ...companies];

        if (results.length > 0) {
          const parts: string[] = [];
          if (boats.length) parts.push(`${boats.length} Charter-Boote`);
          if (saleBoats.length) parts.push(`${saleBoats.length} Verkaufsboote`);
          if (companies.length) parts.push(`${companies.length} Anbieter`);
          send("stage", { stage: "results", message: parts.join(" + ") });
          for (const item of results) {
            send("listing", item);
          }
        } else {
          send("stage", {
            stage: "empty",
            message:
              "Noch keine passenden Einträge im Katalog. Der stündliche Scraper sammelt laufend neue Daten — versuche es in 1–2 Stunden erneut oder mit weniger Filtern.",
          });
        }

        send("done", {
          total_found: results.length,
          displayed: results.length,
          boats: boats.length,
          sale_boats: saleBoats.length,
          companies: companies.length,
          intent: isBuy ? "buy" : "charter",
          source: "database",
          search_id: crypto.randomUUID(),
        });
      } catch (error) {
        console.error("[/api/search] error:", error);
        const message = error instanceof Error ? error.message : "Search failed";
        send("error", { error: message });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
