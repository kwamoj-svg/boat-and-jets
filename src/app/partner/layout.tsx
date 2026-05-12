import { getPartnerProfile } from "@/app/actions/partner";
import { redirect } from "next/navigation";
import PartnerSidebar from "./PartnerSidebar";

export default async function PartnerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const partner = await getPartnerProfile();

  if (!partner) {
    redirect("/partner/register");
  }

  return (
    <div className="min-h-screen bg-navy flex">
      <PartnerSidebar
        companyName={partner.company_name}
        status={partner.status}
      />
      <main className="flex-1 ml-0 md:ml-64">
        {partner.status === "pending" && (
          <div className="bg-gold/10 border-b border-gold/30 px-6 py-3 text-gold text-sm text-center">
            Verifizierung läuft... Dein Konto wird geprüft. Einige Funktionen
            sind eingeschränkt.
          </div>
        )}
        <div className="p-6 md:p-8">{children}</div>
      </main>
    </div>
  );
}
