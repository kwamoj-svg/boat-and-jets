"use client";

import { useState, useTransition } from "react";
import { Briefcase, Check, Plus } from "lucide-react";
import { addToCrm } from "@/app/actions/crm";
import type { ExtractedListing } from "@/lib/claude-ai";

export function AddToCrmButton({ listing }: { listing: ExtractedListing }) {
  const [pending, startTransition] = useTransition();
  const [added, setAdded] = useState(false);

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
      if (!res.error) setAdded(true);
    });
  }

  return (
    <button
      onClick={handleClick}
      disabled={pending || added}
      className={`
        flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg backdrop-blur-md text-xs font-medium
        transition-colors
        ${
          added
            ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/20"
            : "bg-navy/60 text-gray-300 hover:text-gold border border-white/10 hover:border-gold/30"
        }
      `}
      aria-label="Zum CRM hinzufügen"
    >
      {added ? (
        <>
          <Check className="w-3 h-3" />
          Im CRM
        </>
      ) : (
        <>
          {pending ? <Plus className="w-3 h-3 animate-pulse" /> : <Briefcase className="w-3 h-3" />}
          CRM
        </>
      )}
    </button>
  );
}
