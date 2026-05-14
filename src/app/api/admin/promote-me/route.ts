import { NextRequest, NextResponse } from "next/server";
import { createClient as createBrowserClient } from "@/lib/supabase/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

/**
 * Promote the currently-logged-in user to admin role + approve their
 * partner profile if they have one. Self-service so the owner doesn't
 * need to run SQL manually.
 *
 * Only works if the platform has zero admins so far — once an admin
 * exists, only that admin can promote others (via /admin).
 *
 * GET /api/admin/promote-me
 */
export async function GET(req: NextRequest) {
  // Optional secret bypass (for the very first setup)
  const secret = req.nextUrl.searchParams.get("secret");
  const expected = process.env.CRON_SECRET || process.env.ADMIN_SECRET;

  // Identify the caller — either via login or via secret query param
  const ssr = await createBrowserClient();
  const { data: { user } } = await ssr.auth.getUser();

  if (!user && (!expected || secret !== expected)) {
    return NextResponse.json({ error: "Login required" }, { status: 401 });
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) {
    return NextResponse.json({
      error: "SUPABASE_SERVICE_ROLE_KEY missing on Render",
    }, { status: 500 });
  }
  const adminDb = createClient(url, serviceKey);

  // Bootstrap rule: only allow if no admin exists yet (or if caller is owner email)
  const ownerEmail = process.env.OWNER_EMAIL;
  const { data: existingAdmins, count } = await adminDb
    .from("profiles")
    .select("id", { count: "exact", head: true })
    .eq("role", "admin");

  const targetUserId = user?.id;
  if (!targetUserId) {
    return NextResponse.json({ error: "Could not identify user" }, { status: 400 });
  }

  const isBootstrap = (count ?? 0) === 0;
  const isOwner = ownerEmail && user?.email === ownerEmail;
  if (!isBootstrap && !isOwner && secret !== expected) {
    return NextResponse.json({
      error: "Admins exist — ask one of them to promote you (or set OWNER_EMAIL env var)",
    }, { status: 403 });
  }

  // Make sure role column exists is a DDL op — skip. Assume default 'user'.
  // Promote
  const { error: promoteErr } = await adminDb
    .from("profiles")
    .upsert({ id: targetUserId, role: "admin" }, { onConflict: "id" });

  if (promoteErr) {
    return NextResponse.json({
      error: "Could not promote user",
      detail: promoteErr.message,
      hint: promoteErr.message.includes("role")
        ? "The profiles.role column may not exist. Run: ALTER TABLE profiles ADD COLUMN role TEXT DEFAULT 'user';"
        : null,
    }, { status: 500 });
  }

  // Also approve their partner profile if any
  const { data: partnerUpdate } = await adminDb
    .from("partners")
    .update({ status: "approved" })
    .eq("user_id", targetUserId)
    .select("id, company_name");

  return NextResponse.json({
    ok: true,
    user_id: targetUserId,
    email: user?.email ?? null,
    role: "admin",
    bootstrap: isBootstrap,
    partner_approved: partnerUpdate?.[0]?.company_name || null,
    note: !existingAdmins
      ? "First admin — congrats, the platform is yours."
      : "Promoted by bootstrap rule.",
  });
}
