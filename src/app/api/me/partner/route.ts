import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

/**
 * GET /api/me/partner — returns the current user's partner status, if any.
 * Used by the Navbar to decide whether to show "For Business" or
 * "Mein Unternehmen".
 */
export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ isPartner: false, status: null });
    }
    const { data: partner } = await supabase
      .from("partners")
      .select("id, status, company_name")
      .eq("user_id", user.id)
      .maybeSingle();
    return NextResponse.json({
      isPartner: !!partner,
      status: partner?.status ?? null,
      companyName: partner?.company_name ?? null,
    });
  } catch {
    return NextResponse.json({ isPartner: false, status: null });
  }
}
