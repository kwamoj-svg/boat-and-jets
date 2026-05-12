"use client";

import { useState } from "react";
import AdminDataTable, { StatusBadge, DateCell, TruncatedText } from "../AdminDataTable";
import { Check, X, ExternalLink, Phone, Mail } from "lucide-react";

export default function AdminPartnersPage() {
  const [statusFilter, setStatusFilter] = useState("");
  const [detail, setDetail] = useState<Record<string, unknown> | null>(null);

  async function updateStatus(id: string, status: string) {
    await fetch("/api/admin", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ entity: "partners", id, updates: { status } }),
    });
    window.location.reload();
  }

  // Read initial status filter from URL
  if (typeof window !== "undefined" && statusFilter === "") {
    const params = new URLSearchParams(window.location.search);
    const s = params.get("status");
    if (s) {
      setTimeout(() => setStatusFilter(s), 0);
    }
  }

  return (
    <>
      <AdminDataTable
        title="Partner"
        entity="partners"
        extraParams={statusFilter ? { status: statusFilter } : {}}
        columns={[
          { key: "company_name", label: "Unternehmen", render: (v) => (
            <span className="text-white font-medium">{v as string}</span>
          )},
          { key: "company_type", label: "Typ", render: (v) => (
            <span className="text-xs text-gray-400 capitalize">{(v as string)?.replace(/_/g, " ")}</span>
          )},
          { key: "email", label: "E-Mail", render: (v) => (
            <TruncatedText text={v as string} max={25} />
          )},
          { key: "country", label: "Land" },
          { key: "status", label: "Status", render: (v) => <StatusBadge status={v as string} /> },
          { key: "created_at", label: "Registriert", render: (v) => <DateCell date={v as string} /> },
        ]}
        filters={
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-white/5 border border-white/10 rounded-lg text-white text-sm px-3 py-2 focus:outline-none focus:border-gold/30"
          >
            <option value="">Alle Status</option>
            <option value="pending">Pending</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
          </select>
        }
        actions={[
          {
            label: "Freigeben",
            icon: Check,
            variant: "success",
            onClick: (row) => updateStatus(row.id as string, "approved"),
            show: (row) => row.status !== "approved",
          },
          {
            label: "Ablehnen",
            icon: X,
            variant: "danger",
            onClick: (row) => updateStatus(row.id as string, "rejected"),
            show: (row) => row.status !== "rejected",
          },
        ]}
        onEdit={(row) => setDetail(row)}
      />

      {/* Detail Modal */}
      {detail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={() => setDetail(null)}>
          <div className="bg-[#0f1729] border border-white/10 rounded-2xl p-6 w-full max-w-lg" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-medium text-white mb-1">{detail.company_name as string}</h3>
            <div className="flex items-center gap-2 mb-4">
              <StatusBadge status={detail.status as string} />
              <span className="text-xs text-gray-500 capitalize">{(detail.company_type as string)?.replace(/_/g, " ")}</span>
            </div>

            <div className="space-y-3 text-sm">
              {typeof detail.description === "string" && detail.description && (
                <p className="text-gray-400">{detail.description}</p>
              )}
              <div className="grid grid-cols-2 gap-3">
                <InfoRow label="E-Mail" value={detail.email as string} icon={Mail} />
                <InfoRow label="Telefon" value={detail.phone as string} icon={Phone} />
                <InfoRow label="Website" value={detail.website as string} icon={ExternalLink} />
                <InfoRow label="Stadt" value={detail.city as string} />
                <InfoRow label="Land" value={detail.country as string} />
                <InfoRow label="Adresse" value={detail.address as string} />
                <InfoRow label="Steuer-ID" value={detail.tax_id as string} />
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button onClick={() => setDetail(null)} className="flex-1 px-4 py-2 rounded-lg bg-white/5 border border-white/10 text-gray-400 text-sm">
                Schließen
              </button>
              {detail.status !== "approved" && (
                <button
                  onClick={() => { updateStatus(detail.id as string, "approved"); setDetail(null); }}
                  className="flex-1 px-4 py-2 rounded-lg bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 text-sm"
                >
                  Freigeben
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function InfoRow({ label, value, icon: Icon }: { label: string; value?: string; icon?: React.ElementType }) {
  return (
    <div>
      <div className="text-xs text-gray-500 mb-0.5 flex items-center gap-1">
        {Icon && <Icon className="w-3 h-3" />}
        {label}
      </div>
      <div className="text-gray-300 text-sm">{value || "—"}</div>
    </div>
  );
}
