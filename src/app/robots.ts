import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/api/", "/admin/", "/crm", "/partner", "/(auth)/"],
      },
    ],
    sitemap: "https://veliqa.life/sitemap.xml",
    host: "https://veliqa.life",
  };
}
