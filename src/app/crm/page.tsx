import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { listCrmEntries, getCrmStats } from "@/app/actions/crm";
import { CrmBoard } from "./CrmBoard";
import { Briefcase, Bell, TrendingUp, CheckCircle2 } from "lucide-react";

export default async function CrmPage() {
  const [entries, stats] = await Promise.all([listCrmEntries(), getCrmStats()]);

  return (
    <main className="min-h-screen bg-[radial-gradient(ellipse_at_top,_var(--color-navy-light)_0%,_var(--color-navy)_70%)]">
      <Navbar />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 pt-24 pb-12">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl sm:text-4xl font-light text-white flex items-center gap-3">
              <Briefcase className="w-8 h-8 text-gold" />
              Mein CRM
            </h1>
            <p className="text-gray-400 text-sm mt-2">
              Verwalte deine Boots-Interessen, Anfragen und Buchungen
            </p>
          </div>
        </div>

        {/* Stats */}
        {stats && stats.total > 0 && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            <StatCard icon={<Briefcase className="w-4 h-4" />} label="Gesamt" value={stats.total} />
            <StatCard
              icon={<Bell className="w-4 h-4" />}
              label="Offene Reminder"
              value={stats.pendingReminders}
              accent={stats.pendingReminders > 0}
            />
            <StatCard
              icon={<TrendingUp className="w-4 h-4" />}
              label="Angebote (EUR)"
              value={Math.round(stats.totalQuoted).toLocaleString("de-DE")}
            />
            <StatCard
              icon={<CheckCircle2 className="w-4 h-4" />}
              label="Gebucht (EUR)"
              value={Math.round(stats.totalBooked).toLocaleString("de-DE")}
            />
          </div>
        )}

        <CrmBoard entries={entries} />

        {entries.length === 0 && (
          <div className="text-center py-16 bg-white/[0.02] border border-white/5 rounded-2xl mt-6">
            <Briefcase className="w-12 h-12 text-gray-600 mx-auto mb-4" />
            <h2 className="text-white text-xl font-light mb-2">Dein CRM ist leer</h2>
            <p className="text-gray-500 text-sm max-w-md mx-auto">
              Nutze „Neu hinzufügen" oben rechts oder füge Boote aus den Suchergebnissen hinzu —
              mit Pipeline-Status, Kontakt-Log, Angeboten und Reminder.
            </p>
            <a
              href="/"
              className="inline-block mt-6 px-5 py-2.5 bg-gold/90 hover:bg-gold text-navy text-sm font-medium rounded-xl transition-colors"
            >
              Boote suchen
            </a>
          </div>
        )}
      </div>

      <Footer />
    </main>
  );
}

function StatCard({
  icon,
  label,
  value,
  accent,
}: {
  icon: React.ReactNode;
  label: string;
  value: number | string;
  accent?: boolean;
}) {
  return (
    <div
      className={`p-4 rounded-xl border ${
        accent
          ? "bg-gold/10 border-gold/20"
          : "bg-white/[0.03] border-white/5"
      }`}
    >
      <div
        className={`flex items-center gap-2 text-xs ${
          accent ? "text-gold" : "text-gray-400"
        }`}
      >
        {icon}
        {label}
      </div>
      <div className="text-2xl font-light text-white mt-2">{value}</div>
    </div>
  );
}
