import { getPartnerProfile, getPartnerBoats } from "@/app/actions/partner";
import { Ship, Eye, Plus, Edit } from "lucide-react";
import Link from "next/link";

export default async function PartnerDashboardPage() {
  const partner = await getPartnerProfile();
  const boats = await getPartnerBoats();

  const activeBoats = boats.filter((b: { status: string }) => b.status === "active");
  const totalBoats = boats.length;

  return (
    <div className="max-w-6xl mx-auto">
      <h1 className="text-2xl font-semibold text-white mb-6">
        Willkommen zurück
      </h1>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        <div className="bg-navy-light/50 backdrop-blur-md border border-white/10 rounded-xl p-5">
          <div className="flex items-center justify-between mb-2">
            <span className="text-gray-400 text-sm">Boote gesamt</span>
            <Ship className="w-5 h-5 text-gold" />
          </div>
          <p className="text-3xl font-semibold text-white">{totalBoats}</p>
        </div>

        <div className="bg-navy-light/50 backdrop-blur-md border border-white/10 rounded-xl p-5">
          <div className="flex items-center justify-between mb-2">
            <span className="text-gray-400 text-sm">Aktive Boote</span>
            <Ship className="w-5 h-5 text-green-400" />
          </div>
          <p className="text-3xl font-semibold text-white">
            {activeBoats.length}
          </p>
        </div>

        <div className="bg-navy-light/50 backdrop-blur-md border border-white/10 rounded-xl p-5">
          <div className="flex items-center justify-between mb-2">
            <span className="text-gray-400 text-sm">Aufrufe (Monat)</span>
            <Eye className="w-5 h-5 text-ocean-light" />
          </div>
          <p className="text-3xl font-semibold text-white">--</p>
          <p className="text-xs text-gray-500 mt-1">Demnächst verfügbar</p>
        </div>
      </div>

      {/* Quick Actions */}
      <h2 className="text-lg font-medium text-white mb-3">Schnellaktionen</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
        <Link
          href="/partner/boats/new"
          className="flex items-center gap-3 bg-navy-light/50 backdrop-blur-md border border-white/10 rounded-xl p-5 hover:border-gold/30 transition group"
        >
          <div className="w-10 h-10 rounded-lg bg-gold/10 flex items-center justify-center group-hover:bg-gold/20 transition">
            <Plus className="w-5 h-5 text-gold" />
          </div>
          <div>
            <p className="text-white font-medium">Neues Boot hinzufügen</p>
            <p className="text-gray-400 text-sm">
              Liste ein weiteres Boot auf VELIQA
            </p>
          </div>
        </Link>

        <Link
          href="/partner/profile"
          className="flex items-center gap-3 bg-navy-light/50 backdrop-blur-md border border-white/10 rounded-xl p-5 hover:border-gold/30 transition group"
        >
          <div className="w-10 h-10 rounded-lg bg-ocean/10 flex items-center justify-center group-hover:bg-ocean/20 transition">
            <Edit className="w-5 h-5 text-ocean-light" />
          </div>
          <div>
            <p className="text-white font-medium">Profil bearbeiten</p>
            <p className="text-gray-400 text-sm">
              Firmendaten und Kontakt aktualisieren
            </p>
          </div>
        </Link>
      </div>

      {/* Account Status */}
      <h2 className="text-lg font-medium text-white mb-3">Kontostatus</h2>
      <div className="bg-navy-light/50 backdrop-blur-md border border-white/10 rounded-xl p-5">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-white font-medium">
              {partner?.company_name}
            </p>
            <p className="text-gray-400 text-sm capitalize">
              {partner?.company_type?.replace("_", " ")}
            </p>
          </div>
          <span
            className={`text-xs px-3 py-1 rounded-full border ${
              partner?.status === "approved"
                ? "bg-green-500/20 text-green-300 border-green-500/30"
                : partner?.status === "pending"
                ? "bg-yellow-500/20 text-yellow-300 border-yellow-500/30"
                : "bg-red-500/20 text-red-300 border-red-500/30"
            }`}
          >
            {partner?.status === "approved"
              ? "Verifiziert"
              : partner?.status === "pending"
              ? "Ausstehend"
              : partner?.status}
          </span>
        </div>
      </div>
    </div>
  );
}
