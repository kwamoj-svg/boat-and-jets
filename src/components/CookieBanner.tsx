"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

export function CookieBanner() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // Only show if user hasn't accepted yet
    const accepted = localStorage.getItem("boat_cookies_accepted");
    if (!accepted) {
      // Small delay so it doesn't flash on load
      const t = setTimeout(() => setVisible(true), 1000);
      return () => clearTimeout(t);
    }
  }, []);

  const accept = () => {
    localStorage.setItem("boat_cookies_accepted", "true");
    setVisible(false);
  };

  const decline = () => {
    localStorage.setItem("boat_cookies_accepted", "essential");
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-[100] p-4 animate-fade-in">
      <div className="max-w-4xl mx-auto bg-[#1a2332]/95 backdrop-blur-md border border-white/[0.08] rounded-2xl px-5 py-4 flex flex-col sm:flex-row items-start sm:items-center gap-4 shadow-2xl">
        <div className="flex-1 text-sm text-gray-300 leading-relaxed">
          <p>
            Wir verwenden ausschlie&szlig;lich technisch notwendige Cookies f&uuml;r den Betrieb der Website.
            Keine Tracking- oder Marketing-Cookies.{" "}
            <Link href="/datenschutz" className="text-gold-light hover:text-gold underline">
              Datenschutzerkl&auml;rung
            </Link>
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={decline}
            className="px-4 py-2 text-sm text-gray-400 hover:text-gray-200 transition-colors"
          >
            Nur notwendige
          </button>
          <button
            onClick={accept}
            className="px-5 py-2 text-sm bg-gold/20 hover:bg-gold/30 text-gold-light border border-gold/30 rounded-xl transition-colors"
          >
            Akzeptieren
          </button>
        </div>
      </div>
    </div>
  );
}
