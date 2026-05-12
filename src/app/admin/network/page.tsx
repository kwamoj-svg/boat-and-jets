"use client";

import { useState } from "react";
import AdminDataTable, { DateCell, TruncatedText } from "../AdminDataTable";
import { Check, X, Eye, Shield, Crown, Pencil } from "lucide-react";

const REGIONS = [
  "", "dubai", "monaco", "french_riviera", "greece", "croatia", "turkey",
  "italy", "sardinia", "spain", "ibiza", "mallorca", "miami",
  "caribbean", "bahamas", "maldives", "seychelles", "thailand",
];

export default function AdminNetworkPage() {
  const [regionFilter, setRegionFilter] = useState("");
  const [editing, setEditing] = useState<Record<string, unknown> | null>(null);

  async function toggleVerified(id: string, verified: boolean) {
    await fetch("/api/admin", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ entity: "yacht_network", id, updates: { verified } }),
    });
    window.location.reload();
  }

  async function deletePartner(id: string) {
    await fetch(`/api/admin?entity=yacht_network&id=${id}`, { method: "DELETE" });
    window.location.reload();
  }

  async function saveEdits(id: string, updates: Record<string, unknown>) {
    await fetch("/api/admin", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ entity: "yacht_network", id, updates }),
    });
    setEditing(null);
    window.location.reload();
  }

  return (
    <>
      <AdminDataTable
        title="Yacht Network"
        entity="network"
        extraParams={regionFilter ? { region: regionFilter } : {}}
        columns={[
          { key: "company_name", label: "Unternehmen", render: (v, row) => (
            <div className="flex items-center gap-1.5">
              <span className="text-white font-medium">{v as string}</span>
              {!!row.verified && <Shield className="w-3.5 h-3.5 text-gold" />}
              {!!row.vip_friendly && <Crown className="w-3.5 h-3.5 text-amber-400" />}
            </div>
          )},
          { key: "country", label: "Land" },
          { key: "city", label: "Stadt" },
          { key: "luxury_score", label: "Luxury", render: (v) => (
            <div className="flex items-center gap-1">
              <span className="text-gold font-medium">{v as number}</span>
              <span className="text-gray-600 text-xs">/10</span>
            </div>
          )},
          { key: "ai_quality_score", label: "AI Score", render: (v) => (
            <div className="flex items-center gap-1">
              <span className="text-cyan-400 font-medium">{v as number}</span>
              <span className="text-gray-600 text-xs">/10</span>
            </div>
          )},
          { key: "price_level", label: "Preis", render: (v) => (
            <span className="text-gold">{v as string}</span>
          )},
          { key: "categories", label: "Services", render: (v) => (
            <TruncatedText text={Array.isArray(v) ? (v as string[]).slice(0, 2).join(", ") : "—"} max={25} />
          )},
        ]}
        filters={
          <select
            value={regionFilter}
            onChange={(e) => setRegionFilter(e.target.value)}
            className="bg-white/5 border border-white/10 rounded-lg text-white text-sm px-3 py-2 focus:outline-none focus:border-gold/30"
          >
            <option value="">Alle Regionen</option>
            {REGIONS.filter(Boolean).map((r) => (
              <option key={r} value={r}>{r.charAt(0).toUpperCase() + r.slice(1).replace(/_/g, " ")}</option>
            ))}
          </select>
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
        ]}
        onEdit={(row) => setEditing(row)}
        onDelete={(row) => deletePartner(row.id as string)}
      />

      {/* Edit Modal */}
      {editing && (
        <NetworkEditModal
          partner={editing}
          onClose={() => setEditing(null)}
          onSave={saveEdits}
        />
      )}
    </>
  );
}

