"use client";

import { useState } from "react";
import { MessageCircle } from "lucide-react";
import { AnimatePresence } from "framer-motion";
import ConciergeChat from "./ConciergeChat";

export default function ConciergeBubble() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <AnimatePresence>{isOpen && <ConciergeChat onClose={() => setIsOpen(false)} />}</AnimatePresence>

      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="fixed bottom-6 right-6 z-50 group"
          aria-label="Open AI Concierge"
        >
          <div
            className="relative w-14 h-14 rounded-full bg-gradient-to-br from-amber-400 to-amber-600
              flex items-center justify-center shadow-lg shadow-amber-500/25
              hover:shadow-xl hover:shadow-amber-500/40 hover:scale-105
              transition-all duration-300"
          >
            {/* Pulse ring */}
            <span className="absolute inset-0 rounded-full bg-amber-400/30 animate-ping" />
            <MessageCircle className="w-6 h-6 text-white relative z-10" />
          </div>

          {/* Hover label */}
          <span
            className="absolute right-full mr-3 top-1/2 -translate-y-1/2
              whitespace-nowrap px-3 py-1.5 rounded-lg
              bg-[#0a1628]/90 backdrop-blur-sm border border-white/10
              text-white text-xs font-medium
              opacity-0 group-hover:opacity-100 pointer-events-none
              transition-opacity duration-200"
          >
            KI-Berater
          </span>
        </button>
      )}
    </>
  );
}
