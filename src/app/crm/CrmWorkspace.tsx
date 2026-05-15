"use client";

import { useMemo, useState, useTransition } from "react";
import {
  Calendar,
  Users,
  Euro,
  Bell,
  Phone,
  Mail,
  Building2,
  Plus,
  Search,
  Filter,
  Crown,
  Flame,
  ExternalLink,
  ChevronRight,
  Clock,
  Trash2,
  Edit3,
  MapPin,
} from "lucide-react";
import {
  type CrmEntry,
  type CrmStatus,
  updateCrmEntry,
  deleteCrmEntry,
  addToCrm,
} from "@/app/actions/crm";

type View = "pipeline" | "calendar" | "clients";

const STAGES: { key: CrmStatus; label: string; dot: string; tone: string }[] = [
  { key: "interested", label: "Neue Anfrage", dot: "bg-blue-400", tone: "border-blue-500/20" },
  { key: "contacted", label: "Erstkontakt", dot: "bg-purple-400", tone: "border-purple-500/20" },
  { key: "quoted", label: "Angebot raus", dot: "bg-gold", tone: "border-gold/30" },
  { key: "negotiating", label: "Verhandlung", dot: "bg-orange-400", tone: "border-orange-500/20" },
  { key: "booked", label: "Gebucht", dot: "bg-emerald-400", tone: "border-emerald-500/20" },
  { key: "completed", label: "Abgeschlossen", dot: "bg-green-400", tone: "border-green-500/20" },
  { key: "cancelled", label: "Verloren", dot: "bg-gray-500", tone: "border-gray-500/20" },
];

const PRIO_BADGE: Record<"low" | "medium" | "high", { label: string; cls: string }> = {
  high: { label: "Hoch", cls: "bg-red-500/15 text-red-300 border-red-500/20" },
  medium: { label: "Mittel", cls: "bg-amber-500/15 text-amber-300 border-amber-500/20" },
  low: { label: "Niedrig", cls: "bg-gray-500/15 text-gray-400 border-gray-500/20" },
};

function daysSince(iso: string): number {
  return Math.floor((Date.now() - new Date(iso).getTime()) / 86400000);
}

function clientKey(e: CrmEntry): string {
  return (e.contact_email || e.contact_name || `unknown-${e.id}`).toLowerCase().trim();
}

function clientDisplayName(e: CrmEntry): string {
  return e.contact_name || e.contact_email || "(Kein Kundenname)";
}

