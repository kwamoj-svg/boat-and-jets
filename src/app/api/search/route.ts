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
        // Stage 1: Parse query with spell correction
        send("stage", { stage: "parsing", message: "Understanding your search..." });
        const parsed = await parseUserQuery(q);
        send("parsed", parsed);

        // Stage 2: Blast the internet — 12 parallel search queries + image search
        send("stage", { stage: "searching", message: "Searching across 50+ platforms worldwide..." });
        const queries = buildSearchQueries(parsed);

        const imageQuery = [
          parsed.boat_type || "yacht",
          parsed.country || parsed.region || "",
          parsed.style || "",
          parsed.intent === "buy" ? "for sale" : "charter",
        ].filter(Boolean).join(" ");

        const [allResults, imageResults] = await Promise.all([
          Promise.all(queries.map((query) => searchWeb(query, 10))),
          searchImages(imageQuery, 30),
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
          message: `Found ${uniqueResults.length} sources across ${new Set(uniqueResults.map(r => getDomain(r.link))).size} platforms...`,
        });

        // Diversify by domain (max 3 per domain for fetching — gives more variety)
        const domainCount = new Map<string, number>();
        const diverseResults = uniqueResults.filter((r) => {
          const domain = getDomain(r.link);
          const count = domainCount.get(domain) || 0;
          if (count >= 3) return false;
          domainCount.set(domain, count + 1);
          return true;
        });

        // Stage 3: Fetch up to 20 pages in parallel
        const topPages = diverseResults.slice(0, 20);
        const pageContents = await Promise.all(
          topPages.map(async (r) => {
            const content = await fetchPageContent(r.link);
            return { url: r.link, title: r.title, content };
          })
        );

        const pagesWithContent = pageContents.filter((p) => p.content.length > 200);

        send("stage", {
          stage: "analyzing",
          message: `AI analyzing ${pagesWithContent.length} pages from ${new Set(pagesWithContent.map(p => getDomain(p.url))).size} different platforms...`,
        });

        // Stage 4: Split pages into batches and extract in parallel for speed + diversity
        const BATCH_SIZE = 6;
        const pageBatches: typeof pagesWithContent[] = [];
        for (let i = 0; i < pagesWithContent.length; i += BATCH_SIZE) {
          pageBatches.push(pagesWithContent.slice(i, i + BATCH_SIZE));
        }

        const extractionPromises = [
          ...pageBatches.map((batch) => extractBoatsFromPages(batch, parsed)),
          extractListingsFromSearchResults(uniqueResults.slice(0, 30), parsed),
        ];

        const extractionResults = await Promise.all(extractionPromises);

        // Stage 5: Merge all results, dedupe by name
        const allListings: ExtractedListing[] = [];
        const existingNames = new Set<string>();

        for (const batch of extractionResults) {
          for (const listing of batch) {
            const key = listing.name.toLowerCase().trim();
            if (!existingNames.has(key)) {
              allListings.push(listing);
              existingNames.add(key);
            }
          }
        }

        // Attach images — multi-strategy matching
        for (const listing of allListings) {
          if (listing.image_url) continue;

          const nameLower = listing.name.toLowerCase();
          const nameParts = nameLower.split(/[\s/]+/).filter(w => w.length > 2);

          // Strategy 1: Direct name match in image titles
          for (const img of imageResults) {
            const titleLower = img.title.toLowerCase();
            if (nameParts.some(part => titleLower.includes(part))) {
              listing.image_url = img.imageUrl;
              break;
            }
          }

          // Strategy 2: Brand/model match
          if (!listing.image_url && (listing.brand || listing.model)) {
            const brandModel = `${listing.brand || ""} ${listing.model || ""}`.toLowerCase().trim();
            for (const img of imageResults) {
              if (img.title.toLowerCase().includes(brandModel)) {
                listing.image_url = img.imageUrl;
                break;
              }
            }
          }

          // Strategy 3: Domain match
          if (!listing.image_url) {
            const domain = getDomain(listing.source_url).split(".")[0];
            for (const img of imageResults) {
              if (getDomain(img.link).includes(domain)) {
                listing.image_url = img.imageUrl;
                break;
              }
            }
          }
        }

        // Normalize prices
        for (const l of allListings) {
          if (l.price_per_day && !l.price_per_week) {
            l.price_per_week = l.price_per_day * 7;
          }
        }

        // Sort by match score
        allListings.sort((a, b) => (b.match_score ?? 0) - (a.match_score ?? 0));

        // Diversify final results (max 3 per domain)
        const sourceCounts = new Map<string, number>();
        const diverseListings = allListings.filter((l) => {
          const domain = getDomain(l.source_url);
          const count = sourceCounts.get(domain) || 0;
          if (count >= 3) return false;
          sourceCounts.set(domain, count + 1);
          return true;
        });

        // Stream results
        const final = diverseListings.slice(0, 20);
        const platformCount = new Set(final.map(l => getDomain(l.source_url))).size;
        send("stage", {
          stage: "results",
          message: `Found ${final.length} boats from ${platformCount} platforms`,
        });

        for (const listing of final) {
          send("listing", listing);
        }

        send("done", {
          total_found: allListings.length,
          displayed: final.length,
          platforms_searched: new Set(uniqueResults.map(r => getDomain(r.link))).size,
          pages_analyzed: pagesWithContent.length,
          search_id: crypto.randomUUID(),
        });
      } catch (error) {
        console.error("Search error:", error);
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
