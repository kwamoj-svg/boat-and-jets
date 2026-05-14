import Link from "next/link";
import { redirect } from "next/navigation";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { createClient } from "@/lib/supabase/server";
import {
  ExternalLink, MapPin, Tag, TrendingUp, AlertCircle,
  Phone, Mail, Globe, MessageCircle, Briefcase, Users, Hash,
} from "lucide-react";

interface BrokerLead {
  id: string;
  intent: string;
  source_platform: string;
  source_url: string;
  brand: string | null;
  model: string | null;
  year: number | null;
  length_m: number | null;
  asking_price: number | null;
  currency: string;
  location: string | null;
  country: string | null;
  poster_handle: string | null;
  contact_phone: string | null;
  contact_email: string | null;
  raw_text: string | null;
  quality_score: number | null;
  quality_reasons: string[] | null;
  status: string;
  created_at: string;
}

function platformIcon(p: string) {
  if (p === "instagram") return <Hash className="w-4 h-4 text-pink-400" />;
  if (p === "facebook") return <Users className="w-4 h-4 text-blue-400" />;
  if (p === "linkedin") return <Briefcase className="w-4 h-4 text-sky-400" />;
  if (p === "twitter") return <MessageCircle className="w-4 h-4 text-blue-300" />;
  if (p === "reddit") return <MessageCircle className="w-4 h-4 text-orange-400" />;
  if (p === "kleinanzeigen") return <Tag className="w-4 h-4 text-emerald-400" />;
  return <Globe className="w-4 h-4 text-gray-400" />;
}

interface AnalyticsEventRow {
  id: string;
  entity_id: string | null;
  entity_name: string | null;
  country: string | null;
  properties: Record<string, unknown> | null;
  created_at: string;
}

export default async function BrokerLeadsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?redirect=/broker/leads");

  // Broker leads are stored in analytics_events with event_type='broker_lead'
  // (dedicated broker_leads table isn't created — fallback storage works fine).
  const { data: rows } = await supabase
    .from("analytics_events")
    .select("id, entity_id, entity_name, country, properties, created_at")
    .eq("event_type", "broker_lead")
    .order("created_at", { ascending: false })
    .limit(100);

  const safeLeads: BrokerLead[] = ((rows as AnalyticsEventRow[] | null) ?? []).map((r) => {
    const p = r.properties || {};
    return {
      id: r.id,
      intent: String(p.intent || "sell"),
      source_platform: String(p.source_platform || "web"),
      source_url: String(p.source_url || ""),
      brand: (p.brand as string | null) ?? null,
      model: (p.model as string | null) ?? null,
      year: (p.year as number | null) ?? null,
      length_m: (p.length_m as number | null) ?? null,
      asking_price: (p.asking_price as number | null) ?? null,
      currency: String(p.currency || "EUR"),
      location: (p.location as string | null) ?? null,
      country: r.country,
      poster_handle: (p.poster_handle as string | null) ?? null,
      contact_phone: (p.contact_phone as string | null) ?? null,
      contact_email: (p.contact_email as string | null) ?? null,
      raw_text: (p.raw_text as string | null) ?? null,
      quality_score: (p.quality_score as number | null) ?? null,
      quality_reasons: (p.quality_reasons as string[] | null) ?? null,
      status: String(p.status || "new"),
      created_at: r.created_at,
    };
  });

  // Stats
  const byPlatform = safeLeads.reduce<Record<string, number>>((acc, l) => {
    acc[l.source_platform] = (acc[l.source_platform] || 0) + 1;
    return acc;
  }, {});
  const sellLeads = safeLeads.filter((l) => l.intent === "sell").length;
  const buyLeads = safeLeads.filter((l) => l.intent === "buy").length;
  const charterLeads = safeLeads.filter((l) => l.intent === "charter").length;

  return (
    <main className="min-h-screen bg-[radial-gradient(ellipse_at_top,_var(--color-navy-light)_0%,_var(--color-navy)_70%)]">
      <Navbar />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 pt-24 pb-12">
        <div className="flex items-end justify-between mb-8">
          <div>
            <h1 className="text-3xl font-light text-white flex items-center gap-3">
              <TrendingUp className="w-7 h-7 text-gold" />
              Broker Leads
            </h1>
            <p className="text-sm text-gray-500 mt-2">
              Frische Verkaufs- &amp; Kaufabsichten aus Social Media, Foren und Marktplätzen.
            </p>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8">
          <Stat label="Gesamt" value={safeLeads.length} accent="gold" />
          <Stat label="Verkauf" value={sellLeads} accent="emerald" />
          <Stat label="Kaufinteresse" value={buyLeads} accent="cyan" />
          <Stat label="Charter-Anfragen" value={charterLeads} accent="purple" />
        </div>

        {/* Platform breakdown */}
        {Object.keys(byPlatform).length > 0 && (
          <div className="flex flex-wrap gap-2 mb-6">
            {Object.entries(byPlatform)
              .sort((a, b) => b[1] - a[1])
              .map(([p, n]) => (
                <span
                  key={p}
                  className="px-3 py-1 rounded-full bg-white/5 border border-white/10 text-xs text-gray-300 flex items-center gap-1.5 capitalize"
                >
                  {platformIcon(p)}
                  {p} · {n}
                </span>
              ))}
          </div>
        )}

        {/* Leads list */}
        {safeLeads.length === 0 ? (
          <div className="text-center py-20 bg-white/[0.02] border border-white/5 rounded-2xl">
            <AlertCircle className="w-12 h-12 text-gray-600 mx-auto mb-4" />
            <h2 className="text-white text-xl mb-2">Noch keine Leads</h2>
            <p className="text-gray-500 text-sm max-w-md mx-auto">
              Der Broker-Agent sucht stündlich auf Instagram, Facebook, LinkedIn,
              Reddit, Kleinanzeigen und Foren nach Verkaufs-/Kaufabsichten.
              Erste Ergebnisse erscheinen nach dem ersten Cron-Lauf.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {safeLeads.map((lead) => (
              <LeadRow key={lead.id} lead={lead} />
            ))}
          </div>
        )}
      </div>

      <Footer />
    </main>
  );
}

