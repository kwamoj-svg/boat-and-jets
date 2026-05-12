"use client";

import { useState, useOptimistic, useTransition } from "react";
import { Heart } from "lucide-react";
import { saveBoat, unsaveBoat } from "@/app/actions/user";

interface SaveBoatButtonProps {
  boatName: string;
  boatData: object;
  sourceUrl: string;
  initialSaved?: boolean;
  onLoginRequired?: () => void;
  isLoggedIn?: boolean;
}

export function SaveBoatButton({
  boatName,
  boatData,
  sourceUrl,
  initialSaved = false,
  onLoginRequired,
  isLoggedIn = true,
}: SaveBoatButtonProps) {
  const [saved, setSaved] = useState(initialSaved);
  const [optimisticSaved, setOptimisticSaved] = useOptimistic(saved);
  const [isPending, startTransition] = useTransition();

  function handleClick(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();

    if (!isLoggedIn) {
      onLoginRequired?.();
      return;
    }

    startTransition(async () => {
      setOptimisticSaved(!saved);

      if (saved) {
        const result = await unsaveBoat(sourceUrl);
        if (!result.error) {
          setSaved(false);
        } else {
          setOptimisticSaved(saved);
        }
      } else {
        const result = await saveBoat({
          boat_name: boatName,
          boat_data: boatData,
          source_url: sourceUrl,
        });
        if (!result.error) {
          setSaved(true);
        } else {
          setOptimisticSaved(saved);
        }
      }
    });
  }

  return (
    <button
      onClick={handleClick}
      disabled={isPending}
      className={`
        w-9 h-9 rounded-full flex items-center justify-center
        backdrop-blur-md transition-all duration-200
        ${
          optimisticSaved
            ? "bg-gold/20 text-gold border border-gold/30 hover:bg-gold/30"
            : "bg-navy/60 text-gray-400 border border-white/10 hover:text-gold hover:border-gold/20"
        }
        disabled:opacity-50
      `}
      title={optimisticSaved ? "Remove from saved" : "Save boat"}
      aria-label={optimisticSaved ? "Remove from saved" : "Save boat"}
    >
      <Heart
        className={`w-4 h-4 transition-transform duration-200 ${
          optimisticSaved ? "fill-current scale-110" : ""
        } ${isPending ? "animate-pulse" : ""}`}
      />
    </button>
  );
}