function NetworkEditModal({
  partner,
  onClose,
  onSave,
}: {
  partner: Record<string, unknown>;
  onClose: () => void;
  onSave: (id: string, updates: Record<string, unknown>) => void;
}) {
  const [form, setForm] = useState({
    company_name: (partner.company_name as string) || "",
    country: (partner.country as string) || "",
    city: (partner.city as string) || "",
    marina: (partner.marina as string) || "",
    website: (partner.website as string) || "",
    email: (partner.email as string) || "",
    phone: (partner.phone as string) || "",
    whatsapp: (partner.whatsapp as string) || "",
    instagram: (partner.instagram as string) || "",
    luxury_score: (partner.luxury_score as number) || 5,
    ai_quality_score: (partner.ai_quality_score as number) || 5,
    price_level: (partner.price_level as string) || "$$$",
    vip_friendly: !!partner.vip_friendly,
    verified: !!partner.verified,
    description: (partner.description as string) || "",
    fleet_size: (partner.fleet_size as number) || 0,
  });

  const [saving, setSaving] = useState(false);

  function handleSubmit() {
    setSaving(true);
    onSave(partner.id as string, form);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={onClose}>
      <div className="bg-[#0f1729] border border-white/10 rounded-2xl p-6 w-full max-w-2xl max-h-[85vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <h3 className="text-lg font-medium text-white mb-4 flex items-center gap-2">
          <Pencil className="w-4 h-4 text-gold" />
          {form.company_name} bearbeiten
        </h3>

        <div className="grid grid-cols-2 gap-4 text-sm">
          <Field label="Unternehmen" value={form.company_name} onChange={(v) => setForm({ ...form, company_name: v })} />
          <Field label="Land" value={form.country} onChange={(v) => setForm({ ...form, country: v })} />
          <Field label="Stadt" value={form.city} onChange={(v) => setForm({ ...form, city: v })} />
          <Field label="Marina" value={form.marina} onChange={(v) => setForm({ ...form, marina: v })} />
          <Field label="Website" value={form.website} onChange={(v) => setForm({ ...form, website: v })} />
          <Field label="E-Mail" value={form.email} onChange={(v) => setForm({ ...form, email: v })} />
          <Field label="Telefon" value={form.phone} onChange={(v) => setForm({ ...form, phone: v })} />
          <Field label="WhatsApp" value={form.whatsapp} onChange={(v) => setForm({ ...form, whatsapp: v })} />
          <Field label="Instagram" value={form.instagram} onChange={(v) => setForm({ ...form, instagram: v })} />
          <Field label="Preisniveau" value={form.price_level} onChange={(v) => setForm({ ...form, price_level: v })} />

          <div>
            <label className="text-xs text-gray-500 mb-1 block">Luxury Score</label>
            <input
              type="number" min={1} max={10}
              value={form.luxury_score}
              onChange={(e) => setForm({ ...form, luxury_score: parseInt(e.target.value) })}
              className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm"
            />
          </div>
          <div>
            <label className="text-xs text-gray-500 mb-1 block">AI Quality Score</label>
            <input
              type="number" min={1} max={10}
              value={form.ai_quality_score}
              onChange={(e) => setForm({ ...form, ai_quality_score: parseInt(e.target.value) })}
              className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm"
            />
          </div>
          <div>
            <label className="text-xs text-gray-500 mb-1 block">Flottengröße</label>
            <input
              type="number" min={0}
              value={form.fleet_size}
              onChange={(e) => setForm({ ...form, fleet_size: parseInt(e.target.value) })}
              className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm"
            />
          </div>
          <div className="flex items-center gap-4 pt-6">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox" checked={form.verified}
                onChange={(e) => setForm({ ...form, verified: e.target.checked })}
                className="accent-gold"
              />
              <span className="text-gray-300">Verifiziert</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox" checked={form.vip_friendly}
                onChange={(e) => setForm({ ...form, vip_friendly: e.target.checked })}
                className="accent-amber-400"
              />
              <span className="text-gray-300">VIP</span>
            </label>
          </div>
        </div>

        <div className="mt-4">
          <label className="text-xs text-gray-500 mb-1 block">Beschreibung</label>
          <textarea
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            rows={3}
            className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm resize-none"
          />
        </div>

        <div className="flex gap-3 mt-6">
          <button onClick={onClose} className="flex-1 px-4 py-2 rounded-lg bg-white/5 border border-white/10 text-gray-400 text-sm">
            Abbrechen
          </button>
          <button onClick={handleSubmit} disabled={saving} className="flex-1 px-4 py-2 rounded-lg bg-gold/20 border border-gold/30 text-gold text-sm hover:bg-gold/30 disabled:opacity-50">
            {saving ? "Speichern..." : "Speichern"}
          </button>
        </div>
      </div>
    </div>
  );
}

function Field({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div>
      <label className="text-xs text-gray-500 mb-1 block">{label}</label>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-gold/30"
      />
    </div>
  );
}
