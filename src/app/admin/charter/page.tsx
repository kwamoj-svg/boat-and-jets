"use client";

import { useState } from "react";
import AdminDataTable, { StatusBadge, TruncatedText } from "../AdminDataTable";
import { Check, X, Star, Shield } from "lucide-react";

const BOAT_TYPES = [
  "", "sailboat", "catamaran", "motorboat", "yacht", "gulet", "speedboat", "jet_ski", "houseboat",
];

type Tab = "companies" | "boats";

export default function AdminCharterPage() {
  const [tab, setTab] = useState<Tab>("companies");
  const [countryFilter, setCountryFilter] = useState("");
  const [typeFilter, setTypeFilter] = useState("");

  async function toggleVerified(id: string, verified: boolean) {
    await fetch("/api/admin", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ entity: "charter_companies", id, updates: { verified } }),
    });
    window.location.reload();
  }

  async function toggleFeatured(id: string, featured: boolean) {
    await fetch("/api/admin", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ entity: "charter_companies", id, updates: { featured } }),
    });
    window.location.reload();
  }

  async function deleteCompany(id: string) {
    if (!confirm("Unternehmen und alle zugehörigen Boote löschen?")) return;
    await fetch(`/api/admin?entity=charter_companies&id=${id}`, { method: "DELETE" });
    window.location.reload();
  }

  async function deleteBoat(id: string) {
    await fetch(`/api/admin?entity=charter_boats&id=${id}`, { method: "DELETE" });
    window.location.reload();
  }

  return (
    <div>
      {/* Tab Switcher */}
      <div className="flex gap-1 mb-2 bg-white/[0.03] border border-white/[0.06] rounded-xl p-1 w-fit">
        <button
          onClick={() => setTab("companies")}
          className={`px-5 py-2 rounded-lg text-sm transition-all ${
            tab === "companies"
              ? "bg-gold/15 text-gold border border-gold/20"
              : "text-gray-400 hover:text-white hover:bg-white/5"
          }`}
        >
          Unternehmen
        </button>
        <button
          onClick={() => setTab("boats")}
          className={`px-5 py-2 rounded-lg text-sm transition-all ${
            tab === "boats"
              ? "bg-gold/15 text-gold border border-gold/20"
              : "text-gray-400 hover:text-white hover:bg-white/5"
          }`}
        >
          Boote
        </button>
      </div>

      {/* Companies Tab */}
      {tab === "companies" && (
        <AdminDataTable
          title="Charter Unternehmen"
          entity="charter_companies"
          extraParams={countryFilter ? { country: countryFilter } : {}}
          columns={[
            {
              key: "company_name",
              label: "Unternehmen",
              render: (v, row) => (
                <div className="flex items-center gap-1.5">
                  <span className="text-white font-medium">{String(v ?? "")}</span>
                  {!!row.verified && <Shield className="w-3.5 h-3.5 text-gold" />}
                  {!!row.featured && <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />}
                </div>
              ),
            },
            { key: "country", label: "Land" },
            { key: "city", label: "Stadt" },
            {
              key: "fleet_size",
              label: "Flotte",
              render: (v) => (
                <span className="text-cyan-400 font-medium">{String(v ?? 0)}</span>
              ),
            },
            {
              key: "rating",
              label: "Bewertung",
              render: (v) =>
                v != null ? (
                  <div className="flex items-center gap-1">
                    <span className="text-gold font-medium">{String(v)}</span>
                    <Star className="w-3 h-3 text-gold fill-gold" />
                  </div>
                ) : (
                  <span className="text-gray-600">—</span>
                ),
            },
            {
              key: "verified",
              label: "Verifiziert",
              render: (v) =>
                v ? (
                  <Check className="w-4 h-4 text-emerald-400" />
                ) : (
                  <X className="w-4 h-4 text-gray-600" />
                ),
            },
            {
              key: "featured",
              label: "Featured",
              render: (v) =>
                v ? (
                  <Star className="w-4 h-4 text-amber-400 fill-amber-400" />
                ) : (
                  <span className="text-gray-600">—</span>
                ),
            },
          ]}
          filters={
            <input
              type="text"
              placeholder="Land filtern..."
              value={countryFilter}
              onChange={(e) => setCountryFilter(e.target.value)}
              className="bg-white/5 border border-white/10 rounded-lg text-white text-sm px-3 py-2 focus:outline-none focus:border-gold/30 placeholder-gray-600"
            />
          }
          actions={[
            {
              label: "Verifizieren",
              icon: Check,
              variant: "success",
              onClick: (row) => toggleVerified(row.id as string, true),
              show: (row) => !row.verified,
            },
            {
              label: "Verifizierung entfernen",
              icon: X,
              variant: "danger",
              onClick: (row) => toggleVerified(row.id as string, false),
              show: (row) => !!row.verified,
            },
            {
              label: "Featured",
              icon: Star,
              variant: "success",
              onClick: (row) => toggleFeatured(row.id as string, true),
              show: (row) => !row.featured,
            },
            {
              label: "Featured entfernen",
              icon: Star,
              variant: "danger",
              onClick: (row) => toggleFeatured(row.id as string, false),
              show: (row) => !!row.featured,
            },
          ]}
          onDelete={(row) => deleteCompany(row.id as string)}
        />
      )}

      {/* Boats Tab */}
      {tab === "boats" && (
        <AdminDataTable
          title="Charter Boote"
          entity="charter_boats"
          extraParams={typeFilter ? { boat_type: typeFilter } : {}}
          columns={[
            {
              key: "name",
              label: "Name",
              render: (v) => (
                <span className="text-white font-medium">{String(v ?? "")}</span>
              ),
            },
            {
              key: "boat_type",
              label: "Typ",
              render: (v) => (
                <span className="capitalize text-gray-300">{String(v ?? "—")}</span>
              ),
            },
            { key: "brand", label: "Marke" },
            {
              key: "charter_companies",
              label: "Unternehmen",
              render: (v) => {
                if (v && typeof v === "object" && !Array.isArray(v)) {
                  const obj = v as Record<string, unknown>;
                  return <TruncatedText text={String(obj.company_name ?? "—")} max={25} />;
                }
                return <span className="text-gray-600">—</span>;
              },
            },
            {
              key: "price_per_day",
              label: "Preis/Tag",
              render: (v) =>
                v != null ? (
                  <span className="text-gold font-medium">{Number(v).toLocaleString("de-DE")} &euro;</span>
                ) : (
                  <span className="text-gray-600">—</span>
                ),
            },
            {
              key: "max_guests",
              label: "Gäste",
              render: (v) => (
                <span className="text-gray-300">{v != null ? String(v) : "—"}</span>
              ),
            },
            { key: "base_port", label: "Hafen" },
            {
              key: "status",
              label: "Status",
              render: (v) => <StatusBadge status={String(v ?? "active")} />,
            },
          ]}
          filters={
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="bg-white/5 border border-white/10 rounded-lg text-white text-sm px-3 py-2 focus:outline-none focus:border-gold/30"
            >
              <option value="">Alle Typen</option>
              {BOAT_TYPES.filter(Boolean).map((t) => (
                <option key={t} value={t}>
                  {t.charAt(0).toUpperCase() + t.slice(1).replace(/_/g, " ")}
                </option>
              ))}
            </select>
          }
          onDelete={(row) => deleteBoat(row.id as string)}
        />
      )}
    </div>
  );
}
