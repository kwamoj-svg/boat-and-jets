"use client";

import { useState, useEffect, useCallback } from "react";
import {
  BarChart3, TrendingUp, MousePointerClick, Search,
  Globe, Monitor, Smartphone, Tablet, Eye, Phone,
  Mail, ExternalLink, Compass, Ship, Building2, Clock,
  ChevronDown, RefreshCw, Users, Activity, ArrowUpRight,
  Filter,
} from "lucide-react";

interface AnalyticsData {
  period_days: number;
  total_events: number;
  unique_sessions: number;
  event_counts: Record<string, number>;
  devices: Record<string, number>;
  daily_trend: Record<string, Record<string, number>>;
  top_boats: { id: string; name: string; clicks: number }[];
  top_searches: { query: string; count: number }[];
  top_destinations: { name: string; count: number }[];
  top_pages: { url: string; count: number }[];
  top_contacts: { name: string; total: number; methods: Record<string, number> }[];
}

const PERIOD_OPTIONS = [
  { label: "7 Tage", value: 7 },
  { label: "14 Tage", value: 14 },
  { label: "30 Tage", value: 30 },
  { label: "90 Tage", value: 90 },
];

function StatCard({
  label,
  value,
  sub,
  icon: Icon,
  color = "text-gold",
  trend,
}: {
  label: string;
  value: string | number;
  sub?: string;
  icon: React.ElementType;
  color?: string;
  trend?: "up" | "down" | "neutral";
}) {
  return (
    <div className="bg-white/[0.03] rounded-xl border border-white/[0.06] p-5 hover:border-white/10 transition-colors">
      <div className="flex items-start justify-between mb-3">
        <div className={`p-2 rounded-lg bg-white/5 ${color}`}>
          <Icon className="w-5 h-5" />
        </div>
        {trend === "up" && (
          <span className="text-xs text-emerald-400 flex items-center gap-0.5">
            <ArrowUpRight className="w-3 h-3" /> Steigend
          </span>
        )}
      </div>
      <div className="text-2xl font-light text-white mb-1">
        {typeof value === "number" ? value.toLocaleString("de-DE") : value}
      </div>
      <div className="text-xs text-gray-500">{label}</div>
      {sub && <div className="text-[10px] text-gray-600 mt-0.5">{sub}</div>}
    </div>
  );
}

function ProgressBar({ value, max, color = "bg-gold" }: { value: number; max: number; color?: string }) {
  const pct = max > 0 ? Math.min((value / max) * 100, 100) : 0;
  return (
    <div className="w-full bg-white/5 rounded-full h-2 overflow-hidden">
      <div className={`h-full rounded-full ${color} transition-all duration-500`} style={{ width: `${pct}%` }} />
    </div>
  );
}

function MiniBarChart({ data, maxBars = 30 }: { data: { label: string; value: number }[]; maxBars?: number }) {
  const bars = data.slice(-maxBars);
  const maxVal = Math.max(...bars.map((d) => d.value), 1);

  return (
    <div className="flex items-end gap-[2px] h-24">
      {bars.map((bar, i) => (
        <div key={i} className="flex-1 flex flex-col items-center justify-end group relative">
          <div
            className="w-full bg-gold/40 hover:bg-gold/60 rounded-t-sm transition-colors min-h-[2px]"
            style={{ height: `${(bar.value / maxVal) * 100}%` }}
          />
          <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-navy-light border border-white/10 rounded px-2 py-0.5 text-[10px] text-white whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none z-10 transition-opacity">
            {bar.label}: {bar.value}
          </div>
        </div>
      ))}
    </div>
  );
}

const DEVICE_ICONS: Record<string, React.ElementType> = {
  desktop: Monitor,
  mobile: Smartphone,
  tablet: Tablet,
};

