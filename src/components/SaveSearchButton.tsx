"use client";

import { useState, useTransition } from "react";
import { Bookmark, BookmarkCheck, Loader2 } from "lucide-react";
import { useT } from "@/lib/i18n/LanguageProvider";

interface Props {
  query: string;
  filters?: Record<string, unknown>;
  label?: string;
}

/**
 * Save the current search query (and optional filters) to the user's
 * saved-searches list for one-click reuse.
 */
export function SaveSearchButton({ query, filters, label }: Props) {
  const { t } = useT();
  const [pending, startTransition] = useTransition();
  const [saved, setSaved] = useState(false);
  const [needsLogin, setNeedsLogin] = useState(false);

  function handleClick() {
    if (saved || pending || !query.trim()) return;
    startTransition(async () => {
      const res = await fetch("/api/saved-searches", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query, filters: filters ?? {}, label }),
      });
      if (res.status === 401) {
        setNeedsLogin(true);
        return;
      }
      if (res.ok) setSaved(true);
    });
  }

  if (needsLogin) {
    return (
      <a
        href={`/login?redirect=${encodeURIComponent(typeof window !== "undefined" ? window.location.pathname + window.location.search : "/")}`}
        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs hover:bg-amber-500/20 transition-colors"
      >
        <Bookmark className="w-3.5 h-3.5" />
        {t("crm.loginToSave")}
      </a>
    );
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
