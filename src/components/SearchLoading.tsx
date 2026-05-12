"use client";

import { Sparkles, Search, BarChart3, Ship } from "lucide-react";

const steps = [
  { icon: <Search className="w-5 h-5" />, label: "Analyzing your request..." },
  { icon: <Ship className="w-5 h-5" />, label: "Discovering matching yachts..." },
  { icon: <BarChart3 className="w-5 h-5" />, label: "Ranking by match quality..." },
  { icon: <Sparkles className="w-5 h-5" />, label: "Generating recommendations..." },
];

export function SearchLoading() {
  return (
    <div className="flex flex-col items-center justify-center py-24">
      <div className="relative mb-8">
        <div className="w-16 h-16 rounded-full border-2 border-gold/20 border-t-gold animate-spin" />
        <Sparkles className="absolute inset-0 m-auto w-6 h-6 text-gold animate-pulse" />
      </div>

      <div className="flex flex-col gap-3">
        {steps.map((step, i) => (
          <div
            key={i}
            className="flex items-center gap-3 text-sm text-gray-400 animate-fade-in"
            style={{ animationDelay: `${i * 0.4}s`, opacity: 0 }}
          >
            <span className="text-gold/40">{step.icon}</span>
            {step.label}
          </div>
        ))}
      </div>
    </div>
  );
}
