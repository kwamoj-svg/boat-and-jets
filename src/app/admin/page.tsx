"use client";

import { useState, useEffect } from "react";
import {
  Users, Building2, Ship, Globe, Search,
  TrendingUp, Clock, Shield, Crown, AlertTriangle,
  BarChart3, Check, X, Mail, ExternalLink,
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

interface PendingPartner {
  id: string;
  company_name: string;
  company_type: string;
  email: string;
  phone: string | null;
  city: string | null;
  country: string | null;
  website: string | null;
  description: string | null;
  created_at: string;
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [pendingList, setPendingList] = useState<PendingPartner[]>([]);
  const [actionPending, setActionPending] = useState<string | null>(null);

  const loadPending = () =>
    fetch("/api/admin?entity=partners&status=pending&limit=20")
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data?.results) setPendingList(data.results as PendingPartner[]);
      })
      .catch(() => {});

  useEffect(() => {
    fetch("/api/admin?entity=stats")
      .then((r) => r.json())
      .then(setStats)
      .catch(() => {})
      .finally(() => setLoading(false));
    loadPending();
  }, []);

  async function decide(id: string, status: "approved" | "rejected") {
    setActionPending(id);
    await fetch("/api/admin", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ entity: "partners", id, updates: { status } }),
    });
    setPendingList((cur) => cur.filter((p) => p.id !== id));
    setActionPending(null);
    // Refresh stats counter
    fetch("/api/admin?entity=stats").then((r) => r.json()).then(setStats).catch(() => {});
  }

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

      {/* Pending Applications Panel */}
      {pendingList.length > 0 && (
        <div className="mb-8 bg-white/[0.03] border border-amber-500/20 rounded-2xl overflow-hidden">
          <div className="px-5 py-3 border-b border-white/5 flex items-center justify-between bg-amber-500/5">
            <h2 className="text-white text-base font-medium flex items-center gap-2">
              <Building2 className="w-4 h-4 text-amber-400" />
              Partner-Anfragen ({pendingList.length})
            </h2>
            <a
              href="/admin/partners?status=pending"
              className="text-xs text-amber-300 hover:text-amber-200 transition-colors"
            >
              Alle ansehen →
            </a>
          </div>
          <div className="divide-y divide-white/5 max-h-[480px] overflow-y-auto">
            {pendingList.map((p) => (
              <div key={p.id} className="px-5 py-4 hover:bg-white/[0.02] transition-colors">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="text-white font-medium truncate">{p.company_name}</h3>
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/5 text-gray-400 capitalize">
                        {p.company_type?.replace(/_/g, " ")}
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-500 mt-1.5">
                      <span className="flex items-center gap-1">
                        <Mail className="w-3 h-3" /> {p.email}
                      </span>
                      {p.phone && <span>{p.phone}</span>}
                      {(p.city || p.country) && (
                        <span>{[p.city, p.country].filter(Boolean).join(", ")}</span>
                      )}
                      {p.website && (
                        <a
                          href={p.website}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1 text-blue-400 hover:text-blue-300"
                        >
                          Website <ExternalLink className="w-3 h-3" />
                        </a>
                      )}
                      <span className="text-gray-600">
                        {new Date(p.created_at).toLocaleDateString("de-DE", {
                          day: "numeric", month: "short", year: "numeric",
                        })}
                      </span>
                    </div>
                    {p.description && (
                      <p className="text-xs text-gray-400 mt-2 line-clamp-2">{p.description}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <button
                      onClick={() => decide(p.id, "approved")}
                      disabled={actionPending === p.id}
                      className="px-3 py-1.5 rounded-lg bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-1.5 hover:bg-emerald-500/30 transition-colors disabled:opacity-50"
                    >
                      <Check className="w-3 h-3" />
                      Freigeben
                    </button>
                    <button
                      onClick={() => decide(p.id, "rejected")}
                      disabled={actionPending === p.id}
                      className="px-3 py-1.5 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-xs flex items-center gap-1.5 hover:bg-red-500/20 transition-colors disabled:opacity-50"
                    >
                      <X className="w-3 h-3" />
                      Ablehnen
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
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
