import type { MetadataRoute } from "next";
import { getSiteUrl, MARKETING_ROUTES } from "@/lib/marketing/site";

export default function sitemap(): MetadataRoute.Sitemap {
  const base = getSiteUrl();
  const now = new Date();

  return MARKETING_ROUTES.map((path) => ({
    url: `${base}${path === "/" ? "" : path}`,
    lastModified: now,
    changeFrequency: path === "/" ? "weekly" : "monthly",
    priority: path === "/" ? 1 : path.startsWith("/ferramentas") ? 0.9 : 0.85,
  }));
}
