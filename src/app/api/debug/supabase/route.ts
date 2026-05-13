import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  const env = {
    hasUrl: !!url,
    urlValue: url ? url.slice(0, 40) + "..." : null,
    hasAnonKey: !!key,
    anonKeyPrefix: key ? key.slice(0, 12) + "..." : null,
    anonKeyLen: key?.length,
    hasServiceKey: !!serviceKey,
    serviceKeyPrefix: serviceKey ? serviceKey.slice(0, 12) + "..." : null,
    nodeVersion: process.version,
    nodeOptions: process.env.NODE_OPTIONS || null,
  };

  if (!url || !key) {
    return NextResponse.json({ env, error: "Missing URL or key" }, { status: 500 });
  }

  // Test 1: Raw fetch to Supabase REST API
  const tests: Record<string, unknown> = { env };

  try {
    const start = Date.now();
    const res = await fetch(`${url}/rest/v1/charter_boats?select=count`, {
      method: "HEAD",
      headers: {
        apikey: key,
        Authorization: `Bearer ${key}`,
        Prefer: "count=exact",
      },
    });
    tests.rawFetch = {
      ok: res.ok,
      status: res.status,
      contentRange: res.headers.get("content-range"),
      durationMs: Date.now() - start,
    };
  } catch (err) {
    tests.rawFetch = {
      ok: false,
      error: err instanceof Error ? err.message : String(err),
      cause: err instanceof Error && err.cause ? String(err.cause) : null,
    };
  }

  // Test 2: With supabase-js
  try {
    const { createClient } = await import("@supabase/supabase-js");
    const client = createClient(url, key);
    const start = Date.now();
    const { data, error, count } = await client
      .from("charter_boats")
      .select("id", { count: "exact", head: true })
      .eq("status", "active");
    tests.supabaseJs = {
      ok: !error,
      count,
      error: error?.message,
      data: data?.length,
      durationMs: Date.now() - start,
    };
  } catch (err) {
    tests.supabaseJs = {
      ok: false,
      error: err instanceof Error ? err.message : String(err),
      cause: err instanceof Error && err.cause ? String(err.cause) : null,
    };
  }

  return NextResponse.json(tests);
}
