"use client";

import { useState, useTransition } from "react";
import { Bookmark, BookmarkCheck, Loader2 } from "lucide-react";
import { useT } from "@/lib/i18n/LanguageProvider";

interface Props {
  query: string;
  filters?: Record<string, unknown>;
  label?: string;
}

const LS_KEY = "veliqa:saved-searches";

interface SavedEntry {
  query: string;
  filters: Record<string, unknown>;
  label?: string;
  savedAt: string;
}

/**
 * Save the current search query (and optional filters). Tries the
 * authenticated server API first; falls back to localStorage on 401
 * so visitors can still bookmark queries without a login flow.
 */
export function SaveSearchButton({ query, filters, label }: Props) {
  const { t } = useT();
  const [pending, startTransition] = useTransition();
  const [saved, setSaved] = useState(false);

  function saveLocal() {
    try {
      const list: SavedEntry[] = JSON.parse(localStorage.getItem(LS_KEY) || "[]");
      list.unshift({ query, filters: filters ?? {}, label, savedAt: new Date().toISOString() });
      // Cap at 50 to avoid runaway storage
      localStorage.setItem(LS_KEY, JSON.stringify(list.slice(0, 50)));
    } catch {
      /* private mode / quota — silently swallow */
    }
  }

  function handleClick() {
    if (saved || pending || !query.trim()) return;
    startTransition(async () => {
      try {
        const res = await fetch("/api/saved-searches", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ query, filters: filters ?? {}, label }),
        });
        if (res.status === 401) {
          saveLocal();
        }
      } catch {
        saveLocal();
      }
      setSaved(true);
    });
  }

  const Icon = pending ? Loader2 : saved ? BookmarkCheck : Bookmark;
  return (
    <button
      onClick={handleClick}
      disabled={pending || saved}
      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
        saved
          ? "bg-emerald-500/15 border border-emerald-500/30 text-emerald-300"
          : "bg-gold/10 border border-gold/30 text-gold hover:bg-gold/20"
      }`}
    >
      <Icon className={`w-3.5 h-3.5 ${pending ? "animate-spin" : ""}`} />
      {saved ? t("search.saved") : t("search.save")}
    </button>
  );
}
