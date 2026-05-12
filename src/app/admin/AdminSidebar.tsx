"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard, Users, Building2, Ship, Globe,
  Search, Settings, Shield, Menu, X, ChevronLeft,
} from "lucide-react";
import { useState } from "react";

const NAV = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard },
  { href: "/admin/users", label: "Benutzer", icon: Users },
  { href: "/admin/partners", label: "Partner", icon: Building2 },
  { href: "/admin/boats", label: "Boote", icon: Ship },
  { href: "/admin/network", label: "Yacht Network", icon: Globe },
  { href: "/admin/searches", label: "Suchen", icon: Search },
  { href: "/admin/settings", label: "Einstellungen", icon: Settings },
];

export default function AdminSidebar() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  const isActive = (href: string) =>
    href === "/admin" ? pathname === "/admin" : pathname.startsWith(href);

  return (
    <>
      {/* Mobile toggle */}
      <button
        onClick={() => setOpen(!open)}
        className="fixed top-4 left-4 z-50 md:hidden p-2 rounded-lg bg-navy-light border border-white/10 text-white"
      >
        {open ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
      </button>

      {/* Overlay */}
      {open && (
        <div
          className="fixed inset-0 bg-black/50 z-30 md:hidden"
          onClick={() => setOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed top-0 left-0 h-full w-64 bg-[#060c18] border-r border-white/5 z-40 transform transition-transform md:translate-x-0 ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {/* Logo */}
        <div className="p-6 border-b border-white/5">
          <div className="flex items-center gap-3">
            <Shield className="w-7 h-7 text-gold" />
            <div>
              <h2 className="text-lg font-medium text-white tracking-wide">VELIQA</h2>
              <p className="text-[11px] text-gold/60 tracking-widest uppercase">Admin Console</p>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="p-4 space-y-1">
          {NAV.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              onClick={() => setOpen(false)}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all ${
                isActive(href)
                  ? "bg-gold/10 text-gold border border-gold/20"
                  : "text-gray-400 hover:text-white hover:bg-white/5"
              }`}
            >
              <Icon className="w-4.5 h-4.5" />
              {label}
            </Link>
          ))}
        </nav>

        {/* Back to site */}
        <div className="absolute bottom-6 left-0 right-0 px-4">
          <Link
            href="/"
            className="flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm text-gray-500 hover:text-white hover:bg-white/5 transition-all"
          >
            <ChevronLeft className="w-4 h-4" />
            Zurück zur Website
          </Link>
        </div>
      </aside>
    </>
  );
}
