import { NextRequest } from "next/server";
import { parseUserQuery } from "@/lib/claude-ai";
import { searchCharterBoats, searchCharterCompanies } from "@/lib/database";

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

        // Search both boats AND companies in parallel
        const [boats, companies] = await Promise.all([
          searchCharterBoats({
            query: q,
            country: parsed.country || undefined,
            region: parsed.region || undefined,
            city: parsed.city || undefined,
            boatType: parsed.boat_type || undefined,
            guests: parsed.guests || undefined,
            budgetPerDay: parsed.budget_per_day || undefined,
            limit: 40,
          }),
          searchCharterCompanies({
            query: q,
            country: parsed.country || undefined,
            region: parsed.region || undefined,
            city: parsed.city || undefined,
            boatType: parsed.boat_type || undefined,
            limit: 30,
          }),
        ]);

        // Merge: boats first (more specific), then companies
        const results = [...boats, ...companies];

        if (results.length > 0) {
          const breakdown =
            boats.length > 0 && companies.length > 0
              ? `${boats.length} Boote + ${companies.length} Charter-Anbieter`
              : boats.length > 0
              ? `${boats.length} Boote im Katalog gefunden`
              : `${companies.length} Charter-Anbieter gefunden`;
          send("stage", { stage: "results", message: breakdown });
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
          companies: companies.length,
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