const EVENT_LABELS: Record<string, string> = {
  page_view: "Seitenaufrufe",
  search: "Suchen",
  boat_click: "Boot-Klicks",
  charter_click: "Charter-Klicks",
  company_click: "Firma-Klicks",
  contact_click: "Kontakt-Klicks",
  destination_click: "Ziel-Klicks",
  filter_use: "Filter genutzt",
  outbound_link: "Externe Links",
  boat_save: "Boot gespeichert",
  boat_unsave: "Boot entfernt",
  share_click: "Geteilt",
  signup: "Registrierungen",
  login: "Logins",
};

const CONTACT_ICONS: Record<string, React.ElementType> = {
  email: Mail,
  phone: Phone,
  whatsapp: Phone,
  website: ExternalLink,
};

export default function AnalyticsPage() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState(30);
  const [showPeriodMenu, setShowPeriodMenu] = useState(false);
  const [activeTab, setActiveTab] = useState<"overview" | "boats" | "searches" | "contacts">("overview");

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin?entity=analytics&days=${period}`);
      const json = await res.json();
      setData(json);
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, [period]);

  useEffect(() => { fetchData(); }, [fetchData]);

  if (loading && !data) {
    return (
      <div className="pt-8">
        <h1 className="text-2xl font-light text-white mb-8 flex items-center gap-3">
          <BarChart3 className="w-6 h-6 text-gold" /> Analytics
        </h1>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 8 }, (_, i) => (
            <div key={i} className="bg-white/[0.03] rounded-xl border border-white/[0.06] p-5 h-[120px] animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  const d = data!;
  const totalDevices = Object.values(d.devices).reduce((a, b) => a + b, 0);

  // Build daily chart data
  const sortedDays = Object.keys(d.daily_trend).sort();
  const dailyChartData = sortedDays.map((day) => ({
    label: day.slice(5), // MM-DD
    value: Object.values(d.daily_trend[day]).reduce((a, b) => a + b, 0),
  }));
  const dailyBoatClicks = sortedDays.map((day) => ({
    label: day.slice(5),
    value: d.daily_trend[day]?.boat_click || 0,
  }));
  const dailySearches = sortedDays.map((day) => ({
    label: day.slice(5),
    value: d.daily_trend[day]?.search || 0,
  }));

  return (
    <div className="pt-8 pb-12">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-light text-white flex items-center gap-3">
            <BarChart3 className="w-6 h-6 text-gold" />
            Analytics Dashboard
          </h1>
          <p className="text-sm text-gray-500 mt-1">Detailliertes Tracking aller Nutzer-Interaktionen</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={fetchData}
            disabled={loading}
            className="p-2 rounded-lg bg-white/5 text-gray-400 hover:text-white hover:bg-white/10 transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          </button>
          <div className="relative">
            <button
              onClick={() => setShowPeriodMenu(!showPeriodMenu)}
              className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-sm text-gray-300 hover:text-white transition-colors"
            >
              {PERIOD_OPTIONS.find((p) => p.value === period)?.label}
              <ChevronDown className="w-3 h-3" />
            </button>
            {showPeriodMenu && (
              <div className="absolute right-0 top-full mt-1 bg-[#0f1a2e] border border-white/10 rounded-lg shadow-xl z-20 py-1 min-w-[120px]">
                {PERIOD_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => { setPeriod(opt.value); setShowPeriodMenu(false); }}
                    className={`block w-full text-left px-3 py-2 text-sm transition-colors ${
                      period === opt.value ? "text-gold bg-gold/10" : "text-gray-400 hover:text-white hover:bg-white/5"
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="flex gap-1 mb-6 bg-white/[0.02] rounded-lg p-1 border border-white/[0.06] w-fit">
        {([
          { id: "overview", label: "Übersicht", icon: Activity },
          { id: "boats", label: "Boot-Klicks", icon: Ship },
          { id: "searches", label: "Suchen", icon: Search },
          { id: "contacts", label: "Kontakte", icon: Phone },
        ] as const).map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setActiveTab(id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm transition-all ${
              activeTab === id
                ? "bg-gold/10 text-gold border border-gold/20"
                : "text-gray-400 hover:text-white"
            }`}
          >
            <Icon className="w-4 h-4" />
            {label}
          </button>
        ))}
      </div>

      {/* ═══════ OVERVIEW TAB ═══════ */}
      {activeTab === "overview" && (
        <>
          {/* KPI Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            <StatCard label="Gesamt-Events" value={d.total_events} icon={Activity} color="text-blue-400" />
            <StatCard label="Unique Sessions" value={d.unique_sessions} icon={Users} color="text-emerald-400" />
            <StatCard
              label="Seitenaufrufe"
              value={d.event_counts.page_view || 0}
              icon={Eye}
              color="text-purple-400"
            />
            <StatCard label="Boot-Klicks" value={d.event_counts.boat_click || 0} icon={MousePointerClick} color="text-gold" />
            <StatCard label="Suchen" value={d.event_counts.search || 0} icon={Search} color="text-cyan-400" />
            <StatCard label="Kontakt-Klicks" value={d.event_counts.contact_click || 0} icon={Phone} color="text-green-400" />
            <StatCard label="Charter-Klicks" value={d.event_counts.charter_click || 0} icon={Ship} color="text-orange-400" />
            <StatCard label="Externe Links" value={d.event_counts.outbound_link || 0} icon={ExternalLink} color="text-red-400" />
          </div>

          {/* Daily Trend */}
          <div className="bg-white/[0.03] rounded-xl border border-white/[0.06] p-6 mb-6">
            <h3 className="text-white font-medium mb-4 flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-gold/60" />
              Tägliche Events
            </h3>
            {dailyChartData.length > 0 ? (
              <MiniBarChart data={dailyChartData} />
            ) : (
              <p className="text-sm text-gray-500 text-center py-8">Noch keine Daten</p>
            )}
          </div>

          <div className="grid lg:grid-cols-2 gap-6 mb-6">
            {/* Device Breakdown */}
            <div className="bg-white/[0.03] rounded-xl border border-white/[0.06] p-6">
              <h3 className="text-white font-medium mb-4 flex items-center gap-2">
                <Monitor className="w-4 h-4 text-gold/60" />
                Geräte
              </h3>
              <div className="space-y-3">
                {Object.entries(d.devices)
                  .sort(([, a], [, b]) => b - a)
                  .map(([device, count]) => {
                    const Icon = DEVICE_ICONS[device] || Monitor;
                    const pct = totalDevices > 0 ? ((count / totalDevices) * 100).toFixed(1) : "0";
                    return (
                      <div key={device} className="space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="flex items-center gap-2 text-sm text-gray-300">
                            <Icon className="w-4 h-4 text-gray-500" />
                            {device === "desktop" ? "Desktop" : device === "mobile" ? "Mobil" : "Tablet"}
                          </span>
                          <span className="text-sm text-gray-400">{count.toLocaleString("de-DE")} ({pct}%)</span>
                        </div>
                        <ProgressBar value={count} max={totalDevices} color={
                          device === "desktop" ? "bg-blue-400" : device === "mobile" ? "bg-emerald-400" : "bg-amber-400"
                        } />
                      </div>
                    );
                  })}
              </div>
            </div>

            {/* Event Type Breakdown */}
            <div className="bg-white/[0.03] rounded-xl border border-white/[0.06] p-6">
              <h3 className="text-white font-medium mb-4 flex items-center gap-2">
                <Filter className="w-4 h-4 text-gold/60" />
                Event-Typen
              </h3>
              <div className="space-y-2">
                {Object.entries(d.event_counts)
                  .filter(([, v]) => v > 0)
                  .sort(([, a], [, b]) => b - a)
                  .map(([type, count]) => (
                    <div key={type} className="flex items-center justify-between py-1">
                      <span className="text-sm text-gray-300">{EVENT_LABELS[type] || type}</span>
                      <span className="text-sm font-mono text-gray-400">{count.toLocaleString("de-DE")}</span>
                    </div>
                  ))}
              </div>
            </div>
          </div>

          <div className="grid lg:grid-cols-2 gap-6">
            {/* Top Pages */}
            <div className="bg-white/[0.03] rounded-xl border border-white/[0.06] p-6">
              <h3 className="text-white font-medium mb-4 flex items-center gap-2">
                <Eye className="w-4 h-4 text-gold/60" />
                Top Seiten
              </h3>
              {d.top_pages.length > 0 ? (
                <div className="space-y-2">
                  {d.top_pages.slice(0, 10).map((p, i) => (
                    <div key={i} className="flex items-center justify-between py-1">
                      <span className="text-sm text-gray-300 truncate mr-4 font-mono">{p.url}</span>
                      <span className="text-sm text-gray-400 flex-shrink-0">{p.count.toLocaleString("de-DE")}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-gray-600 text-center py-6">Noch keine Daten</p>
              )}
            </div>

            {/* Top Destinations */}
            <div className="bg-white/[0.03] rounded-xl border border-white/[0.06] p-6">
              <h3 className="text-white font-medium mb-4 flex items-center gap-2">
                <Compass className="w-4 h-4 text-gold/60" />
                Top Ziele
              </h3>
              {d.top_destinations.length > 0 ? (
                <div className="space-y-2">
                  {d.top_destinations.map((dest, i) => (
                    <div key={i} className="flex items-center justify-between py-1">
                      <span className="flex items-center gap-2 text-sm text-gray-300">
                        <Globe className="w-3 h-3 text-gold/40" />
                        {dest.name}
                      </span>
                      <span className="text-sm text-gray-400">{dest.count.toLocaleString("de-DE")}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-gray-600 text-center py-6">Noch keine Daten</p>
              )}
            </div>
          </div>
        </>
      )}

      {/* ═══════ BOATS TAB ═══════ */}
      {activeTab === "boats" && (
        <>
          <div className="grid lg:grid-cols-3 gap-4 mb-6">
            <StatCard label="Boot-Klicks gesamt" value={d.event_counts.boat_click || 0} icon={MousePointerClick} color="text-gold" />
            <StatCard label="Verschiedene Boote" value={d.top_boats.length} icon={Ship} color="text-cyan-400" />
            <StatCard
              label="Ø Klicks / Boot"
              value={d.top_boats.length > 0 ? Math.round((d.event_counts.boat_click || 0) / d.top_boats.length) : 0}
              icon={TrendingUp}
              color="text-emerald-400"
            />
          </div>

          {/* Daily boat clicks chart */}
          <div className="bg-white/[0.03] rounded-xl border border-white/[0.06] p-6 mb-6">
            <h3 className="text-white font-medium mb-4 flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-gold/60" />
              Boot-Klicks pro Tag
            </h3>
            {dailyBoatClicks.length > 0 ? (
              <MiniBarChart data={dailyBoatClicks} />
            ) : (
              <p className="text-sm text-gray-500 text-center py-8">Noch keine Daten</p>
            )}
          </div>

          {/* Top Boats Table */}
          <div className="bg-white/[0.03] rounded-xl border border-white/[0.06] overflow-hidden">
            <div className="p-4 border-b border-white/[0.06]">
              <h3 className="text-white font-medium flex items-center gap-2">
                <Ship className="w-4 h-4 text-gold/60" />
                Meistgeklickte Boote
              </h3>
            </div>
            {d.top_boats.length > 0 ? (
              <table className="w-full">
                <thead>
                  <tr className="border-b border-white/[0.04]">
                    <th className="text-left text-xs text-gray-500 px-4 py-3 font-medium">#</th>
                    <th className="text-left text-xs text-gray-500 px-4 py-3 font-medium">Boot</th>
                    <th className="text-left text-xs text-gray-500 px-4 py-3 font-medium">ID / Slug</th>
                    <th className="text-right text-xs text-gray-500 px-4 py-3 font-medium">Klicks</th>
                    <th className="text-right text-xs text-gray-500 px-4 py-3 font-medium">Anteil</th>
                    <th className="px-4 py-3 w-32"></th>
                  </tr>
                </thead>
                <tbody>
                  {d.top_boats.map((boat, i) => {
                    const total = d.event_counts.boat_click || 1;
                    const pct = ((boat.clicks / total) * 100).toFixed(1);
                    return (
                      <tr key={i} className="border-b border-white/[0.03] hover:bg-white/[0.02] transition-colors">
                        <td className="px-4 py-3 text-sm text-gray-500">{i + 1}</td>
                        <td className="px-4 py-3 text-sm text-white font-medium">{boat.name}</td>
                        <td className="px-4 py-3 text-xs text-gray-500 font-mono">{boat.id}</td>
                        <td className="px-4 py-3 text-sm text-gold text-right font-medium">{boat.clicks.toLocaleString("de-DE")}</td>
                        <td className="px-4 py-3 text-xs text-gray-400 text-right">{pct}%</td>
                        <td className="px-4 py-3">
                          <ProgressBar value={boat.clicks} max={d.top_boats[0]?.clicks || 1} />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            ) : (
              <div className="text-center py-12">
                <Ship className="w-8 h-8 text-gray-600 mx-auto mb-3" />
                <p className="text-sm text-gray-500">Noch keine Boot-Klicks aufgezeichnet</p>
                <p className="text-xs text-gray-600 mt-1">Klicks werden automatisch getrackt sobald Nutzer Boote anklicken</p>
              </div>
            )}
          </div>
        </>
      )}

      {/* ═══════ SEARCHES TAB ═══════ */}
      {activeTab === "searches" && (
        <>
          <div className="grid lg:grid-cols-3 gap-4 mb-6">
            <StatCard label="Suchen gesamt" value={d.event_counts.search || 0} icon={Search} color="text-cyan-400" />
            <StatCard label="Verschiedene Queries" value={d.top_searches.length} icon={Filter} color="text-purple-400" />
            <StatCard label="Filter genutzt" value={d.event_counts.filter_use || 0} icon={Filter} color="text-orange-400" />
          </div>

          {/* Daily searches chart */}
          <div className="bg-white/[0.03] rounded-xl border border-white/[0.06] p-6 mb-6">
            <h3 className="text-white font-medium mb-4 flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-gold/60" />
              Suchen pro Tag
            </h3>
            {dailySearches.length > 0 ? (
              <MiniBarChart data={dailySearches} />
            ) : (
              <p className="text-sm text-gray-500 text-center py-8">Noch keine Daten</p>
            )}
          </div>

          {/* Top Searches Table */}
          <div className="bg-white/[0.03] rounded-xl border border-white/[0.06] overflow-hidden">
            <div className="p-4 border-b border-white/[0.06]">
              <h3 className="text-white font-medium flex items-center gap-2">
                <Search className="w-4 h-4 text-gold/60" />
                Top Suchbegriffe
              </h3>
            </div>
            {d.top_searches.length > 0 ? (
              <table className="w-full">
                <thead>
                  <tr className="border-b border-white/[0.04]">
                    <th className="text-left text-xs text-gray-500 px-4 py-3 font-medium">#</th>
                    <th className="text-left text-xs text-gray-500 px-4 py-3 font-medium">Suchbegriff</th>
                    <th className="text-right text-xs text-gray-500 px-4 py-3 font-medium">Anzahl</th>
                    <th className="px-4 py-3 w-32"></th>
                  </tr>
                </thead>
                <tbody>
                  {d.top_searches.map((s, i) => (
                    <tr key={i} className="border-b border-white/[0.03] hover:bg-white/[0.02] transition-colors">
                      <td className="px-4 py-3 text-sm text-gray-500">{i + 1}</td>
                      <td className="px-4 py-3 text-sm text-white">&quot;{s.query}&quot;</td>
                      <td className="px-4 py-3 text-sm text-cyan-400 text-right font-medium">{s.count.toLocaleString("de-DE")}</td>
                      <td className="px-4 py-3">
                        <ProgressBar value={s.count} max={d.top_searches[0]?.count || 1} color="bg-cyan-400" />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div className="text-center py-12">
                <Search className="w-8 h-8 text-gray-600 mx-auto mb-3" />
                <p className="text-sm text-gray-500">Noch keine Suchen aufgezeichnet</p>
              </div>
            )}
          </div>
        </>
      )}

      {/* ═══════ CONTACTS TAB ═══════ */}
      {activeTab === "contacts" && (
        <>
          <div className="grid lg:grid-cols-3 gap-4 mb-6">
            <StatCard label="Kontakt-Klicks" value={d.event_counts.contact_click || 0} icon={Phone} color="text-green-400" />
            <StatCard label="Firmen kontaktiert" value={d.top_contacts.length} icon={Building2} color="text-blue-400" />
            <StatCard label="Externe Links" value={d.event_counts.outbound_link || 0} icon={ExternalLink} color="text-red-400" />
          </div>

          {/* Contacts Table */}
          <div className="bg-white/[0.03] rounded-xl border border-white/[0.06] overflow-hidden">
            <div className="p-4 border-b border-white/[0.06]">
              <h3 className="text-white font-medium flex items-center gap-2">
                <Building2 className="w-4 h-4 text-gold/60" />
                Meistkontaktierte Unternehmen
              </h3>
            </div>
            {d.top_contacts.length > 0 ? (
              <table className="w-full">
                <thead>
                  <tr className="border-b border-white/[0.04]">
                    <th className="text-left text-xs text-gray-500 px-4 py-3 font-medium">#</th>
                    <th className="text-left text-xs text-gray-500 px-4 py-3 font-medium">Unternehmen</th>
                    <th className="text-right text-xs text-gray-500 px-4 py-3 font-medium">Gesamt</th>
                    <th className="text-center text-xs text-gray-500 px-4 py-3 font-medium">
                      <Mail className="w-3 h-3 inline" />
                    </th>
                    <th className="text-center text-xs text-gray-500 px-4 py-3 font-medium">
                      <Phone className="w-3 h-3 inline" />
                    </th>
                    <th className="text-center text-xs text-gray-500 px-4 py-3 font-medium">
                      <ExternalLink className="w-3 h-3 inline" />
                    </th>
                    <th className="px-4 py-3 w-32"></th>
                  </tr>
                </thead>
                <tbody>
                  {d.top_contacts.map((c, i) => (
                    <tr key={i} className="border-b border-white/[0.03] hover:bg-white/[0.02] transition-colors">
                      <td className="px-4 py-3 text-sm text-gray-500">{i + 1}</td>
                      <td className="px-4 py-3 text-sm text-white font-medium">{c.name}</td>
                      <td className="px-4 py-3 text-sm text-green-400 text-right font-medium">{c.total.toLocaleString("de-DE")}</td>
                      <td className="px-4 py-3 text-xs text-gray-400 text-center">{c.methods.email || 0}</td>
                      <td className="px-4 py-3 text-xs text-gray-400 text-center">{(c.methods.phone || 0) + (c.methods.whatsapp || 0)}</td>
                      <td className="px-4 py-3 text-xs text-gray-400 text-center">{c.methods.website || 0}</td>
                      <td className="px-4 py-3">
                        <ProgressBar value={c.total} max={d.top_contacts[0]?.total || 1} color="bg-green-400" />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div className="text-center py-12">
                <Phone className="w-8 h-8 text-gray-600 mx-auto mb-3" />
                <p className="text-sm text-gray-500">Noch keine Kontakt-Klicks aufgezeichnet</p>
              </div>
            )}
          </div>
        </>
      )}

      {/* Last updated */}
      <div className="mt-8 text-center text-xs text-gray-600 flex items-center justify-center gap-2">
        <Clock className="w-3 h-3" />
        Daten der letzten {period} Tage · Aktualisiert {new Date().toLocaleTimeString("de-DE")}
      </div>
    </div>
  );
}
