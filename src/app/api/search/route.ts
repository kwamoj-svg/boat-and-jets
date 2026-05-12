import { NextRequest, NextResponse } from "next/server";
import { searchWeb, buildSearchQueries } from "@/lib/serper";
import { parseUserQuery, extractListingsFromSearchResults } from "@/lib/claude-ai";

export const maxDuration = 30;

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get("q");
  if (!q || q.trim().length === 0) {
    return NextResponse.json(
      { error: "Query parameter 'q' is required" },
      { status: 400 }
    );
  }

  try {
    const parsed = await parseUserQuery(q);

    const queries = buildSearchQueries(parsed);

    const allResults = await Promise.all(
      queries.map((query) => searchWeb(query, 8))
    );

    const seen = new Set<string>();
    const uniqueResults = allResults.flat().filter((r) => {
      if (seen.has(r.link)) return false;
      seen.add(r.link);
      return true;
    });

    const listings = await extractListingsFromSearchResults(
      uniqueResults.slice(0, 15),
      parsed
    );

    listings.sort((a, b) => b.match_score - a.match_score);

    return NextResponse.json({
      query: { raw_query: q, parsed },
      recommendations: listings.slice(0, 8),
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