export function CrmWorkspace({ entries }: { entries: CrmEntry[] }) {
  const [view, setView] = useState<View>("pipeline");
  const [editing, setEditing] = useState<CrmEntry | null>(null);
  const [adding, setAdding] = useState(false);
  const [search, setSearch] = useState("");
  const [prioFilter, setPrioFilter] = useState<"all" | "low" | "medium" | "high">("all");
  const [showDueOnly, setShowDueOnly] = useState(false);

  const filtered = useMemo(() => {
    return entries.filter((e) => {
      if (prioFilter !== "all" && e.priority !== prioFilter) return false;
      if (showDueOnly) {
        const due = e.reminder_date && !e.reminder_done && new Date(e.reminder_date) <= new Date();
        if (!due) return false;
      }
      if (search.trim()) {
        const q = search.trim().toLowerCase();
        const hay = `${e.boat_name} ${e.company_name ?? ""} ${e.contact_name ?? ""} ${e.contact_email ?? ""} ${e.notes ?? ""}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [entries, prioFilter, showDueOnly, search]);

  return (
    <>
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-3 mb-5">
        {/* Tabs */}
        <div className="inline-flex items-center gap-1 p-1 rounded-xl bg-white/[0.04] border border-white/10">
          {(["pipeline", "calendar", "clients"] as View[]).map((v) => {
            const label = v === "pipeline" ? "Pipeline" : v === "calendar" ? "Kalender" : "Kunden";
            return (
              <button
                key={v}
                onClick={() => setView(v)}
                className={`px-3 py-1.5 rounded-lg text-sm transition-colors ${
                  view === v ? "bg-gold/20 text-gold" : "text-gray-400 hover:text-white"
                }`}
              >
                {label}
              </button>
            );
          })}
        </div>

        <div className="flex-1 min-w-[260px] flex flex-wrap items-center gap-2">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="w-4 h-4 text-gray-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Kunde, Boot, Anbieter, Notiz..."
              className="w-full pl-9 pr-3 py-2 text-sm rounded-lg bg-white/[0.03] border border-white/10 text-white placeholder:text-gray-600 focus:outline-none focus:border-gold/30"
            />
          </div>
          <div className="relative">
            <Filter className="w-4 h-4 text-gray-500 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <select
              value={prioFilter}
              onChange={(e) => setPrioFilter(e.target.value as typeof prioFilter)}
              className="pl-9 pr-7 py-2 text-sm rounded-lg bg-white/[0.03] border border-white/10 text-white focus:outline-none focus:border-gold/30 appearance-none"
            >
              <option value="all">Alle Prioritäten</option>
              <option value="high">Hoch</option>
              <option value="medium">Mittel</option>
              <option value="low">Niedrig</option>
            </select>
          </div>
          <label className="flex items-center gap-2 text-xs text-gray-400 px-3 py-2 rounded-lg bg-white/[0.03] border border-white/10 cursor-pointer hover:text-white">
            <input
              type="checkbox"
              checked={showDueOnly}
              onChange={(e) => setShowDueOnly(e.target.checked)}
              className="accent-gold"
            />
            Nur fällige Reminder
          </label>
        </div>

        <button
          onClick={() => setAdding(true)}
          className="inline-flex items-center gap-1.5 px-4 py-2 bg-gold/90 hover:bg-gold text-navy text-sm font-medium rounded-lg transition-colors ml-auto"
        >
          <Plus className="w-4 h-4" />
          Neue Anfrage
        </button>
      </div>

      {entries.length === 0 ? (
        <EmptyState onAdd={() => setAdding(true)} />
      ) : view === "pipeline" ? (
        <PipelineView entries={filtered} onEdit={setEditing} />
      ) : view === "calendar" ? (
        <CalendarView entries={filtered} onEdit={setEditing} />
      ) : (
        <ClientsView entries={filtered} onEdit={setEditing} />
      )}

      {editing && <EditModal entry={editing} onClose={() => setEditing(null)} />}
      {adding && <AddModal onClose={() => setAdding(false)} />}
    </>
  );
}

function EmptyState({ onAdd }: { onAdd: () => void }) {
  return (
    <div className="text-center py-16 bg-white/[0.02] border border-dashed border-white/10 rounded-2xl">
      <Users className="w-12 h-12 text-gray-600 mx-auto mb-4" />
      <h2 className="text-white text-xl font-light mb-2">Noch keine Anfragen</h2>
      <p className="text-gray-500 text-sm max-w-md mx-auto mb-6">
        Lege eine erste Kundenanfrage an oder speichere Boote aus der Suche im CRM, um sie hier zu verwalten.
      </p>
      <button
        onClick={onAdd}
        className="inline-flex items-center gap-1.5 px-5 py-2.5 bg-gold/90 hover:bg-gold text-navy text-sm font-medium rounded-xl transition-colors"
      >
        <Plus className="w-4 h-4" />
        Erste Anfrage anlegen
      </button>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────── PIPELINE */

function PipelineView({
  entries,
  onEdit,
}: {
  entries: CrmEntry[];
  onEdit: (e: CrmEntry) => void;
}) {
  const grouped = STAGES.reduce(
    (acc, s) => ({ ...acc, [s.key]: entries.filter((e) => e.status === s.key) }),
    {} as Record<CrmStatus, CrmEntry[]>
  );

  return (
    <div className="-mx-4 sm:mx-0 overflow-x-auto pb-4">
      <div className="flex gap-4 px-4 sm:px-0 min-w-min items-start">
        {STAGES.map((s) => {
          const items = grouped[s.key];
          const stageValue = items.reduce(
            (sum, e) => sum + Number(e.final_price || e.quoted_price || 0),
            0
          );
          return (
            <div
              key={s.key}
              className="w-[300px] shrink-0 flex flex-col bg-navy/40 border border-white/10 rounded-2xl shadow-[0_4px_24px_rgba(0,0,0,0.25)]"
            >
              <div className="px-4 py-3 border-b border-white/5 sticky top-0 bg-navy/60 backdrop-blur-sm rounded-t-2xl">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className={`w-2 h-2 rounded-full shrink-0 ${s.dot}`} />
                    <span className="text-white text-sm font-medium truncate">{s.label}</span>
                  </div>
                  <span className="text-xs text-gray-400 px-2 py-0.5 rounded-full bg-white/[0.06] tabular-nums shrink-0">
                    {items.length}
                  </span>
                </div>
                {stageValue > 0 && (
                  <div className="text-[11px] text-gray-500 mt-1.5 tabular-nums">
                    {stageValue.toLocaleString("de-DE")} €
                  </div>
                )}
              </div>

              <div className="p-3 space-y-2 flex-1 min-h-[120px]">
                {items.map((e) => (
                  <DealCard key={e.id} entry={e} onEdit={() => onEdit(e)} />
                ))}
                {items.length === 0 && (
                  <div className="text-center py-6 px-2 text-xs text-gray-600 italic border border-dashed border-white/5 rounded-lg">
                    Keine Anfragen
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function DealCard({ entry, onEdit }: { entry: CrmEntry; onEdit: () => void }) {
  const reminderDue =
    entry.reminder_date && !entry.reminder_done && new Date(entry.reminder_date) <= new Date();

  const daysInStage = daysSince(entry.updated_at);
  const stagnating = daysInStage >= 7;

  const clientName = clientDisplayName(entry);
  const prio = PRIO_BADGE[entry.priority] ?? PRIO_BADGE.medium;

  return (
    <div
      onClick={onEdit}
      className={`group bg-white/[0.04] hover:bg-white/[0.08] border rounded-xl p-3 cursor-pointer transition-all hover:shadow-[0_4px_16px_rgba(0,0,0,0.3)] ${
        stagnating ? "border-orange-500/30" : "border-white/10 hover:border-gold/40"
      }`}
    >
      {/* Client name + hot/VIP indicators */}
      <div className="flex items-start gap-2 mb-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            {entry.priority === "high" && (
              <Flame className="w-3.5 h-3.5 text-red-400 shrink-0" />
            )}
            <h3 className="text-white text-sm font-medium leading-tight truncate">
              {clientName}
            </h3>
          </div>
          {/* Boat (secondary) */}
          <div className="text-[11px] text-gray-500 truncate mt-0.5 flex items-center gap-1">
            <span className="opacity-60">⛵</span>
            {entry.boat_name}
          </div>
        </div>
        {reminderDue && (
          <span className="text-gold shrink-0" title="Reminder fällig">
            <Bell className="w-3.5 h-3.5" />
          </span>
        )}
      </div>

      {/* Trip facts row */}
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-2 text-[11px]">
        {entry.charter_start && (
          <span className="text-gray-300 flex items-center gap-1">
            <Calendar className="w-3 h-3 text-gold/60" />
            {new Date(entry.charter_start).toLocaleDateString("de-DE", { day: "2-digit", month: "short" })}
            {entry.charter_end &&
              ` – ${new Date(entry.charter_end).toLocaleDateString("de-DE", { day: "2-digit", month: "short" })}`}
          </span>
        )}
        {entry.guests && (
          <span className="text-gray-300 flex items-center gap-1">
            <Users className="w-3 h-3 text-gold/60" />
            {entry.guests}
          </span>
        )}
        {(entry.quoted_price || entry.final_price) && (
          <span className="text-gold-light font-medium flex items-center gap-0.5 ml-auto tabular-nums">
            <Euro className="w-3 h-3" />
            {Number(entry.final_price || entry.quoted_price).toLocaleString("de-DE")}
          </span>
        )}
      </div>

      {/* Status row */}
      <div className="flex items-center gap-1.5 mt-2.5 flex-wrap">
        <span className={`text-[10px] px-1.5 py-0.5 rounded border ${prio.cls}`}>
          {prio.label}
        </span>
        <span
          className={`text-[10px] px-1.5 py-0.5 rounded border flex items-center gap-1 ${
            stagnating
              ? "bg-orange-500/15 text-orange-300 border-orange-500/30"
              : "bg-white/[0.04] text-gray-400 border-white/10"
          }`}
          title="Tage in dieser Phase"
        >
          <Clock className="w-2.5 h-2.5" />
          {daysInStage}T
        </span>
      </div>

      {/* Next action */}
      {entry.next_action && (
        <div className="mt-2 pt-2 border-t border-white/5 text-[11px] text-gray-300 line-clamp-1 flex items-center gap-1">
          <ChevronRight className="w-3 h-3 text-gold/70 shrink-0" />
          {entry.next_action}
        </div>
      )}
    </div>
  );
}

/* ─────────────────────────────────────────────────────────── CALENDAR */

function CalendarView({
  entries,
  onEdit,
}: {
  entries: CrmEntry[];
  onEdit: (e: CrmEntry) => void;
}) {
  // Group entries with charter_start into time buckets
  const now = Date.now();
  const day = 86400000;
  const buckets: { label: string; ttlMax: number; items: CrmEntry[] }[] = [
    { label: "Überfällig (vergangene Daten)", ttlMax: 0, items: [] },
    { label: "Diese Woche", ttlMax: 7 * day, items: [] },
    { label: "Nächste 2 Wochen", ttlMax: 21 * day, items: [] },
    { label: "Diesen Monat", ttlMax: 45 * day, items: [] },
    { label: "Später", ttlMax: Infinity, items: [] },
  ];

  const withDates = entries.filter((e) => e.charter_start);
  const noDate = entries.filter((e) => !e.charter_start);

  for (const e of withDates) {
    const ts = new Date(e.charter_start!).getTime();
    const delta = ts - now;
    if (delta < 0) buckets[0].items.push(e);
    else if (delta <= 7 * day) buckets[1].items.push(e);
    else if (delta <= 21 * day) buckets[2].items.push(e);
    else if (delta <= 45 * day) buckets[3].items.push(e);
    else buckets[4].items.push(e);
  }

  // Sort within each bucket by date asc
  buckets.forEach((b) =>
    b.items.sort(
      (a, c) => new Date(a.charter_start!).getTime() - new Date(c.charter_start!).getTime()
    )
  );

  return (
    <div className="space-y-6">
      {buckets.filter((b) => b.items.length > 0).map((b) => (
        <section key={b.label}>
          <h3 className="text-xs uppercase tracking-wider text-gold-light mb-3 flex items-center gap-2">
            <Calendar className="w-3 h-3" />
            {b.label}
            <span className="text-gray-500 normal-case">· {b.items.length}</span>
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {b.items.map((e) => (
              <CalendarCard key={e.id} entry={e} onEdit={() => onEdit(e)} />
            ))}
          </div>
        </section>
      ))}

      {noDate.length > 0 && (
        <section>
          <h3 className="text-xs uppercase tracking-wider text-gray-500 mb-3">
            Ohne Datum · {noDate.length}
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {noDate.map((e) => (
              <CalendarCard key={e.id} entry={e} onEdit={() => onEdit(e)} />
            ))}
          </div>
        </section>
      )}

      {entries.length === 0 && (
        <div className="text-center py-10 text-sm text-gray-500 bg-white/[0.02] border border-white/5 rounded-xl">
          Keine Anfragen.
        </div>
      )}
    </div>
  );
}

function CalendarCard({ entry, onEdit }: { entry: CrmEntry; onEdit: () => void }) {
  const stage = STAGES.find((s) => s.key === entry.status);
  return (
    <div
      onClick={onEdit}
      className="bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 hover:border-gold/40 rounded-xl p-3.5 cursor-pointer transition-colors"
    >
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="min-w-0">
          <div className="text-white text-sm font-medium truncate">{clientDisplayName(entry)}</div>
          <div className="text-[11px] text-gray-500 truncate">{entry.boat_name}</div>
        </div>
        {stage && (
          <span className="text-[10px] flex items-center gap-1 shrink-0 px-1.5 py-0.5 rounded border border-white/10 bg-white/[0.04] text-gray-300">
            <span className={`w-1.5 h-1.5 rounded-full ${stage.dot}`} />
            {stage.label}
          </span>
        )}
      </div>
      {entry.charter_start && (
        <div className="text-sm text-gold-light font-medium flex items-center gap-1 tabular-nums">
          <Calendar className="w-3.5 h-3.5" />
          {new Date(entry.charter_start).toLocaleDateString("de-DE", {
            day: "2-digit",
            month: "short",
            year: "numeric",
          })}
          {entry.charter_end && (
            <>
              {" – "}
              {new Date(entry.charter_end).toLocaleDateString("de-DE", {
                day: "2-digit",
                month: "short",
              })}
            </>
          )}
        </div>
      )}
      <div className="flex items-center gap-3 mt-2 text-[11px] text-gray-400">
        {entry.guests && (
          <span className="flex items-center gap-1">
            <Users className="w-3 h-3" />
            {entry.guests}
          </span>
        )}
        {(entry.quoted_price || entry.final_price) && (
          <span className="flex items-center gap-0.5 text-gold-light ml-auto">
            <Euro className="w-3 h-3" />
            {Number(entry.final_price || entry.quoted_price).toLocaleString("de-DE")}
          </span>
        )}
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────── CLIENTS */

interface ClientAgg {
  key: string;
  name: string;
  email: string | null;
  phone: string | null;
  entries: CrmEntry[];
  bookings: number;
  totalSpend: number;
  lastSeen: string;
}

function ClientsView({
  entries,
  onEdit,
}: {
  entries: CrmEntry[];
  onEdit: (e: CrmEntry) => void;
}) {
  const clients = useMemo<ClientAgg[]>(() => {
    const map = new Map<string, ClientAgg>();
    for (const e of entries) {
      const k = clientKey(e);
      let agg = map.get(k);
      if (!agg) {
        agg = {
          key: k,
          name: clientDisplayName(e),
          email: e.contact_email,
          phone: e.contact_phone,
          entries: [],
          bookings: 0,
          totalSpend: 0,
          lastSeen: e.updated_at,
        };
        map.set(k, agg);
      }
      agg.entries.push(e);
      if (["booked", "completed"].includes(e.status)) {
        agg.bookings += 1;
        agg.totalSpend += Number(e.final_price || e.quoted_price || 0);
      }
      if (e.updated_at > agg.lastSeen) agg.lastSeen = e.updated_at;
      if (e.contact_email && !agg.email) agg.email = e.contact_email;
      if (e.contact_phone && !agg.phone) agg.phone = e.contact_phone;
    }
    return Array.from(map.values()).sort(
      (a, b) => b.totalSpend - a.totalSpend || b.entries.length - a.entries.length
    );
  }, [entries]);

  if (clients.length === 0) {
    return (
      <div className="text-center py-10 text-sm text-gray-500 bg-white/[0.02] border border-white/5 rounded-xl">
        Keine Kunden im aktuellen Filter.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {clients.map((c) => (
        <ClientRow key={c.key} client={c} onEdit={onEdit} />
      ))}
    </div>
  );
}

function ClientRow({ client, onEdit }: { client: ClientAgg; onEdit: (e: CrmEntry) => void }) {
  const [open, setOpen] = useState(false);
  const isVip = client.bookings >= 2 || client.totalSpend >= 20000;

  return (
    <div className="bg-white/[0.04] border border-white/10 rounded-2xl overflow-hidden">
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full px-5 py-4 flex items-center gap-4 hover:bg-white/[0.06] transition-colors text-left"
      >
        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-gold/20 to-gold/5 border border-gold/20 flex items-center justify-center text-gold-light text-sm font-medium shrink-0">
          {client.name
            .split(/\s+/)
            .slice(0, 2)
            .map((w) => w[0]?.toUpperCase())
            .join("") || "?"}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-white font-medium truncate">{client.name}</span>
            {isVip && (
              <span className="text-[10px] px-1.5 py-0.5 rounded border border-gold/30 bg-gold/10 text-gold flex items-center gap-1">
                <Crown className="w-3 h-3" />
                VIP
              </span>
            )}
            {client.bookings >= 1 && (
              <span className="text-[10px] text-gray-400">{client.bookings} Buchung{client.bookings !== 1 ? "en" : ""}</span>
            )}
          </div>
          <div className="text-[11px] text-gray-500 flex items-center gap-3 mt-0.5">
            {client.email && (
              <span className="flex items-center gap-1 truncate">
                <Mail className="w-3 h-3" />
                {client.email}
              </span>
            )}
            {client.phone && (
              <span className="flex items-center gap-1">
                <Phone className="w-3 h-3" />
                {client.phone}
              </span>
            )}
          </div>
        </div>
        <div className="text-right shrink-0">
          {client.totalSpend > 0 && (
            <div className="text-gold-light text-sm font-medium tabular-nums">
              {client.totalSpend.toLocaleString("de-DE")} €
            </div>
          )}
          <div className="text-[10px] text-gray-500 mt-0.5">
            {client.entries.length} Anfrage{client.entries.length !== 1 ? "n" : ""}
          </div>
        </div>
      </button>

      {open && (
        <div className="border-t border-white/5 px-5 py-3 space-y-1.5 bg-black/20">
          {client.entries.map((e) => {
            const stage = STAGES.find((s) => s.key === e.status);
            return (
              <button
                key={e.id}
                onClick={() => onEdit(e)}
                className="w-full text-left px-3 py-2 rounded-lg hover:bg-white/[0.04] flex items-center gap-3 text-sm transition-colors"
              >
                {stage && <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${stage.dot}`} />}
                <span className="text-white truncate flex-1">{e.boat_name}</span>
                {e.charter_start && (
                  <span className="text-[11px] text-gray-400 shrink-0">
                    {new Date(e.charter_start).toLocaleDateString("de-DE", { day: "2-digit", month: "short", year: "2-digit" })}
                  </span>
                )}
                {(e.quoted_price || e.final_price) && (
                  <span className="text-[11px] text-gold-light shrink-0 tabular-nums">
                    {Number(e.final_price || e.quoted_price).toLocaleString("de-DE")} €
                  </span>
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* ─────────────────────────────────────────────────────────── MODALS */

function EditModal({ entry, onClose }: { entry: CrmEntry; onClose: () => void }) {
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
    if (!confirm("Anfrage wirklich löschen?")) return;
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
          <div className="min-w-0">
            <h2 className="text-white text-xl font-light truncate">{clientDisplayName(entry)}</h2>
            <div className="text-xs text-gray-500 mt-1 truncate flex items-center gap-1.5">
              <span className="opacity-60">⛵</span>
              {entry.boat_name}
              <a
                href={entry.source_url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-gray-500 hover:text-gold inline-flex items-center gap-0.5 ml-1"
              >
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-white text-2xl leading-none">×</button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Field label="Phase">
            <select
              value={form.status}
              onChange={(e) => set("status", e.target.value as CrmStatus)}
              className="input"
            >
              {STAGES.map((s) => (
                <option key={s.key} value={s.key}>{s.label}</option>
              ))}
            </select>
          </Field>

          <Field label="Priorität">
            <select
              value={form.priority}
              onChange={(e) => set("priority", e.target.value as CrmEntry["priority"])}
              className="input"
            >
              <option value="high">Hoch (Hot Lead)</option>
              <option value="medium">Mittel</option>
              <option value="low">Niedrig</option>
            </select>
          </Field>

          <Field label="Kundenname">
            <input
              type="text"
              value={form.contact_name ?? ""}
              onChange={(e) => set("contact_name", e.target.value || null)}
              className="input"
              placeholder="Frau Schmidt"
            />
          </Field>

          <Field label="Firma / Quelle">
            <input
              type="text"
              value={form.company_name ?? ""}
              onChange={(e) => set("company_name", e.target.value || null)}
              className="input"
              placeholder="z.B. Hotel Adlon, Direkt"
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
              placeholder="z.B. Skipper rückbestätigen, Vertrag senden"
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
              placeholder="Briefing, Sonderwünsche, Verhandlungspunkte..."
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
    </div>
  );
}

function AddModal({ onClose }: { onClose: () => void }) {
  const [pending, startTransition] = useTransition();
  const [clientName, setClientName] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [boatName, setBoatName] = useState("");
  const [destination, setDestination] = useState("");
  const [charterStart, setCharterStart] = useState("");
  const [charterEnd, setCharterEnd] = useState("");
  const [guests, setGuests] = useState("");
  const [budget, setBudget] = useState("");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string | null>(null);

  function submit() {
    setError(null);
    if (!clientName.trim() && !contactEmail.trim()) {
      setError("Kundenname oder E-Mail ist Pflicht");
      return;
    }
    startTransition(async () => {
      const tripFacts = [
        destination && `Reviere: ${destination}`,
        charterStart && `Start: ${charterStart}${charterEnd ? ` – ${charterEnd}` : ""}`,
        guests && `Gäste: ${guests}`,
        budget && `Budget: ${budget} €`,
      ]
        .filter(Boolean)
        .join("\n");

      const res = await addToCrm({
        boat_name: boatName.trim() || `Anfrage ${clientName || contactEmail}`,
        source_url: `manual://${Date.now()}`,
        notes: [tripFacts, notes].filter(Boolean).join("\n\n") || undefined,
      });
      if (res?.error) {
        setError(res.error);
        return;
      }
      // Update contact info on the new entry — best-effort
      if (res?.id) {
        await updateCrmEntry(res.id, {
          contact_name: clientName.trim() || null,
          contact_email: contactEmail.trim() || null,
          contact_phone: contactPhone.trim() || null,
          charter_start: charterStart || null,
          charter_end: charterEnd || null,
          guests: guests ? Number(guests) : null,
          quoted_price: budget ? Number(budget) : null,
        });
      }
      onClose();
    });
  }

  return (
    <div
      className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto"
      onClick={onClose}
    >
      <div
        className="bg-navy border border-white/10 rounded-2xl max-w-xl w-full p-6 my-8"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between mb-5">
          <h2 className="text-white text-xl font-light">Neue Kundenanfrage</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white text-2xl leading-none">×</button>
        </div>

        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <Field label="Kundenname *">
              <input
                type="text"
                value={clientName}
                onChange={(e) => setClientName(e.target.value)}
                className="input"
                placeholder="Frau Schmidt"
                autoFocus
              />
            </Field>
            <Field label={<><Mail className="w-3 h-3 inline mr-1" />E-Mail</>}>
              <input
                type="email"
                value={contactEmail}
                onChange={(e) => setContactEmail(e.target.value)}
                className="input"
              />
            </Field>
            <Field label={<><Phone className="w-3 h-3 inline mr-1" />Telefon</>}>
              <input
                type="tel"
                value={contactPhone}
                onChange={(e) => setContactPhone(e.target.value)}
                className="input"
              />
            </Field>
            <Field label="Boot / Wunsch">
              <input
                type="text"
                value={boatName}
                onChange={(e) => setBoatName(e.target.value)}
                className="input"
                placeholder="Lagoon 46, Katamaran, ..."
              />
            </Field>
            <Field label={<><MapPin className="w-3 h-3 inline mr-1" />Revier</>}>
              <input
                type="text"
                value={destination}
                onChange={(e) => setDestination(e.target.value)}
                className="input"
                placeholder="Kroatien, BVI, Mallorca..."
              />
            </Field>
            <Field label={<><Users className="w-3 h-3 inline mr-1" />Gäste</>}>
              <input
                type="number"
                value={guests}
                onChange={(e) => setGuests(e.target.value)}
                className="input"
              />
            </Field>
            <Field label="Charter Start">
              <input
                type="date"
                value={charterStart}
                onChange={(e) => setCharterStart(e.target.value)}
                className="input"
              />
            </Field>
            <Field label="Charter Ende">
              <input
                type="date"
                value={charterEnd}
                onChange={(e) => setCharterEnd(e.target.value)}
                className="input"
              />
            </Field>
            <Field label="Budget €" className="md:col-span-2">
              <input
                type="number"
                value={budget}
                onChange={(e) => setBudget(e.target.value)}
                className="input"
                placeholder="z.B. 15000"
              />
            </Field>
            <Field label="Notizen" className="md:col-span-2">
              <textarea
                rows={3}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="input resize-none"
                placeholder="VIP-Wunsch, Sonderausstattung, frühere Charter..."
              />
            </Field>
          </div>
          {error && <p className="text-sm text-red-400">{error}</p>}
        </div>

        <div className="flex items-center justify-end gap-2 mt-6 pt-5 border-t border-white/5">
          <button onClick={onClose} className="px-4 py-2 text-sm text-gray-400 hover:text-white transition-colors">
            Abbrechen
          </button>
          <button
            onClick={submit}
            disabled={pending}
            className="px-5 py-2 bg-gold/90 hover:bg-gold text-navy text-sm font-medium rounded-lg transition-colors disabled:opacity-50"
          >
            {pending ? "Anlegen..." : "Anfrage anlegen"}
          </button>
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

// Re-export to keep old imports working
export { Edit3 };
