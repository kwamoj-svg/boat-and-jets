import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createClient as createSsrClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

/**
 * Saved searches — store/retrieve user search queries for one-click reuse.
 * Backed by analytics_events (event_type='search', entity_type='saved_search')
 * so we don't need a new table.
 */

async function getUserId() {
  const ssr = await createSsrClient();
  const { data: { user } } = await ssr.auth.getUser();
  return user?.id ?? null;
}

function getAdminDb() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key);
}

// GET — list saved searches for current user
export async function GET() {
  const userId = await getUserId();
  if (!userId) return NextResponse.json({ error: "Login required" }, { status: 401 });

  const db = getAdminDb();
  if (!db) return NextResponse.json({ error: "DB unavailable" }, { status: 500 });

  const { data, error } = await db
    .from("analytics_events")
    .select("id, entity_name, metadata, created_at")
    .eq("event_type", "search")
    .eq("entity_type", "saved_search")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(50);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({
    searches: (data || []).map((r: { id: string; entity_name: string | null; metadata: Record<string, unknown> | null; created_at: string }) => ({
      id: r.id,
      query: r.entity_name || "",
      filters: r.metadata || {},
      created_at: r.created_at,
    })),
  });
}

// POST — save a new search
export async function POST(req: NextRequest) {
  const userId = await getUserId();
  if (!userId) return NextResponse.json({ error: "Login required" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const query = String(body.query || "").trim();
  if (!query) return NextResponse.json({ error: "query required" }, { status: 400 });
  const filters = (body.filters && typeof body.filters === "object") ? body.filters : {};
  const label = body.label ? String(body.label).trim() : null;

  const db = getAdminDb();
  if (!db) return NextResponse.json({ error: "DB unavailable" }, { status: 500 });

  // Avoid duplicate same-query saves — keep newest only
  await db
    .from("analytics_events")
    .delete()
    .eq("user_id", userId)
    .eq("event_type", "search")
    .eq("entity_type", "saved_search")
    .eq("entity_name", query);

  const { data, error } = await db
    .from("analytics_events")
    .insert({
      user_id: userId,
      event_type: "search",
      entity_type: "saved_search",
      entity_id: query.toLowerCase().slice(0, 60),
      entity_name: query,
      metadata: { label, filters },
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true, id: data?.id });
}

// DELETE — remove a saved search by id
export async function DELETE(req: NextRequest) {
  const userId = await getUserId();
  if (!userId) return NextResponse.json({ error: "Login required" }, { status: 401 });

  const id = req.nextUrl.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

  const db = getAdminDb();
  if (!db) return NextResponse.json({ error: "DB unavailable" }, { status: 500 });

  const { error } = await db
    .from("analytics_events")
    .delete()
    .eq("id", id)
    .eq("user_id", userId);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}
