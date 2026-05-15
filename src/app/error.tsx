"use client";

import { useEffect } from "react";
import Link from "next/link";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { AlertTriangle, RotateCcw, Home } from "lucide-react";

export default function ErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log to console — production tools could send to Sentry/Logflare here
    console.error("[veliqa error boundary]", error);
  }, [error]);

  return (
    <main className="min-h-screen bg-[radial-gradient(ellipse_at_top,_var(--color-navy-light)_0%,_var(--color-navy)_70%)] flex flex-col">
      <Navbar />

      <div className="flex-1 flex items-center justify-center px-4 py-20">
        <div className="max-w-xl w-full text-center">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-red-500/10 border border-red-500/20 mb-6">
            <AlertTriangle className="w-10 h-10 text-red-400" />
          </div>

          <div className="text-[10px] uppercase tracking-[0.3em] text-red-400 mb-2">
            Unerwarteter Fehler
          </div>
          <h1 className="text-3xl sm:text-4xl font-light text-white mb-4">
            Etwas ist schiefgelaufen
          </h1>
          <p className="text-gray-400 text-base max-w-md mx-auto mb-2">
            Wir konnten diese Aktion nicht abschließen. Versuche es erneut oder geh zurück zur Startseite.
          </p>
          {error.digest && (
            <p className="text-[11px] text-gray-600 mb-6 font-mono">
              Referenz: {error.digest}
            </p>
          )}

          <div className="flex flex-wrap items-center justify-center gap-3 mt-8">
            <button
              onClick={reset}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-gold/90 hover:bg-gold text-navy text-sm font-medium rounded-xl transition-colors"
            >
              <RotateCcw className="w-4 h-4" />
              Erneut versuchen
            </button>
            <Link
              href="/"
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 text-white text-sm rounded-xl transition-colors"
            >
              <Home className="w-4 h-4" />
              Zur Startseite
            </Link>
          </div>
        </div>
      </div>

      <Footer />
    </main>
  );
}
