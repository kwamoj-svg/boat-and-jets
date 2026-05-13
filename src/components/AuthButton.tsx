"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { User, LogOut, Heart, Bell, Settings, Building2 } from "lucide-react";
import type { User as SupabaseUser } from "@supabase/supabase-js";

export function AuthButton() {
  const [user, setUser] = useState<SupabaseUser | null>(null);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data }) => {
      setUser(data.user);
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  // Close dropdown on outside click
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest("[data-auth-menu]")) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  if (loading) {
    return <div className="w-8 h-8 rounded-full bg-white/5 animate-pulse" />;
  }

  if (!user) {
    return (
      <Link
        href="/login"
        className="text-sm text-gray-400 hover:text-white transition-colors flex items-center gap-1.5"
      >
        <User className="w-4 h-4" />
        <span className="hidden sm:inline">Anmelden</span>
      </Link>
    );
  }

  const name = user.user_metadata?.full_name || user.email?.split("@")[0] || "User";
  const avatar = user.user_metadata?.avatar_url;
  const initial = name.charAt(0).toUpperCase();

  return (
    <div className="relative" data-auth-menu>
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 text-sm text-gray-300 hover:text-white transition-colors"
      >
        {avatar ? (
          <img src={avatar} alt="" className="w-7 h-7 rounded-full border border-white/20" />
        ) : (
          <div className="w-7 h-7 rounded-full bg-gold/20 border border-gold/30 flex items-center justify-center text-gold text-xs font-medium">
            {initial}
          </div>
        )}
        <span className="hidden sm:inline max-w-[100px] truncate">{name}</span>
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-56 bg-[#0f1a2e]/95 backdrop-blur-xl border border-white/10 rounded-xl shadow-2xl py-2 animate-fade-in z-50">
          <div className="px-4 py-2 border-b border-white/5">
            <p className="text-sm text-white font-medium truncate">{name}</p>
            <p className="text-xs text-gray-500 truncate">{user.email}</p>
          </div>

          <Link
            href="/dashboard"
            onClick={() => setOpen(false)}
            className="flex items-center gap-3 px-4 py-2.5 text-sm text-gray-300 hover:text-white hover:bg-white/5 transition-colors"
          >
            <Heart className="w-4 h-4" />
            Mein Dashboard
          </Link>
          <Link
            href="/profile"
            onClick={() => setOpen(false)}
            className="flex items-center gap-3 px-4 py-2.5 text-sm text-gray-300 hover:text-white hover:bg-white/5 transition-colors"
          >
            <Bell className="w-4 h-4" />
            Gespeicherte Boote
          </Link>
          <Link
            href="/partner"
            onClick={() => setOpen(false)}
            className="flex items-center gap-3 px-4 py-2.5 text-sm text-gray-300 hover:text-white hover:bg-white/5 transition-colors"
          >
            <Building2 className="w-4 h-4" />
            Partner-Portal
          </Link>

          <div className="border-t border-white/5 mt-1 pt-1">
            <form action="/api/auth/signout" method="POST">
              <button
                type="button"
                onClick={async () => {
                  const supabase = createClient();
                  await supabase.auth.signOut();
                  window.location.href = "/";
                }}
                className="flex items-center gap-3 px-4 py-2.5 text-sm text-gray-400 hover:text-red-400 hover:bg-white/5 transition-colors w-full text-left"
              >
                <LogOut className="w-4 h-4" />
                Abmelden
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
