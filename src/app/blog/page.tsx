import Link from "next/link";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { BLOG_POSTS } from "@/lib/blog/posts";
import { BookOpen, Clock, Tag } from "lucide-react";

export const metadata = {
  title: "VELIQA Blog — Yacht Charter, Bootkauf & Reise-Insights",
  description:
    "Tiefgehende Ratgeber rund um Yacht- und Bootscharter, Bootkauf, Reiseziele am Mittelmeer und Wissen für Skipper. Aktualisiert von der VELIQA-Redaktion.",
  alternates: { canonical: "https://veliqa.life/blog" },
  openGraph: {
    title: "VELIQA Blog — Yacht Charter, Bootkauf & Reise-Insights",
    description:
      "Tiefgehende Ratgeber rund um Yacht- und Bootscharter, Bootkauf, Reiseziele am Mittelmeer und Wissen für Skipper.",
    url: "https://veliqa.life/blog",
    type: "website",
  },
};

export const revalidate = 3600;

const CATEGORY_STYLES: Record<string, string> = {
  Charter: "bg-blue-500/10 text-blue-300 border-blue-500/20",
  Kauf: "bg-emerald-500/10 text-emerald-300 border-emerald-500/20",
  Reiseziele: "bg-orange-500/10 text-orange-300 border-orange-500/20",
  Ratgeber: "bg-gold/10 text-gold-light border-gold/20",
  "Boot-Typen": "bg-purple-500/10 text-purple-300 border-purple-500/20",
};

export default function BlogIndexPage() {
  // Newest first
  const posts = [...BLOG_POSTS].sort((a, b) =>
    b.publishedAt.localeCompare(a.publishedAt)
  );

  const categories = Array.from(new Set(posts.map((p) => p.category)));

  return (
    <main className="min-h-screen bg-[radial-gradient(ellipse_at_top,_var(--color-navy-light)_0%,_var(--color-navy)_70%)]">
      <Navbar />

      <div className="max-w-5xl mx-auto px-4 sm:px-6 pt-24 pb-16">
        <header className="mb-10">
          <div className="flex items-center gap-2 text-gold-light text-xs uppercase tracking-[0.2em] mb-3">
            <BookOpen className="w-3.5 h-3.5" />
            VELIQA Magazin
          </div>
          <h1 className="text-4xl sm:text-5xl font-light text-white leading-tight mb-3">
            Yacht-Wissen, Reise-Inspiration & Insider-Guides
          </h1>
          <p className="text-gray-400 text-base sm:text-lg max-w-2xl">
            {posts.length} ausführliche Artikel rund um Charter, Bootkauf, Reviere am Mittelmeer und das Leben an Bord — geschrieben von der VELIQA-Redaktion.
          </p>
        </header>

        {/* Category chips */}
        <div className="flex flex-wrap gap-2 mb-8">
          {categories.map((cat) => {
            const count = posts.filter((p) => p.category === cat).length;
            return (
              <span
                key={cat}
                className={`text-xs px-3 py-1.5 rounded-full border ${CATEGORY_STYLES[cat] ?? "bg-white/5 text-gray-300 border-white/10"}`}
              >
                {cat} · {count}
              </span>
            );
          })}
        </div>

        {/* Posts grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {posts.map((p) => (
            <Link
              key={p.slug}
              href={`/blog/${p.slug}`}
              className="group bg-white/[0.03] hover:bg-white/[0.06] border border-white/5 hover:border-gold/30 rounded-2xl p-5 transition-colors flex flex-col"
            >
              <div className="flex items-center justify-between gap-3 mb-3">
                <span
                  className={`text-[10px] uppercase tracking-wider px-2 py-1 rounded border ${CATEGORY_STYLES[p.category] ?? "bg-white/5 text-gray-300 border-white/10"}`}
                >
                  {p.category}
                </span>
                <span className="text-xs text-gray-500 flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  {p.readingTimeMin} Min
                </span>
              </div>
              <h2 className="text-white text-lg font-light leading-snug mb-2 group-hover:text-gold-light transition-colors">
                {p.title}
              </h2>
              <p className="text-sm text-gray-400 leading-relaxed flex-1">
                {p.description}
              </p>
              <div className="mt-4 flex items-center gap-2 text-[11px] text-gray-500">
                <Tag className="w-3 h-3" />
                {p.keywords.slice(0, 3).join(" · ")}
              </div>
            </Link>
          ))}
        </div>

        {posts.length === 0 && (
          <div className="text-center py-16 bg-white/[0.02] border border-white/5 rounded-2xl">
            <p className="text-gray-500 text-sm">
              Noch keine Artikel veröffentlicht. Bald an Bord.
            </p>
          </div>
        )}
      </div>

      <Footer />
    </main>
  );
}
