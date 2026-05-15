import Link from "next/link";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { Anchor, Search, BookOpen, Briefcase } from "lucide-react";

export const metadata = {
  title: "Seite nicht gefunden — VELIQA",
  description: "Diese Seite existiert nicht oder wurde verschoben.",
};

export default function NotFound() {
  return (
    <main className="min-h-screen bg-[radial-gradient(ellipse_at_top,_var(--color-navy-light)_0%,_var(--color-navy)_70%)] flex flex-col">
      <Navbar />

      <div className="flex-1 flex items-center justify-center px-4 py-20">
        <div className="max-w-xl w-full text-center">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-gold/10 border border-gold/20 mb-6">
            <Anchor className="w-10 h-10 text-gold" />
          </div>

          <div className="text-[10px] uppercase tracking-[0.3em] text-gold-light mb-2">
            Fehler 404
          </div>
          <h1 className="text-4xl sm:text-5xl font-light text-white mb-4">
            Land in Sicht — aber nicht das hier
          </h1>
          <p className="text-gray-400 text-base max-w-md mx-auto mb-8">
            Diese Seite existiert nicht oder wurde verschoben. Vielleicht findest du
            was du suchst über die Hauptbereiche.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 max-w-lg mx-auto">
            <Link
              href="/"
              className="group p-4 rounded-xl bg-white/[0.04] border border-white/10 hover:border-gold/40 hover:bg-white/[0.08] transition-all"
            >
              <Search className="w-5 h-5 text-gold mb-2 mx-auto" />
              <div className="text-sm text-white font-medium">Suche</div>
              <div className="text-[11px] text-gray-500 mt-0.5">KI-gestützt</div>
            </Link>
            <Link
              href="/charter"
              className="group p-4 rounded-xl bg-white/[0.04] border border-white/10 hover:border-gold/40 hover:bg-white/[0.08] transition-all"
            >
              <Anchor className="w-5 h-5 text-gold mb-2 mx-auto" />
              <div className="text-sm text-white font-medium">Charter</div>
              <div className="text-[11px] text-gray-500 mt-0.5">24.000+ Boote</div>
            </Link>
            <Link
              href="/blog"
              className="group p-4 rounded-xl bg-white/[0.04] border border-white/10 hover:border-gold/40 hover:bg-white/[0.08] transition-all"
            >
              <BookOpen className="w-5 h-5 text-gold mb-2 mx-auto" />
              <div className="text-sm text-white font-medium">Blog</div>
              <div className="text-[11px] text-gray-500 mt-0.5">SEO-Guides</div>
            </Link>
          </div>

          <Link
            href="/"
            className="inline-flex items-center gap-2 mt-8 text-sm text-gray-400 hover:text-gold-light transition-colors"
          >
            <Briefcase className="w-4 h-4" />
            Zur Startseite
          </Link>
        </div>
      </div>

      <Footer />
    </main>
  );
}
