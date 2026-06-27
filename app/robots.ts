import type { MetadataRoute } from "next";

const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL ?? "https://waitlist.vixo.live").replace(/\/$/, "");

// Allows search engines to crawl everything except API routes, and points to the sitemap.
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/api/", "/discord/done"],
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
