import { NextRequest } from "next/server";
import { searchWeb, buildSearchQueries, fetchPageContent, searchImages } from "@/lib/serper";
import {
  parseUserQuery,
  extractBoatsFromPages,
  extractListingsFromSearchResults,
} from "@/lib/claude-ai";
import type { ExtractedListing } from "@/lib/claude-ai";

export const maxDuration = 60;

function getDomain(url: string): string {
  try {
    return new URL(url).hostname.replace("www.", "");
  } catch {
    return url;
  }
}

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
        // Stage 1: Parse query
        send("stage", { stage: "parsing", message: "Understanding your search..." });
        const parsed = await parseUserQuery(q);
        send("parsed", parsed);

        // Stage 2: Search the web
        send("stage", { stage: "searching", message: "Searching the entire internet..." });
        const queries = buildSearchQueries(parsed);

        const [allResults, imageResults] = await Promise.all([
          Promise.all(queries.map((query) => searchWeb(query, 10))),
          searchImages(`${parsed.boat_type || "yacht"} ${parsed.country || parsed.region || ""} charter`.trim(), 20),
        ]);

        // Dedupe by URL
        const seen = new Set<string>();
        const uniqueResults = allResults.flat().filter((r) => {
          if (seen.has(r.link)) return false;
          seen.add(r.link);
          return true;
        });

        send("stage", {
          stage: "fetching",
          message: `Found ${uniqueResults.length} sources, fetching pages...`,
        });

        // Diversify by domain (max 2 per domain for fetching)
        const domainCount = new Map<string, number>();
        const diverseResults = uniqueResults.filter((r) => {
          const domain = getDomain(r.link);
          const count = domainCount.get(domain) || 0;
          if (count >= 2) return false;
          domainCount.set(domain, count + 1);
          return true;
        });

        // Stage 3: Fetch pages in parallel
        const topPages = diverseResults.slice(0, 15);
        const pageContents = await Promise.all(
          topPages.map(async (r) => {
            const content = await fetchPageContent(r.link);
            return { url: r.link, title: r.title, content };
          })
        );

        const pagesWithContent = pageContents.filter((p) => p.content.length > 200);

        send("stage", {
          stage: "analyzing",
          message: `Analyzing ${pagesWithContent.length} pages with AI...`,
        });

        // Stage 4: Extract from pages AND snippets in parallel
        const [pageListings, snippetListings] = await Promise.all([
          pagesWithContent.length > 0
            ? extractBoatsFromPages(pagesWithContent, parsed)
            : Promise.resolve([]),
          extractListingsFromSearchResults(uniqueResults.slice(0, 25), parsed),
        ]);

        // Stage 5: Merge, dedupe by name, attach images
        const listings: ExtractedListing[] = [...pageListings];
        const existingNames = new Set(listings.map((l) => l.name.toLowerCase()));
        for (const sl of snippetListings) {
          if (!existingNames.has(sl.name.toLowerCase())) {
            listings.push(sl);
            existingNames.add(sl.name.toLowerCase());
          }
        }

        // Attach images from Serper image search
        const imageMap = new Map<string, string>();
        for (const img of imageResults) {
          const key = img.title.toLowerCase();
          if (!imageMap.has(key)) imageMap.set(key, img.imageUrl);
        }
        for (const listing of listings) {
          if (!listing.image_url) {
            for (const [key, url] of imageMap) {
              const nameLower = listing.name.toLowerCase();
              if (key.includes(nameLower) || nameLower.includes(key.split(" ")[0])) {
                listing.image_url = url;
                break;
              }
            }
          }
          // Fallback: use any image from that domain
          if (!listing.image_url) {
            const domain = getDomain(listing.source_url);
            for (const img of imageResults) {
              if (getDomain(img.link).includes(domain.split(".")[0])) {
                listing.image_url = img.imageUrl;
                break;
              }
            }
          }
        }

        // Normalize prices
        for (const l of listings) {
          if (l.price_per_day && !l.price_per_week) {
            l.price_per_week = l.price_per_day * 7;
          }
        }

        // Sort by match score
        listings.sort((a, b) => b.match_score - a.match_score);

        // Diversify final results (max 3 per domain)
        const sourceCounts = new Map<string, number>();
        const diverseListings = listings.filter((l) => {
          const domain = getDomain(l.source_url);
          const count = sourceCounts.get(domain) || 0;
          if (count >= 3) return false;
          sourceCounts.set(domain, count + 1);
          return true;
        });

        // Stream each listing individually for progressive rendering
        const final = diverseListings.slice(0, 15);
        send("stage", { stage: "results", message: `Found ${final.length} matching boats` });

        for (const listing of final) {
          send("listing", listing);
        }

        send("done", {
          total_found: listings.length,
          displayed: final.length,
          search_id: crypto.randomUUID(),
        });
      } catch (error) {
        console.error("Search error:", error);
        console.error("Search detail:", error);
        send("error", { error: "Search failed. Please try again." });
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
