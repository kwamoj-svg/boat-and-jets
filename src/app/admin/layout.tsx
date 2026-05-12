import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import AdminSidebar from "./AdminSidebar";

export const metadata = {
  title: "VELIQA Admin",
};

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  let isAdmin = false;

  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      redirect("/login?redirect=/admin");
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    isAdmin = profile?.role === "admin";
  } catch {
    // Supabase not configured — allow access with admin secret via API
  }

  // Also allow access if ADMIN_SECRET is set (for dev/staging)
  const hasAdminSecret = !!(process.env.ADMIN_SECRET);

  if (!isAdmin && !hasAdminSecret) {
    redirect("/");
  }

  return (
    <div className="min-h-screen bg-[#080e1a] flex">
      <AdminSidebar />
      <main className="flex-1 ml-0 md:ml-64 min-h-screen">
        <div className="p-4 md:p-8 max-w-7xl">{children}</div>
      </main>
    </div>
  );
}
