import { notFound } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { BLOG_POSTS } from "@/lib/blog/posts";
import { renderMarkdown } from "@/lib/blog/render";
import { ChevronLeft, Clock, Calendar } from "lucide-react";

export const revalidate = 3600;
export const dynamicParams = false;

export function generateStaticParams() {
  return BLOG_POSTS.map((p) => ({ slug: p.slug }));
}

interface PageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const post = BLOG_POSTS.find((p) => p.slug === slug);
  if (!post) return { title: "Artikel nicht gefunden — VELIQA Blog" };
  const url = `https://veliqa.life/blog/${post.slug}`;
  return {
    title: `${post.title} — VELIQA Blog`,
    description: post.description,
    keywords: post.keywords,
    alternates: { canonical: url },
    openGraph: {
      title: post.title,
      description: post.description,
      url,
      type: "article",
      publishedTime: post.publishedAt,
      images: post.cover ? [{ url: post.cover, width: 1200, height: 630 }] : undefined,
    },
    twitter: {
      card: "summary_large_image",
      title: post.title,
      description: post.description,
      images: post.cover ? [post.cover] : undefined,
    },
  };
}

export default async function BlogPostPage({ params }: PageProps) {
  const { slug } = await params;
  const post = BLOG_POSTS.find((p) => p.slug === slug);
  if (!post) notFound();

  const html = renderMarkdown(post.content);
  const url = `https://veliqa.life/blog/${post.slug}`;

  const articleJsonLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: post.title,
    description: post.description,
    image: post.cover || undefined,
    datePublished: post.publishedAt,
    dateModified: post.publishedAt,
    author: { "@type": "Organization", name: "VELIQA Redaktion" },
    publisher: {
      "@type": "Organization",
      name: "VELIQA",
      url: "https://veliqa.life",
    },
    mainEntityOfPage: { "@type": "WebPage", "@id": url },
    keywords: post.keywords.join(", "),
  };

  // Related: 3 other posts from same category, fallback to newest
  const related = BLOG_POSTS.filter(
    (p) => p.slug !== post.slug && p.category === post.category
  )
    .sort((a, b) => b.publishedAt.localeCompare(a.publishedAt))
    .slice(0, 3);

  const formattedDate = new Date(post.publishedAt).toLocaleDateString("de-DE", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });

  return (
    <main className="min-h-screen bg-[radial-gradient(ellipse_at_top,_var(--color-navy-light)_0%,_var(--color-navy)_70%)]">
      <Navbar />

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(articleJsonLd) }}
      />

      <article className="max-w-3xl mx-auto px-4 sm:px-6 pt-24 pb-16">
        <Link
          href="/blog"
          className="inline-flex items-center gap-1.5 text-sm text-gray-400 hover:text-gold-light transition-colors mb-6"
        >
          <ChevronLeft className="w-4 h-4" />
          Zurück zum Blog
        </Link>

        <header className="mb-8">
          <div className="flex flex-wrap items-center gap-3 mb-4 text-xs">
            <span className="px-2 py-1 rounded border border-gold/30 bg-gold/5 text-gold-light uppercase tracking-wider">
              {post.category}
            </span>
            <span className="flex items-center gap-1 text-gray-500">
              <Calendar className="w-3 h-3" />
              {formattedDate}
            </span>
            <span className="flex items-center gap-1 text-gray-500">
              <Clock className="w-3 h-3" />
              {post.readingTimeMin} Min Lesezeit
            </span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-light text-white leading-tight mb-4">
            {post.title}
          </h1>
          <p className="text-lg text-gray-400 leading-relaxed">
            {post.description}
          </p>
        </header>

        {post.cover && (
          <div className="rounded-2xl overflow-hidden mb-8 border border-white/5">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={post.cover}
              alt={post.title}
              className="w-full h-auto"
              loading="eager"
            />
          </div>
        )}

        <div
          className="prose-veliqa"
          dangerouslySetInnerHTML={{ __html: html }}
        />

        {/* Keywords footer */}
        <div className="mt-12 pt-6 border-t border-white/10">
          <div className="text-xs text-gray-500 uppercase tracking-wider mb-2">Themen</div>
          <div className="flex flex-wrap gap-2">
            {post.keywords.map((k) => (
              <span
                key={k}
                className="text-xs px-2 py-1 rounded-full bg-white/[0.04] text-gray-400 border border-white/5"
              >
                {k}
              </span>
            ))}
          </div>
        </div>

        {/* CTA */}
        <div className="mt-10 p-6 rounded-2xl bg-gradient-to-br from-gold/10 to-transparent border border-gold/20">
          <h3 className="text-white text-xl font-light mb-2">
            Bereit für den nächsten Törn?
          </h3>
          <p className="text-gray-400 text-sm mb-4">
            Durchsuche über 24.000 Charter-Yachten in der VELIQA-Datenbank — Filter nach Revier, Bootstyp und Budget. Speichere Favoriten direkt im CRM.
          </p>
          <div className="flex flex-wrap gap-3">
            <Link
              href="/charter"
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-gold/90 hover:bg-gold text-navy text-sm font-medium rounded-lg transition-colors"
            >
              Charter-Katalog öffnen
            </Link>
            <Link
              href="/crm"
              className="inline-flex items-center gap-1.5 px-4 py-2 text-sm text-gray-300 hover:text-white transition-colors"
            >
              Zum CRM
            </Link>
          </div>
        </div>

        {/* Related */}
        {related.length > 0 && (
          <section className="mt-12 pt-8 border-t border-white/10">
            <h2 className="text-white text-xl font-light mb-5">
              Weiterlesen — {post.category}
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {related.map((r) => (
                <Link
                  key={r.slug}
                  href={`/blog/${r.slug}`}
                  className="bg-white/[0.03] hover:bg-white/[0.06] border border-white/5 hover:border-gold/30 rounded-xl p-4 transition-colors"
                >
                  <div className="text-[10px] text-gray-500 mb-2 flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {r.readingTimeMin} Min
                  </div>
                  <div className="text-white text-sm font-light leading-snug line-clamp-3">
                    {r.title}
                  </div>
                </Link>
              ))}
            </div>
          </section>
        )}
      </article>

      <Footer />
    </main>
  );
}
