"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Ship, LayoutDashboard, Plus, User, Menu, X } from "lucide-react";
import { useState } from "react";

interface PartnerSidebarProps {
  companyName: string;
  status: string;
}

const navItems = [
  { href: "/partner", label: "Übersicht", icon: LayoutDashboard },
  { href: "/partner/boats", label: "Meine Boote", icon: Ship },
  { href: "/partner/boats/new", label: "Boot hinzufügen", icon: Plus },
  { href: "/partner/profile", label: "Profil", icon: User },
];

export default function PartnerSidebar({
  companyName,
  status,
}: PartnerSidebarProps) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  const statusColors: Record<string, string> = {
    pending: "bg-yellow-500/20 text-yellow-300 border-yellow-500/30",
    approved: "bg-green-500/20 text-green-300 border-green-500/30",
    rejected: "bg-red-500/20 text-red-300 border-red-500/30",
    suspended: "bg-red-500/20 text-red-300 border-red-500/30",
  };

  const statusLabels: Record<string, string> = {
    pending: "Ausstehend",
    approved: "Verifiziert",
    rejected: "Abgelehnt",
    suspended: "Gesperrt",
  };

  return (
    <>
      {/* Mobile toggle */}
      <button
        onClick={() => setMobileOpen(!mobileOpen)}
        className="fixed top-4 left-4 z-50 md:hidden bg-navy-light border border-white/10 rounded-lg p-2 text-white"
      >
        {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
      </button>

      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-40 w-64 bg-navy-light/95 backdrop-blur-md border-r border-white/10 flex flex-col transform transition-transform md:translate-x-0 ${
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {/* Header */}
        <div className="p-6 border-b border-white/10">
          <Link href="/" className="text-lg font-light tracking-[0.2em] text-white">
            VELIQA
          </Link>
          <p className="text-xs text-gray-400 mt-1">Partner Portal</p>
          <div className="mt-3">
            <p className="text-sm text-white font-medium truncate">
              {companyName}
            </p>
            <span
              className={`inline-block mt-1 text-xs px-2 py-0.5 rounded-full border ${
                statusColors[status] || statusColors.pending
              }`}
            >
              {statusLabels[status] || status}
            </span>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4 space-y-1">
          {navItems.map((item) => {
            const isActive =
              pathname === item.href ||
              (item.href !== "/partner" && pathname.startsWith(item.href));
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMobileOpen(false)}
                className={`flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm transition ${
                  isActive
                    ? "bg-gold/10 text-gold border border-gold/20"
                    : "text-gray-300 hover:bg-white/5 hover:text-white"
                }`}
              >
                <Icon className="w-4 h-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>

        {/* Footer */}
        <div className="p-4 border-t border-white/10">
          <Link
            href="/"
            className="text-xs text-gray-500 hover:text-gray-300 transition"
          >
            Zurück zur Startseite
          </Link>
        </div>
      </aside>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-30 md:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}
    </>
  );
}
