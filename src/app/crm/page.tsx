import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { listCrmEntries } from "@/app/actions/crm";
import { CrmWorkspace } from "./CrmWorkspace";
import { CalendarClock, Inbox, TrendingUp, Wallet } from "lucide-react";

export default async function CrmPage() {
  const entries = await listCrmEntries();

  // Broker-focused KPIs computed inline
  const now = Date.now();
  const day = 24 * 60 * 60 * 1000;
  const in7d = now + 7 * day;

  const upcomingCheckins = entries.filter((e) => {
    if (!e.charter_start) return false;
    const t = new Date(e.charter_start).getTime();
    return t >= now && t <= in7d;
  }).length;

  const openInquiries = entries.filter((e) =>
    ["interested", "contacted", "quoted", "negotiating"].includes(e.status)
  ).length;

  const pipelineValue = entries
    .filter((e) => ["quoted", "negotiating"].includes(e.status))
    .reduce((sum, e) => sum + Number(e.quoted_price || 0), 0);

  const bookedValue = entries
    .filter((e) => ["booked", "completed"].includes(e.status))
    .reduce((sum, e) => sum + Number(e.final_price || e.quoted_price || 0), 0);

  // Provision-Schätzung: 15% Standardrate auf gebuchte Charters
  const estCommission = Math.round(bookedValue * 0.15);

  return (
    <main className="min-h-screen bg-[radial-gradient(ellipse_at_top,_var(--color-navy-light)_0%,_var(--color-navy)_70%)]">
      <Navbar />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 pt-24 pb-12">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center gap-2 text-gold-light text-xs uppercase tracking-[0.2em] mb-2">
            Broker-Workspace
          </div>
          <h1 className="text-3xl sm:text-4xl font-light text-white">
            Anfragen, Angebote und Buchungen
          </h1>
          <p className="text-gray-400 text-sm mt-2 max-w-2xl">
            Ein Eintrag = eine Kundenanfrage. Pipeline, Kalender, Stammkunden — alles an einem Ort.
          </p>
        </div>

        {/* KPI tiles — broker-focused */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
          <KPI
            icon={<CalendarClock className="w-4 h-4" />}
            label="Check-in diese Woche"
            value={upcomingCheckins}
            accent={upcomingCheckins > 0}
            hint={upcomingCheckins > 0 ? "Briefings vorbereiten" : "keine Anreisen"}
          />
          <KPI
            icon={<Inbox className="w-4 h-4" />}
            label="Offene Anfragen"
            value={openInquiries}
            hint="in Bearbeitung"
          />
          <KPI
            icon={<TrendingUp className="w-4 h-4" />}
            label="Pipeline-Wert"
            value={`${pipelineValue.toLocaleString("de-DE")} €`}
            hint="ausstehende Angebote"
          />
          <KPI
            icon={<Wallet className="w-4 h-4" />}
            label="Provision (15% Schätzung)"
            value={`${estCommission.toLocaleString("de-DE")} €`}
            hint={`von ${bookedValue.toLocaleString("de-DE")} € gebucht`}
            accent={estCommission > 0}
          />
        </div>

        <CrmWorkspace entries={entries} />
      </div>

      <Footer />
    </main>
  );
}

function KPI({
  icon,
  label,
  value,
  hint,
  accent,
}: {
  icon: React.ReactNode;
  label: string;
  value: number | string;
  hint?: string;
  accent?: boolean;
}) {
  return (
    <div
      className={`px-5 py-4 rounded-2xl border backdrop-blur-sm ${
        accent
          ? "bg-gradient-to-br from-gold/15 to-gold/5 border-gold/30"
          : "bg-white/[0.04] border-white/10"
      }`}
    >
      <div
        className={`flex items-center gap-2 text-[10px] uppercase tracking-wider ${
          accent ? "text-gold-light" : "text-gray-400"
        }`}
      >
        {icon}
        {label}
      </div>
      <div className={`text-2xl font-light mt-1.5 tabular-nums ${accent ? "text-gold" : "text-white"}`}>
        {value}
      </div>
      {hint && <div className="text-[11px] text-gray-500 mt-0.5">{hint}</div>}
    </div>
  );
}
