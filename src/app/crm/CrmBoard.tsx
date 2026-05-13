"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import {
  ExternalLink,
  Calendar,
  Euro,
  Users,
  Trash2,
  Bell,
  Edit3,
  Phone,
  Mail,
  Building2,
} from "lucide-react";
import {
  type CrmEntry,
  type CrmStatus,
  updateCrmEntry,
  deleteCrmEntry,
} from "@/app/actions/crm";

const STATUSES: { key: CrmStatus; label: string; color: string }[] = [
  { key: "interested", label: "Interessiert", color: "bg-blue-500/20 text-blue-300 border-blue-500/20" },
  { key: "contacted", label: "Kontaktiert", color: "bg-purple-500/20 text-purple-300 border-purple-500/20" },
  { key: "quoted", label: "Angebot", color: "bg-gold/20 text-gold-light border-gold/20" },
  { key: "negotiating", label: "Verhandlung", color: "bg-orange-500/20 text-orange-300 border-orange-500/20" },
  { key: "booked", label: "Gebucht", color: "bg-emerald-500/20 text-emerald-300 border-emerald-500/20" },
  { key: "completed", label: "Abgeschlossen", color: "bg-green-500/20 text-green-300 border-green-500/20" },
  { key: "cancelled", label: "Verworfen", color: "bg-gray-500/20 text-gray-400 border-gray-500/20" },
];

