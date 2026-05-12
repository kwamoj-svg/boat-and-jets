import { NextRequest, NextResponse } from "next/server";
import { searchWeb, buildSearchQueries, fetchPageContent } from "@/lib/serper";
import {
  parseUserQuery,
  extractBoatsFromPages,
  extractListingsFromSearchResults,
} from "@/lib/claude-ai";

export const maxDuration = 45;

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get("q");
  if (!q || q.trim().length === 0) {
    return NextResponse.json(
      { error: "Query parameter 'q' is required" },
      { status: 400 }
    );
  }

  try {
    // Stage 1: Parse user query with AI
    const parsed = await parseUserQuery(q);

    // Stage 2: Blast the web with up to 10 parallel search queries
    const queries = buildSearchQueries(parsed);
    const allResults = await Promise.all(
      queries.map((query) => searchWeb(query, 10))
    );

    // Dedupe by URL
    const seen = new Set<string>();
    const uniqueResults = allResults.flat().filter((r) => {
      if (seen.has(r.link)) return false;
      seen.add(r.link);
      return true;
    });

    // Stage 3: Fetch top 12 pages in parallel
    const topPages = uniqueResults.slice(0, 12);
    const pageContents = await Promise.all(
      topPages.map(async (r) => {
        const content = await fetchPageContent(r.link);
        return { url: r.link, title: r.title, content };
      })
    );

    const pagesWithContent = pageContents.filter((p) => p.content.length > 200);

    // Stage 4: Run BOTH extraction methods in parallel
    const [pageListings, snippetListings] = await Promise.all([
      pagesWithContent.length > 0
        ? extractBoatsFromPages(pagesWithContent, parsed)
        : Promise.resolve([]),
      extractListingsFromSearchResults(uniqueResults.slice(0, 20), parsed),
    ]);

    // Stage 5: Merge results, dedupe by name
    const listings = [...pageListings];
    const existingNames = new Set(listings.map((l) => l.name.toLowerCase()));
    for (const sl of snippetListings) {
      if (!existingNames.has(sl.name.toLowerCase())) {
        listings.push(sl);
        existingNames.add(sl.name.toLowerCase());
      }
    }

    // Stage 6: Sort by match score
    listings.sort((a, b) => b.match_score - a.match_score);

    return NextResponse.json({
      query: { raw_query: q, parsed },
      recommendations: listings.slice(0, 12),
      total_found: listings.length,
      search_id: crypto.randomUUID(),
    });
  } catch (error) {
    console.error("Search error:", error);
    return NextResponse.json(
      { error: "Search failed. Please try again." },
      { status: 500 }
    );
  }
}
