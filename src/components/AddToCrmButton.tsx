"use client";

import { useState, useTransition, useEffect } from "react";
import { Bookmark, BookmarkCheck, Loader2 } from "lucide-react";
import { addToCrm } from "@/app/actions/crm";
import type { ExtractedListing } from "@/lib/claude-ai";
import { useT } from "@/lib/i18n/LanguageProvider";

interface Props {
  listing: ExtractedListing;
  variant?: "icon" | "compact" | "full";
}

/**
 * Add-to-CRM button — works on every boat card AND boat detail page.
 *
 *  - icon    → small icon-only (top-right corner of listing cards)
 *  - compact → icon + "CRM" label (default — small badge style)
 *  - full    → larger pill with "Im CRM speichern" — used on detail pages
 */
export function AddToCrmButton({ listing, variant = "compact" }: Props) {
  const { t } = useT();
  const [pending, startTransition] = useTransition();
  const [added, setAdded] = useState(false);
  const [needsLogin, setNeedsLogin] = useState(false);

  // Reset state when listing changes (different boat)
  useEffect(() => {
    setAdded(false);
    setNeedsLogin(false);
  }, [listing.source_url]);

  function handleClick(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (added || pending) return;

    startTransition(async () => {
      const res = await addToCrm({
        boat_name: listing.name,
        source_url: listing.source_url,
        image_url: listing.image_url ?? undefined,
        boat_data: listing as unknown as Record<string, unknown>,
      });
      if (res.error) {
        if (res.error.toLowerCase().includes("auth")) {
          setNeedsLogin(true);
        }
        return;
      }
      setAdded(true);
    });
  }

  if (needsLogin) {
    return (
      <a
        href={`/login?redirect=${encodeURIComponent(typeof window !== "undefined" ? window.location.pathname : "/")}`}
        onClick={(e) => e.stopPropagation()}
        className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs hover:bg-amber-500/20 transition-colors"
      >
        <Bookmark className="w-3 h-3" />
        {t("crm.loginToSave")}
      </a>
    );
  }

  const Icon = pending ? Loader2 : added ? BookmarkCheck : Bookmark;
  const iconClass = pending ? "animate-spin" : "";

  if (variant === "icon") {
    return (
      <button
        onClick={handleClick}
        disabled={pending || added}
        title={added ? t("crm.inCrm") : t("crm.saveLong")}
        className={`p-2 rounded-full backdrop-blur-md border transition-colors ${
          added
            ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/30"
            : "bg-navy/60 text-white border-white/15 hover:bg-gold/20 hover:text-gold hover:border-gold/40"
        }`}
        aria-label={added ? t("crm.inCrm") : t("crm.saveLong")}
      >
        <Icon className={`w-4 h-4 ${iconClass}`} />
      </button>
    );
  }

  if (variant === "full") {
    return (
      <button
        onClick={handleClick}
        disabled={pending || added}
        className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-colors ${
          added
            ? "bg-emerald-500/15 text-emerald-300 border border-emerald-500/30"
            : "bg-gold/15 text-gold border border-gold/30 hover:bg-gold/25"
        }`}
        aria-label={added ? t("crm.inCrm") : t("crm.saveLong")}
      >
        <Icon className={`w-4 h-4 ${iconClass}`} />
        {added ? t("crm.savedLong") : t("crm.saveLong")}
      </button>
    );
  }

  // compact
  return (
    <button
      onClick={handleClick}
      disabled={pending || added}
      className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg backdrop-blur-md text-xs font-medium transition-colors ${
        added
          ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
          : "bg-navy/60 text-white border border-white/15 hover:bg-gold/20 hover:text-gold hover:border-gold/40"
      }`}
      aria-label={added ? t("crm.inCrm") : t("crm.saveLong")}
    >
      <Icon className={`w-3.5 h-3.5 ${iconClass}`} />
      {added ? t("crm.saved") : t("crm.save")}
    </button>
  );
}
