"use client";

import { useState } from "react";
import AdminDataTable, { StatusBadge, DateCell, TruncatedText } from "../AdminDataTable";
import { Check, X, Eye } from "lucide-react";

export default function AdminBoatsPage() {
  const [statusFilter, setStatusFilter] = useState("");
  const [detail, setDetail] = useState<Record<string, unknown> | null>(null);

  async function updateStatus(id: string, status: string) {
    await fetch("/api/admin", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ entity: "partner_boats", id, updates: { status } }),
    });
    window.location.reload();
  }

  return (
    <>
      <AdminDataTable
        title="Partner Boote"
        entity="partner_boats"
        extraParams={statusFilter ? { status: statusFilter } : {}}
        columns={[
          { key: "name", label: "Boot", render: (v) => (
            <span className="text-white font-medium">{v as string}</span>
          )},
          { key: "type", label: "Typ", render: (v) => (
            <span className="text-xs text-gray-400 capitalize">{v as string}</span>
          )},
          { key: "brand", label: "Marke" },
          { key: "region", label: "Region" },
          { key: "price_per_day", label: "Preis/Tag", render: (v, row) => (
            v ? <span className="text-gold">{Number(v).toLocaleString("de-DE")} {row.currency as string}</span> : <span className="text-gray-600">—</span>
          )},
          { key: "partners", label: "Partner", render: (v) => {
            const p = v as Record<string, unknown> | null;
            return <TruncatedText text={p?.company_name as string} max={20} />;
          }},
          { key: "status", label: "Status", render: (v) => <StatusBadge status={v as string} /> },
          { key: "created_at", label: "Erstellt", render: (v) => <DateCell date={v as string} /> },
        ]}
        filters={
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-white/5 border border-white/10 rounded-lg text-white text-sm px-3 py-2 focus:outline-none focus:border-gold/30"
          >
            <option value="">Alle Status</option>
            <option value="active">Aktiv</option>
            <option value="draft">Entwurf</option>
            <option value="inactive">Inaktiv</option>
          </select>
        }
        actions={[
          {
            label: "Aktivieren",
            icon: Check,
            variant: "success",
            onClick: (row) => updateStatus(row.id as string, "active"),
            show: (row) => row.status !== "active",
          },
          {
            label: "Deaktivieren",
            icon: X,
            variant: "danger",
            onClick: (row) => updateStatus(row.id as string, "inactive"),
            show: (row) => row.status === "active",
          },
          {
            label: "Details",
            icon: Eye,
            onClick: (row) => setDetail(row),
          },
        ]}
      />

      {/* Detail Modal */}
      {detail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={() => setDetail(null)}>
          <div className="bg-[#0f1729] border border-white/10 rounded-2xl p-6 w-full max-w-lg max-h-[80vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-medium text-white mb-1">{detail.name as string}</h3>
            <div className="flex items-center gap-2 mb-4">
              <StatusBadge status={detail.status as string} />
              <span className="text-xs text-gray-500">{detail.brand as string} {detail.model as string}</span>
            </div>

            <div className="grid grid-cols-2 gap-3 text-sm mb-4">
              <InfoItem label="Typ" value={detail.type as string} />
              <InfoItem label="Baujahr" value={detail.year as string} />
              <InfoItem label="Länge" value={detail.length_ft ? `${detail.length_ft} ft` : undefined} />
              <InfoItem label="Kabinen" value={detail.cabins as string} />
              <InfoItem label="Gäste" value={detail.guests as string} />
              <InfoItem label="Crew" value={detail.crew as string} />
              <InfoItem label="Preis/Tag" value={detail.price_per_day ? `${Number(detail.price_per_day).toLocaleString()} ${detail.currency}` : undefined} />
              <InfoItem label="Preis/Woche" value={detail.price_per_week ? `${Number(detail.price_per_week).toLocaleString()} ${detail.currency}` : undefined} />
              <InfoItem label="Region" value={detail.region as string} />
              <InfoItem label="Land" value={detail.country as string} />
              <InfoItem label="Hafen" value={detail.port as string} />
            </div>

            {typeof detail.description === "string" && detail.description && (
              <p className="text-sm text-gray-400 mb-4">{detail.description}</p>
            )}

            <button onClick={() => setDetail(null)} className="w-full px-4 py-2 rounded-lg bg-white/5 border border-white/10 text-gray-400 text-sm">
              Schließen
            </button>
          </div>
        </div>
      )}
    </>
  );
}

function InfoItem({ label, value }: { label: string; value?: string }) {
  return (
    <div>
      <div className="text-xs text-gray-500">{label}</div>
      <div className="text-gray-300">{value || "—"}</div>
    </div>
  );
}
