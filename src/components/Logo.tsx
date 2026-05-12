"use client";

import Link from "next/link";

export function Logo({ size = "default" }: { size?: "small" | "default" | "large" }) {
  const textSizes = {
    small: "text-lg",
    default: "text-2xl",
    large: "text-4xl md:text-5xl",
  };

  return (
    <Link href="/" className="group inline-flex items-center gap-3">
      <div className="relative">
        <svg
          viewBox="0 0 40 40"
          className={size === "large" ? "w-12 h-12" : size === "small" ? "w-6 h-6" : "w-8 h-8"}
          fill="none"
        >
          <path
            d="M20 4 L36 32 L4 32 Z"
            stroke="var(--color-gold)"
            strokeWidth="1.5"
            fill="none"
            className="group-hover:fill-[var(--color-gold)] group-hover:fill-opacity-10 transition-all duration-500"
          />
          <path
            d="M12 28 Q20 12 28 28"
            stroke="var(--color-gold)"
            strokeWidth="1.5"
            fill="none"
          />
          <line x1="20" y1="16" x2="20" y2="28" stroke="var(--color-gold)" strokeWidth="1" />
        </svg>
      </div>
      <div className={`${textSizes[size]} tracking-[0.25em] font-light`}>
        <span className="text-white">VELIQA</span>
      </div>
    </Link>
  );
}
