import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

/**
 * POST /api/track — Receives batched analytics events from the client
 * No auth required (anonymous tracking), but validates event structure
 */

const VALID_EVENTS = new Set([
  "page_view", "search", "boat_click", "boat_save", "boat_unsave",
  "charter_click", "company_click", "filter_use", "destination_click",
  "contact_click", "share_click", "signup", "login", "outbound_link",
]);

const VALID_DEVICES = new Set(["desktop", "tablet", "mobile"]);

function getDB() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  return createClient(url, key);
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { events } = body;

    if (!Array.isArray(events) || events.length === 0 || events.length > 50) {
      return NextResponse.json({ error: "Invalid events array (1-50)" }, { status: 400 });
    }

    const db = getDB();
    if (!db) {
      // Silently accept if DB not configured (don't break tracking)
      return NextResponse.json({ ok: true, stored: 0 });
    }

    // Validate and clean events
    const rows = events
      .filter((e: Record<string, unknown>) => VALID_EVENTS.has(String(e.event_type || "")))
      .map((e: Record<string, unknown>) => ({
        event_type: String(e.event_type),
        entity_type: e.entity_type ? String(e.entity_type).slice(0, 50) : null,
        entity_id: e.entity_id ? String(e.entity_id).slice(0, 255) : null,
        entity_name: e.entity_name ? String(e.entity_name).slice(0, 255) : null,
        page_url: e.page_url ? String(e.page_url).slice(0, 500) : null,
        referrer: e.referrer ? String(e.referrer).slice(0, 500) : null,
        search_query: e.search_query ? String(e.search_query).slice(0, 500) : null,
        metadata: typeof e.metadata === "object" && e.metadata ? e.metadata : {},
        session_id: e.session_id ? String(e.session_id).slice(0, 100) : null,
        device_type: VALID_DEVICES.has(String(e.device_type || "")) ? String(e.device_type) : null,
        // Extract country from request headers if available
        country: request.headers.get("cf-ipcountry") || request.headers.get("x-vercel-ip-country") || null,
        browser: request.headers.get("user-agent")?.split("/")[0]?.slice(0, 50) || null,
      }));

    if (rows.length > 0) {
      const { error } = await db.from("analytics_events").insert(rows);
      if (error) {
        console.error("[track] Insert error:", error.message);
        // Don't expose DB errors to client
      }
    }

    return NextResponse.json({ ok: true, stored: rows.length });
  } catch {
    return NextResponse.json({ ok: true, stored: 0 });
  }
}
