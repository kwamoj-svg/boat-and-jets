"use client";

import { useState, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Search, ArrowRight, Sparkles } from "lucide-react";

interface SearchInputProps {
  size?: "default" | "large";
  initialValue?: string;
  autoFocus?: boolean;
}

export function SearchInput({ size = "default", initialValue = "", autoFocus = false }: SearchInputProps) {
  const [query, setQuery] = useState(initialValue);
  const [focused, setFocused] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  const handleSubmit = useCallback(() => {
    const trimmed = query.trim();
    if (!trimmed) return;
    router.push(`/search?q=${encodeURIComponent(trimmed)}`);
  }, [query, router]);

  const isLarge = size === "large";

  return (
    <div
      className={`
        relative w-full group
        ${focused ? "scale-[1.01]" : "scale-100"}
        transition-transform duration-300 ease-out
      `}
    >
      <div
        className={`
          relative flex items-center w-full rounded-2xl
          bg-white/[0.06] border
          ${focused ? "border-gold/40 shadow-[0_0_30px_rgba(200,165,90,0.08)]" : "border-white/[0.08]"}
          hover:border-white/[0.12]
          transition-all duration-300
          ${isLarge ? "px-6 py-5" : "px-4 py-3"}
        `}
        onClick={() => inputRef.current?.focus()}
      >
        <Sparkles
          className={`
            ${isLarge ? "w-5 h-5" : "w-4 h-4"}
            text-gold/60 mr-3 flex-shrink-0
          `}
        />
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
          placeholder="Describe your perfect boat experience..."
          autoFocus={autoFocus}
          className={`
            flex-1 bg-transparent outline-none
            text-white placeholder:text-gray-400
            ${isLarge ? "text-lg md:text-xl" : "text-base"}
          `}
        />
        <button
          onClick={handleSubmit}
          disabled={!query.trim()}
          className={`
            flex-shrink-0 ml-3 rounded-xl
            gold-gradient text-navy font-medium
            disabled:opacity-30 disabled:cursor-not-allowed
            hover:shadow-[0_0_20px_rgba(200,165,90,0.3)]
            active:scale-95
            transition-all duration-200
            ${isLarge ? "px-6 py-3 text-base" : "px-4 py-2 text-sm"}
          `}
        >
          <span className="hidden sm:inline mr-2">Discover</span>
          <ArrowRight className={`${isLarge ? "w-5 h-5" : "w-4 h-4"} inline`} />
        </button>
      </div>

      {focused && (
        <div className="absolute inset-0 -z-10 rounded-2xl bg-gold/[0.03] blur-xl" />
      )}
    </div>
  );
}
