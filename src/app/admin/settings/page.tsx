"use client";

import { useState } from "react";
import {
  Settings, Database, Key, Globe, Server,
  Shield, CheckCircle, XCircle, Copy,
} from "lucide-react";

function EnvCheck({ name, exists }: { name: string; exists: boolean }) {
  return (
    <div className="flex items-center justify-between py-2 px-3 rounded-lg bg-white/[0.02] border border-white/[0.05]">
      <code className="text-xs text-gray-400 font-mono">{name}</code>
      {exists ? (
        <span className="flex items-center gap-1 text-xs text-emerald-400">
          <CheckCircle className="w-3.5 h-3.5" /> Set
        </span>
      ) : (
        <span className="flex items-center gap-1 text-xs text-red-400">
          <XCircle className="w-3.5 h-3.5" /> Missing
        </span>
      )}
    </div>
  );
}

export default function AdminSettingsPage() {
  const [copied, setCopied] = useState(false);

  // These values are checked client-side via an API call
  const [envStatus, setEnvStatus] = useState<Record<string, boolean> | null>(null);

  return (
    <div className="pt-8">
      <h1 className="text-2xl font-light text-white mb-2">Einstellungen</h1>
      <p className="text-sm text-gray-500 mb-8">Platform-Konfiguration und System-Status</p>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Platform Info */}
        <div className="bg-white/[0.03] rounded-xl border border-white/[0.06] p-6">
          <h3 className="text-sm font-medium text-white mb-4 flex items-center gap-2">
            <Server className="w-4 h-4 text-gold" />
            Platform
          </h3>
          <div className="space-y-3 text-sm">
            <InfoRow label="Version" value="1.0.0" />
            <InfoRow label="Framework" value="Next.js 16 (Turbopack)" />
            <InfoRow label="Database" value="Supabase (PostgreSQL)" />
            <InfoRow label="AI Model" value="Claude Haiku 4.5" />
            <InfoRow label="Hosting" value="Render" />
            <InfoRow label="Domain" value="veliqa.life" />
          </div>
        </div>

        {/* Admin Access */}
        <div className="bg-white/[0.03] rounded-xl border border-white/[0.06] p-6">
          <h3 className="text-sm font-medium text-white mb-4 flex items-center gap-2">
            <Shield className="w-4 h-4 text-gold" />
            Admin-Zugang
          </h3>
          <div className="space-y-3 text-sm text-gray-400">
            <p>Admin-Zugang erfordert:</p>
            <ul className="list-disc list-inside space-y-1 text-gray-500">
              <li>Supabase Auth Login</li>
              <li><code className="text-xs bg-white/5 px-1 rounded">role = &apos;admin&apos;</code> in <code className="text-xs bg-white/5 px-1 rounded">profiles</code> Tabelle</li>
              <li>Oder: <code className="text-xs bg-white/5 px-1 rounded">ADMIN_SECRET</code> Env-Variable (für API/Scripts)</li>
            </ul>
            <div className="mt-4 p-3 rounded-lg bg-white/[0.03] border border-white/[0.05]">
              <p className="text-xs text-gray-500 mb-2">Um dich als Admin zu setzen, führe in Supabase SQL aus:</p>
              <div className="flex items-center gap-2">
                <code className="text-xs text-gold font-mono flex-1 truncate">
                  UPDATE profiles SET role = &apos;admin&apos; WHERE id = &apos;DEINE_USER_ID&apos;;
                </code>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText("UPDATE profiles SET role = 'admin' WHERE id = 'DEINE_USER_ID';");
                    setCopied(true);
                    setTimeout(() => setCopied(false), 2000);
                  }}
                  className="p-1.5 rounded hover:bg-white/10 text-gray-500"
                >
                  {copied ? <CheckCircle className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* API Endpoints */}
        <div className="bg-white/[0.03] rounded-xl border border-white/[0.06] p-6">
          <h3 className="text-sm font-medium text-white mb-4 flex items-center gap-2">
            <Globe className="w-4 h-4 text-gold" />
            API Endpoints
          </h3>
          <div className="space-y-2 text-sm font-mono">
            <EndpointRow method="GET" path="/api/search" desc="Boat search" />
            <EndpointRow method="POST" path="/api/concierge" desc="AI Concierge" />
            <EndpointRow method="GET" path="/api/network" desc="Yacht Network" />
            <EndpointRow method="POST" path="/api/network" desc="Seed Network" />
            <EndpointRow method="GET" path="/api/admin" desc="Admin data" />
            <EndpointRow method="PATCH" path="/api/admin" desc="Admin update" />
            <EndpointRow method="DELETE" path="/api/admin" desc="Admin delete" />
          </div>
        </div>

        {/* Quick Links */}
        <div className="bg-white/[0.03] rounded-xl border border-white/[0.06] p-6">
          <h3 className="text-sm font-medium text-white mb-4 flex items-center gap-2">
            <Database className="w-4 h-4 text-gold" />
            Externe Tools
          </h3>
          <div className="space-y-2">
            <ExternalLink href="https://supabase.com/dashboard" label="Supabase Dashboard" desc="Datenbank, Auth, Storage" />
            <ExternalLink href="https://dashboard.render.com" label="Render Dashboard" desc="Hosting, Deploys, Logs" />
            <ExternalLink href="https://console.anthropic.com" label="Anthropic Console" desc="API Keys, Usage" />
            <ExternalLink href="https://github.com/kwamoj-svg/boat-and-jets" label="GitHub Repo" desc="Source Code" />
          </div>
        </div>
      </div>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-gray-500">{label}</span>
      <span className="text-gray-300">{value}</span>
    </div>
  );
}

function EndpointRow({ method, path, desc }: { method: string; path: string; desc: string }) {
  const colors: Record<string, string> = {
    GET: "text-emerald-400",
    POST: "text-blue-400",
    PATCH: "text-amber-400",
    DELETE: "text-red-400",
  };
  return (
    <div className="flex items-center gap-3 py-1.5">
      <span className={`text-xs w-12 ${colors[method] || "text-gray-400"}`}>{method}</span>
      <span className="text-xs text-gray-300 flex-1">{path}</span>
      <span className="text-xs text-gray-600">{desc}</span>
    </div>
  );
}

function ExternalLink({ href, label, desc }: { href: string; label: string; desc: string }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="flex items-center justify-between px-3 py-2.5 rounded-lg bg-white/[0.02] border border-white/[0.05] hover:border-gold/20 hover:bg-white/[0.04] transition-all group"
    >
      <div>
        <div className="text-sm text-white group-hover:text-gold-light transition-colors">{label}</div>
        <div className="text-xs text-gray-500">{desc}</div>
      </div>
      <Globe className="w-4 h-4 text-gray-600 group-hover:text-gold/60" />
    </a>
  );
}