function Stat({
  label,
  value,
  accent,
}: {
  label: string;
  value: number;
  accent: "gold" | "emerald" | "cyan" | "purple";
}) {
  const color = {
    gold: "text-gold border-gold/20 bg-gold/5",
    emerald: "text-emerald-300 border-emerald-500/20 bg-emerald-500/5",
    cyan: "text-cyan-300 border-cyan-500/20 bg-cyan-500/5",
    purple: "text-purple-300 border-purple-500/20 bg-purple-500/5",
  }[accent];
  return (
    <div className={`p-4 rounded-xl border ${color}`}>
      <div className="text-xs uppercase tracking-wider opacity-70 mb-1">{label}</div>
      <div className="text-2xl font-light">{value}</div>
    </div>
  );
}

function LeadRow({ lead }: { lead: BrokerLead }) {
  const score = Math.round((lead.quality_score || 0) * 100);
  const intentColor =
    lead.intent === "sell"
      ? "bg-emerald-500/15 text-emerald-300 border-emerald-500/30"
      : lead.intent === "buy"
      ? "bg-cyan-500/15 text-cyan-300 border-cyan-500/30"
      : "bg-purple-500/15 text-purple-300 border-purple-500/30";

  return (
    <div className="glass rounded-xl p-4 border border-white/5 hover:border-gold/20 transition-colors">
      <div className="flex items-start justify-between gap-4 mb-2">
        <div className="flex items-center gap-2 flex-wrap">
          {platformIcon(lead.source_platform)}
          <span className={`text-[10px] px-2 py-0.5 rounded-full border ${intentColor} font-medium capitalize`}>
            {lead.intent}
          </span>
          {lead.brand && (
            <span className="text-white font-medium">
              {lead.brand} {lead.model || ""}
            </span>
          )}
          {lead.year && <span className="text-gray-500 text-sm">{lead.year}</span>}
        </div>
        <div className="flex items-center gap-3 flex-shrink-0">
          <span
            className={`text-xs px-2 py-1 rounded-md ${
              score >= 80
                ? "bg-emerald-500/20 text-emerald-300"
                : score >= 60
                ? "bg-gold/20 text-gold"
                : "bg-white/5 text-gray-400"
            }`}
          >
            {score}% Qualität
          </span>
        </div>
      </div>

      <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-500 mb-2">
        {lead.location && (
          <span className="flex items-center gap-1">
            <MapPin className="w-3 h-3" />
            {lead.location}{lead.country && `, ${lead.country}`}
          </span>
        )}
        {lead.length_m && <span>{Math.round(lead.length_m)}m</span>}
        {lead.asking_price && (
          <span className="text-gold flex items-center gap-1">
            <Tag className="w-3 h-3" />
            {lead.currency === "USD" ? "$" : lead.currency === "GBP" ? "£" : "€"}
            {Math.round(lead.asking_price).toLocaleString("de-DE")}
          </span>
        )}
        {lead.poster_handle && (
          <span className="text-blue-400">{lead.poster_handle}</span>
        )}
        <span className="text-gray-600">
          {new Date(lead.created_at).toLocaleDateString("de-DE")}
        </span>
      </div>

      {lead.raw_text && (
        <p className="text-xs text-gray-400 line-clamp-2 mb-3">{lead.raw_text}</p>
      )}

      <div className="flex items-center gap-2 flex-wrap">
        <a
          href={lead.source_url}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gold/15 border border-gold/30 text-gold text-xs hover:bg-gold/25 transition-colors"
        >
          Originalpost öffnen
          <ExternalLink className="w-3 h-3" />
        </a>
        {lead.contact_phone && (
          <a
            href={`tel:${lead.contact_phone}`}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-gray-300 text-xs hover:bg-white/10 transition-colors"
          >
            <Phone className="w-3 h-3" />
            {lead.contact_phone}
          </a>
        )}
        {lead.contact_email && (
          <a
            href={`mailto:${lead.contact_email}`}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-gray-300 text-xs hover:bg-white/10 transition-colors"
          >
            <Mail className="w-3 h-3" />
            {lead.contact_email}
          </a>
        )}
        <Link
          href="/crm"
          className="ml-auto inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-gray-300 text-xs hover:bg-gold/15 hover:text-gold transition-colors"
        >
          Zum CRM
        </Link>
      </div>
    </div>
  );
}
