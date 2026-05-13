import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

/**
 * Guard for /partner/register — if the user already has a partner account,
 * redirect them to /partner instead of letting them register a second one.
 */
export default async function PartnerRegisterLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data: partner } = await supabase
        .from("partners")
        .select("id")
        .eq("user_id", user.id)
        .maybeSingle();
      if (partner) {
        redirect("/partner");
      }
    }
  } catch {
    // Supabase unavailable — let registration proceed
  }
  return <>{children}</>;
}
