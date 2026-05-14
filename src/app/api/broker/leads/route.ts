import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createClient as createSsrClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

/**
 * GET /api/broker/leads
 *
 * Returns broker leads stored in analytics_events.  Uses the service role
 * server-side because anon RLS blocks reads on that table.  Requires the
 * caller to be authenticated (any logged-in user — broker access control
 * can be tightened later).
 */
export async function GET() {
  // Auth check using the user's own (anon) client
  const ssr = await createSsrClient();
  const { data: { user } } = await ssr.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Login required" }, { status: 401 });
  }

  // Service role to bypass RLS for the actual data fetch
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) {
    return NextResponse.json({
      error: "Service role key not configured",
    }, { status: 500 });
  }
  const adminDb = createClient(url, serviceKey);

  const { data, error } = await adminDb
    .from("analytics_events")
    .select("id, entity_id, entity_name, country, metadata, created_at")
    .eq("entity_type", "broker_lead")
    .order("created_at", { ascending: false })
    .limit(100);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ leads: data ?? [] });
}
