import type { MetadataRoute } from "next";
import { BLOG_POSTS } from "@/lib/blog/posts";

const BASE = "https://veliqa.life";

export default function sitemap(): MetadataRoute.Sitemap {
  const staticRoutes: MetadataRoute.Sitemap = [
    { url: `${BASE}/`, changeFrequency: "daily", priority: 1.0 },
    { url: `${BASE}/charter`, changeFrequency: "hourly", priority: 0.9 },
    { url: `${BASE}/sale`, changeFrequency: "hourly", priority: 0.9 },
    { url: `${BASE}/crm`, changeFrequency: "weekly", priority: 0.4 },
    { url: `${BASE}/blog`, changeFrequency: "daily", priority: 0.8 },
    { url: `${BASE}/impressum`, changeFrequency: "yearly", priority: 0.2 },
    { url: `${BASE}/datenschutz`, changeFrequency: "yearly", priority: 0.2 },
  ];

  const blogRoutes: MetadataRoute.Sitemap = BLOG_POSTS.map((p) => ({
    url: `${BASE}/blog/${p.slug}`,
    lastModified: new Date(p.publishedAt),
    changeFrequency: "monthly",
    priority: 0.7,
  }));

  return [...staticRoutes, ...blogRoutes];
}
