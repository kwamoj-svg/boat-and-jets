"use client";

import { useState, useEffect } from "react";
import {
  Users, Building2, Ship, Globe, Search,
  TrendingUp, Clock, Shield, Crown, AlertTriangle,
  BarChart3,
} from "lucide-react";

interface Stats {
  users: number;
  partners: number;
  pendingPartners: number;
  partnerBoats: number;
  activeBoats: number;
  networkPartners: number;
  verifiedNetwork: number;
  searches: number;
}

function StatCard({
  label,
  value,
  sub,
  icon: Icon,
  color = "text-gold",
}: {
  label: string;
  value: number;
  sub?: string;
  icon: React.ElementType;
  color?: string;
}) {
  return (
    <div className="bg-white/[0.03] rounded-xl border border-white/[0.06] p-5 hover:border-white/10 transition-colors">
      <div className="flex items-start justify-between mb-3">
        <div className={`p-2 rounded-lg bg-white/5 ${color}`}>
          <Icon className="w-5 h-5" />
        </div>
        {sub && (
          <span className="text-xs text-gray-500 bg-white/5 px-2 py-0.5 rounded-full">
            {sub}
          </span>
        )}
      </div>
      <div className="text-2xl font-light text-white mb-1">{value.toLocaleString()}</div>
      <div className="text-xs text-gray-500">{label}</div>
    </div>
  );
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/admin?entity=stats")
      .then((r) => r.json())
      .then(setStats)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="pt-8">
        <h1 className="text-2xl font-light text-white mb-8">Dashboard</h1>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 8 }, (_, i) => (
            <div key={i} className="bg-white/[0.03] rounded-xl border border-white/[0.06] p-5 h-[120px] animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  const s = stats ?? {
    users: 0, partners: 0, pendingPartners: 0, partnerBoats: 0,
    activeBoats: 0, networkPartners: 0, verifiedNetwork: 0, searches: 0,
  };

  return (
    <div className="pt-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-light text-white">Dashboard</h1>
          <p className="text-sm text-gray-500 mt-1">VELIQA Platform Overview</p>
        </div>
        <div className="flex items-center gap-2 text-xs text-gray-500">
          <Clock className="w-3.5 h-3.5" />
          {new Date().toLocaleDateString("de-DE", { day: "numeric", month: "long", year: "numeric" })}
        </div>
      </div>

      {/* Alert: Pending partners */}
      {s.pendingPartners > 0 && (
        <div className="mb-6 flex items-center gap-3 px-4 py-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 text-sm">
          <AlertTriangle className="w-4 h-4 flex-shrink-0" />
          <span>
            <strong>{s.pendingPartners}</strong> Partner warten auf Verifizierung
          </span>
          <a href="/admin/partners?status=pending" className="ml-auto text-amber-300 hover:text-white underline underline-offset-2">
            Prüfen →
          </a>
        </div>
      )}

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-10">
        <StatCard label="Benutzer" value={s.users} icon={Users} color="text-blue-400" />
        <StatCard label="Partner" value={s.partners} sub={`${s.pendingPartners} pending`} icon={Building2} color="text-emerald-400" />
        <StatCard label="Partner Boote" value={s.partnerBoats} sub={`${s.activeBoats} aktiv`} icon={Ship} color="text-cyan-400" />
        <StatCard label="Yacht Network" value={s.networkPartners} sub={`${s.verifiedNetwork} verifiziert`} icon={Globe} color="text-gold" />
        <StatCard label="Suchen (Cache)" value={s.searches} icon={Search} color="text-purple-400" />
        <StatCard label="Verifizierungsrate" value={s.networkPartners > 0 ? Math.round((s.verifiedNetwork / s.networkPartners) * 100) : 0} sub="%" icon={Shield} color="text-green-400" />
        <StatCard label="Boote pro Partner" value={s.partners > 0 ? Math.round(s.partnerBoats / s.partners) : 0} sub="∅" icon={TrendingUp} color="text-orange-400" />
        <StatCard label="VIP Network" value={s.verifiedNetwork} icon={Crown} color="text-amber-400" />
      </div>

      {/* Quick Actions */}
      <h2 className="text-lg font-light text-white mb-4">Schnellzugriff</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <QuickAction href="/admin/partners?status=pending" label="Partner verifizieren" desc="Neue Partner prüfen und freigeben" icon={Building2} />
        <QuickAction href="/admin/network" label="Network verwalten" desc="Yacht Network Partner bearbeiten" icon={Globe} />
        <QuickAction href="/admin/users" label="Benutzer verwalten" desc="Rollen zuweisen, Profile bearbeiten" icon={Users} />
        <QuickAction href="/admin/boats" label="Boote verwalten" desc="Partner-Boote prüfen und bearbeiten" icon={Ship} />
        <QuickAction href="/admin/analytics" label="Analytics" desc="Detailliertes Tracking aller Klicks & Suchen" icon={BarChart3} />
        <QuickAction href="/admin/searches" label="Such-Cache" desc="Aktuelle Suchen und Cache einsehen" icon={Search} />
        <QuickAction href="/admin/settings" label="Einstellungen" desc="Platform-Konfiguration" icon={TrendingUp} />
      </div>
    </div>
  );
}

function QuickAction({
  href, label, desc, icon: Icon,
}: {
  href: string;
  label: string;
  desc: string;
  icon: React.ElementType;
}) {
  return (
    <a
      href={href}
      className="flex items-start gap-4 p-4 rounded-xl bg-white/[0.02] border border-white/[0.06] hover:border-gold/20 hover:bg-white/[0.04] transition-all group"
    >
      <div className="p-2 rounded-lg bg-white/5 text-gray-400 group-hover:text-gold transition-colors">
        <Icon className="w-5 h-5" />
      </div>
      <div>
        <h3 className="text-sm font-medium text-white group-hover:text-gold-light transition-colors">{label}</h3>
        <p className="text-xs text-gray-500 mt-0.5">{desc}</p>
      </div>
    </a>
  );
}
