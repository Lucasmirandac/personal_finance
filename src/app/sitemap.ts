import type { MetadataRoute } from "next";
import { getAllMarketingPaths, getSiteUrl } from "@/lib/marketing/site";

function sitemapPriority(path: string): number {
  if (path === "/") return 1;
  if (path.startsWith("/ferramentas")) return 0.9;
  if (path.startsWith("/artigos")) return 0.8;
  return 0.85;
}

export default function sitemap(): MetadataRoute.Sitemap {
  const base = getSiteUrl();
  const now = new Date();

  return getAllMarketingPaths().map((path) => ({
    url: `${base}${path === "/" ? "" : path}`,
    lastModified: now,
    changeFrequency: path === "/" ? "weekly" : "monthly",
    priority: sitemapPriority(path),
  }));
}