export function CrmBoard({ entries }: { entries: CrmEntry[] }) {
  const [view, setView] = useState<"kanban" | "list">("kanban");
  const [editing, setEditing] = useState<CrmEntry | null>(null);

  const grouped = STATUSES.reduce(
    (acc, s) => ({ ...acc, [s.key]: entries.filter((e) => e.status === s.key) }),
    {} as Record<CrmStatus, CrmEntry[]>
  );

  return (
    <>
      {/* View toggle */}
      <div className="flex items-center gap-2 mb-6">
        <button
          onClick={() => setView("kanban")}
          className={`px-4 py-2 rounded-lg text-sm transition-colors ${
            view === "kanban"
              ? "bg-gold/20 text-gold border border-gold/20"
              : "bg-white/[0.03] text-gray-400 border border-white/5 hover:text-white"
          }`}
        >
          Pipeline
        </button>
        <button
          onClick={() => setView("list")}
          className={`px-4 py-2 rounded-lg text-sm transition-colors ${
            view === "list"
              ? "bg-gold/20 text-gold border border-gold/20"
              : "bg-white/[0.03] text-gray-400 border border-white/5 hover:text-white"
          }`}
        >
          Liste
        </button>
      </div>

      {view === "kanban" ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7 gap-3 overflow-x-auto">
          {STATUSES.map((s) => (
            <div
              key={s.key}
              className="bg-white/[0.02] border border-white/5 rounded-xl p-3 min-w-[220px]"
            >
              <div className={`text-xs font-medium px-2 py-1 rounded ${s.color} inline-block mb-3`}>
                {s.label} · {grouped[s.key].length}
              </div>
              <div className="space-y-2">
                {grouped[s.key].map((entry) => (
                  <CrmCard key={entry.id} entry={entry} onEdit={() => setEditing(entry)} />
                ))}
                {grouped[s.key].length === 0 && (
                  <p className="text-xs text-gray-600 italic py-2">Keine Einträge</p>
                )}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-white/[0.02] border border-white/5 rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-white/[0.03] text-gray-400 text-xs">
              <tr>
                <th className="text-left p-3">Boot</th>
                <th className="text-left p-3">Status</th>
                <th className="text-left p-3">Kontakt</th>
                <th className="text-left p-3">Angebot</th>
                <th className="text-left p-3">Reminder</th>
                <th className="text-right p-3">Aktion</th>
              </tr>
            </thead>
            <tbody>
              {entries.map((e) => (
                <CrmRow key={e.id} entry={e} onEdit={() => setEditing(e)} />
              ))}
            </tbody>
          </table>
        </div>
      )}

      {editing && <CrmEditModal entry={editing} onClose={() => setEditing(null)} />}
    </>
  );
}

function CrmCard({ entry, onEdit }: { entry: CrmEntry; onEdit: () => void }) {
  const reminderDue =
    entry.reminder_date && !entry.reminder_done && new Date(entry.reminder_date) <= new Date();

  return (
    <div
      onClick={onEdit}
      className="bg-white/[0.03] hover:bg-white/[0.06] border border-white/5 hover:border-gold/20 rounded-lg p-3 cursor-pointer transition-colors"
    >
      <div className="flex items-start justify-between gap-2 mb-2">
        <h3 className="text-white text-sm font-medium leading-tight line-clamp-2">
          {entry.boat_name}
        </h3>
        {reminderDue && <Bell className="w-3.5 h-3.5 text-gold flex-shrink-0" />}
      </div>
      {entry.company_name && (
        <p className="text-xs text-gray-500 flex items-center gap-1 mb-1">
          <Building2 className="w-3 h-3" />
          {entry.company_name}
        </p>
      )}
      {entry.quoted_price && (
        <p className="text-xs text-gold flex items-center gap-1">
          <Euro className="w-3 h-3" />
          {Number(entry.quoted_price).toLocaleString("de-DE")} {entry.currency}
        </p>
      )}
      {entry.charter_start && (
        <p className="text-xs text-gray-400 flex items-center gap-1 mt-1">
          <Calendar className="w-3 h-3" />
          {new Date(entry.charter_start).toLocaleDateString("de-DE")}
          {entry.charter_end && ` – ${new Date(entry.charter_end).toLocaleDateString("de-DE")}`}
        </p>
      )}
    </div>
  );
}

function CrmRow({ entry, onEdit }: { entry: CrmEntry; onEdit: () => void }) {
  const status = STATUSES.find((s) => s.key === entry.status);
  const reminderDue =
    entry.reminder_date && !entry.reminder_done && new Date(entry.reminder_date) <= new Date();

  return (
    <tr className="border-t border-white/5 hover:bg-white/[0.03]">
      <td className="p-3">
        <div className="text-white font-medium">{entry.boat_name}</div>
        <a
          href={entry.source_url}
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs text-gray-500 hover:text-gold inline-flex items-center gap-1"
        >
          Quelle <ExternalLink className="w-3 h-3" />
        </a>
      </td>
      <td className="p-3">
        <span className={`text-xs px-2 py-1 rounded border ${status?.color}`}>
          {status?.label}
        </span>
      </td>
      <td className="p-3 text-xs text-gray-400">
        {entry.company_name || entry.contact_name || "—"}
      </td>
      <td className="p-3 text-xs">
        {entry.quoted_price ? (
          <span className="text-gold">
            {Number(entry.quoted_price).toLocaleString("de-DE")} {entry.currency}
          </span>
        ) : (
          <span className="text-gray-600">—</span>
        )}
      </td>
      <td className="p-3 text-xs">
        {entry.reminder_date ? (
          <span className={reminderDue ? "text-gold flex items-center gap-1" : "text-gray-400"}>
            {reminderDue && <Bell className="w-3 h-3" />}
            {new Date(entry.reminder_date).toLocaleDateString("de-DE")}
          </span>
        ) : (
          <span className="text-gray-600">—</span>
        )}
      </td>
      <td className="p-3 text-right">
        <button
          onClick={onEdit}
          className="text-gray-400 hover:text-gold transition-colors p-1"
          aria-label="Bearbeiten"
        >
          <Edit3 className="w-4 h-4" />
        </button>
      </td>
    </tr>
  );
}

function CrmEditModal({ entry, onClose }: { entry: CrmEntry; onClose: () => void }) {
  const [pending, startTransition] = useTransition();
  const [form, setForm] = useState(entry);

  function set<K extends keyof CrmEntry>(key: K, value: CrmEntry[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function save() {
    startTransition(async () => {
      await updateCrmEntry(entry.id, {
        status: form.status,
        priority: form.priority,
        contact_name: form.contact_name,
        contact_email: form.contact_email,
        contact_phone: form.contact_phone,
        company_name: form.company_name,
        charter_start: form.charter_start,
        charter_end: form.charter_end,
        guests: form.guests,
        quoted_price: form.quoted_price,
        final_price: form.final_price,
        currency: form.currency,
        notes: form.notes,
        next_action: form.next_action,
        reminder_date: form.reminder_date,
        reminder_done: form.reminder_done,
      });
      onClose();
    });
  }

  function remove() {
    if (!confirm("Eintrag wirklich löschen?")) return;
    startTransition(async () => {
      await deleteCrmEntry(entry.id);
      onClose();
    });
  }

  return (
    <div
      className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto"
      onClick={onClose}
    >
      <div
        className="bg-navy border border-white/10 rounded-2xl max-w-2xl w-full p-6 my-8"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between mb-5">
          <div>
            <h2 className="text-white text-xl font-light">{entry.boat_name}</h2>
            <a
              href={entry.source_url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-gray-500 hover:text-gold inline-flex items-center gap-1 mt-1"
            >
              Originalseite öffnen <ExternalLink className="w-3 h-3" />
            </a>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-white text-2xl leading-none">
            ×
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Field label="Status">
            <select
              value={form.status}
              onChange={(e) => set("status", e.target.value as CrmStatus)}
              className="input"
            >
              {STATUSES.map((s) => (
                <option key={s.key} value={s.key}>
                  {s.label}
                </option>
              ))}
            </select>
          </Field>

          <Field label="Priorität">
            <select
              value={form.priority}
              onChange={(e) => set("priority", e.target.value as CrmEntry["priority"])}
              className="input"
            >
              <option value="low">Niedrig</option>
              <option value="medium">Mittel</option>
              <option value="high">Hoch</option>
            </select>
          </Field>

          <Field label="Firma / Anbieter">
            <input
              type="text"
              value={form.company_name ?? ""}
              onChange={(e) => set("company_name", e.target.value || null)}
              className="input"
              placeholder="z.B. SunSail"
            />
          </Field>

          <Field label="Ansprechpartner">
            <input
              type="text"
              value={form.contact_name ?? ""}
              onChange={(e) => set("contact_name", e.target.value || null)}
              className="input"
            />
          </Field>

          <Field label={<><Mail className="w-3 h-3 inline mr-1" />E-Mail</>}>
            <input
              type="email"
              value={form.contact_email ?? ""}
              onChange={(e) => set("contact_email", e.target.value || null)}
              className="input"
            />
          </Field>

          <Field label={<><Phone className="w-3 h-3 inline mr-1" />Telefon</>}>
            <input
              type="tel"
              value={form.contact_phone ?? ""}
              onChange={(e) => set("contact_phone", e.target.value || null)}
              className="input"
            />
          </Field>

          <Field label="Charter Start">
            <input
              type="date"
              value={form.charter_start ?? ""}
              onChange={(e) => set("charter_start", e.target.value || null)}
              className="input"
            />
          </Field>

          <Field label="Charter Ende">
            <input
              type="date"
              value={form.charter_end ?? ""}
              onChange={(e) => set("charter_end", e.target.value || null)}
              className="input"
            />
          </Field>

          <Field label={<><Users className="w-3 h-3 inline mr-1" />Gäste</>}>
            <input
              type="number"
              value={form.guests ?? ""}
              onChange={(e) => set("guests", e.target.value ? Number(e.target.value) : null)}
              className="input"
            />
          </Field>

          <Field label="Währung">
            <select
              value={form.currency}
              onChange={(e) => set("currency", e.target.value)}
              className="input"
            >
              <option value="EUR">EUR</option>
              <option value="USD">USD</option>
              <option value="GBP">GBP</option>
            </select>
          </Field>

          <Field label="Angebotspreis">
            <input
              type="number"
              step="0.01"
              value={form.quoted_price ?? ""}
              onChange={(e) => set("quoted_price", e.target.value ? Number(e.target.value) : null)}
              className="input"
            />
          </Field>

          <Field label="Finaler Preis">
            <input
              type="number"
              step="0.01"
              value={form.final_price ?? ""}
              onChange={(e) => set("final_price", e.target.value ? Number(e.target.value) : null)}
              className="input"
            />
          </Field>

          <Field label="Nächste Aktion" className="md:col-span-2">
            <input
              type="text"
              value={form.next_action ?? ""}
              onChange={(e) => set("next_action", e.target.value || null)}
              className="input"
              placeholder="z.B. Angebot prüfen, Rückruf vereinbaren"
            />
          </Field>

          <Field label={<><Bell className="w-3 h-3 inline mr-1" />Reminder</>} className="md:col-span-2">
            <div className="flex items-center gap-3">
              <input
                type="datetime-local"
                value={form.reminder_date ? form.reminder_date.slice(0, 16) : ""}
                onChange={(e) => set("reminder_date", e.target.value || null)}
                className="input flex-1"
              />
              {form.reminder_date && (
                <label className="text-xs text-gray-400 flex items-center gap-1 whitespace-nowrap">
                  <input
                    type="checkbox"
                    checked={form.reminder_done}
                    onChange={(e) => set("reminder_done", e.target.checked)}
                  />
                  erledigt
                </label>
              )}
            </div>
          </Field>

          <Field label="Notizen" className="md:col-span-2">
            <textarea
              rows={4}
              value={form.notes ?? ""}
              onChange={(e) => set("notes", e.target.value || null)}
              className="input resize-none"
              placeholder="Notizen zu diesem Boot, Verhandlungen, Bedingungen..."
            />
          </Field>
        </div>

        <div className="flex items-center justify-between mt-6 pt-6 border-t border-white/5">
          <button
            onClick={remove}
            disabled={pending}
            className="text-red-400 hover:text-red-300 text-sm flex items-center gap-2 transition-colors disabled:opacity-50"
          >
            <Trash2 className="w-4 h-4" />
            Löschen
          </button>
          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm text-gray-400 hover:text-white transition-colors"
            >
              Abbrechen
            </button>
            <button
              onClick={save}
              disabled={pending}
              className="px-5 py-2 bg-gold/90 hover:bg-gold text-navy text-sm font-medium rounded-lg transition-colors disabled:opacity-50"
            >
              {pending ? "Speichern..." : "Speichern"}
            </button>
          </div>
        </div>
      </div>

      <style jsx>{`
        :global(.input) {
          width: 100%;
          padding: 0.55rem 0.75rem;
          border-radius: 0.5rem;
          background: rgba(255, 255, 255, 0.03);
          border: 1px solid rgba(255, 255, 255, 0.08);
          color: white;
          font-size: 0.875rem;
        }
        :global(.input:focus) {
          outline: none;
          border-color: rgba(200, 165, 90, 0.4);
        }
      `}</style>
    </div>
  );
}

function Field({
  label,
  children,
  className = "",
}: {
  label: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={className}>
      <label className="block text-xs text-gray-400 mb-1.5">{label}</label>
      {children}
    </div>
  );
}
