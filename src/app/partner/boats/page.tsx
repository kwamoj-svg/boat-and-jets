"use client";

import { useEffect, useState } from "react";
import { getPartnerBoats, deletePartnerBoat } from "@/app/actions/partner";
import { Ship, Plus, Edit, Trash2 } from "lucide-react";
import Link from "next/link";

interface Boat {
  id: string;
  name: string;
  type: string;
  brand: string | null;
  price_per_day: number | null;
  price_per_week: number | null;
  currency: string;
  status: string;
  region: string | null;
}

export default function PartnerBoatsPage() {
  const [boats, setBoats] = useState<Boat[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const data = await getPartnerBoats();
      setBoats(data as Boat[]);
      setLoading(false);
    }
    load();
  }, []);

  async function handleDelete(id: string, name: string) {
    if (!confirm(`"${name}" wirklich deaktivieren?`)) return;
    const result = await deletePartnerBoat(id);
    if (result?.success) {
      setBoats((prev) => prev.filter((b) => b.id !== id));
    }
  }

  const statusBadge = (status: string) => {
    const styles: Record<string, string> = {
      active: "bg-green-500/20 text-green-300 border-green-500/30",
      draft: "bg-gray-500/20 text-gray-300 border-gray-500/30",
      inactive: "bg-red-500/20 text-red-300 border-red-500/30",
    };
    const labels: Record<string, string> = {
      active: "Aktiv",
      draft: "Entwurf",
      inactive: "Inaktiv",
    };
    return (
      <span
        className={`text-xs px-2 py-0.5 rounded-full border ${
          styles[status] || styles.draft
        }`}
      >
        {labels[status] || status}
      </span>
    );
  };

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-navy-light/50 rounded w-48" />
          <div className="h-64 bg-navy-light/50 rounded-xl" />
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold text-white">Meine Boote</h1>
        <Link
          href="/partner/boats/new"
          className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-gold to-gold-light text-navy font-semibold rounded-lg hover:opacity-90 transition text-sm"
        >
          <Plus className="w-4 h-4" />
          Neues Boot
        </Link>
      </div>

      {boats.length === 0 ? (
        <div className="bg-navy-light/50 backdrop-blur-md border border-white/10 rounded-xl p-12 text-center">
          <Ship className="w-12 h-12 text-gray-500 mx-auto mb-4" />
          <p className="text-gray-300 mb-2">Noch keine Boote vorhanden</p>
          <p className="text-gray-500 text-sm mb-6">
            Füge dein erstes Boot hinzu, um es auf VELIQA zu listen.
          </p>
          <Link
            href="/partner/boats/new"
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-gold to-gold-light text-navy font-semibold rounded-lg hover:opacity-90 transition text-sm"
          >
            <Plus className="w-4 h-4" />
            Boot hinzufügen
          </Link>
        </div>
      ) : (
        <div className="bg-navy-light/50 backdrop-blur-md border border-white/10 rounded-xl overflow-hidden">
          {/* Desktop table */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/10 text-left">
                  <th className="px-5 py-3 text-xs text-gray-400 font-medium uppercase tracking-wider">
                    Name
                  </th>
                  <th className="px-5 py-3 text-xs text-gray-400 font-medium uppercase tracking-wider">
                    Typ
                  </th>
                  <th className="px-5 py-3 text-xs text-gray-400 font-medium uppercase tracking-wider">
                    Preis
                  </th>
                  <th className="px-5 py-3 text-xs text-gray-400 font-medium uppercase tracking-wider">
                    Region
                  </th>
                  <th className="px-5 py-3 text-xs text-gray-400 font-medium uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-5 py-3 text-xs text-gray-400 font-medium uppercase tracking-wider">
                    Aktionen
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {boats.map((boat) => (
                  <tr key={boat.id} className="hover:bg-white/5 transition">
                    <td className="px-5 py-4">
                      <p className="text-white font-medium text-sm">
                        {boat.name}
                      </p>
                      {boat.brand && (
                        <p className="text-gray-500 text-xs">{boat.brand}</p>
                      )}
                    </td>
                    <td className="px-5 py-4 text-gray-300 text-sm capitalize">
                      {boat.type}
                    </td>
                    <td className="px-5 py-4 text-gray-300 text-sm">
                      {boat.price_per_day
                        ? `${boat.price_per_day.toLocaleString()} ${boat.currency}/Tag`
                        : boat.price_per_week
                        ? `${boat.price_per_week.toLocaleString()} ${boat.currency}/Woche`
                        : "--"}
                    </td>
                    <td className="px-5 py-4 text-gray-300 text-sm">
                      {boat.region || "--"}
                    </td>
                    <td className="px-5 py-4">{statusBadge(boat.status)}</td>
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-2">
                        <Link
                          href={`/partner/boats/${boat.id}/edit`}
                          className="p-1.5 rounded-lg hover:bg-white/10 text-gray-400 hover:text-white transition"
                        >
                          <Edit className="w-4 h-4" />
                        </Link>
                        <button
                          onClick={() => handleDelete(boat.id, boat.name)}
                          className="p-1.5 rounded-lg hover:bg-red-500/10 text-gray-400 hover:text-red-400 transition"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile cards */}
          <div className="md:hidden divide-y divide-white/5">
            {boats.map((boat) => (
              <div key={boat.id} className="p-4">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <p className="text-white font-medium">{boat.name}</p>
                    <p className="text-gray-400 text-sm capitalize">
                      {boat.type}
                      {boat.brand ? ` · ${boat.brand}` : ""}
                    </p>
                  </div>
                  {statusBadge(boat.status)}
                </div>
                <div className="flex items-center justify-between mt-3">
                  <span className="text-gray-300 text-sm">
                    {boat.price_per_day
                      ? `${boat.price_per_day.toLocaleString()} ${boat.currency}/Tag`
                      : "--"}
                  </span>
                  <div className="flex items-center gap-2">
                    <Link
                      href={`/partner/boats/${boat.id}/edit`}
                      className="p-1.5 rounded-lg hover:bg-white/10 text-gray-400 hover:text-white transition"
                    >
                      <Edit className="w-4 h-4" />
                    </Link>
                    <button
                      onClick={() => handleDelete(boat.id, boat.name)}
                      className="p-1.5 rounded-lg hover:bg-red-500/10 text-gray-400 hover:text-red-400 transition"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
