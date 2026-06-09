import type { ComponentType } from "react";
import { PorQueGastamosEgoFinancasContent } from "@/content/artigos/por-que-gastamos-ego-financas";

export const ARTICLE_CONTENT: Record<string, ComponentType> = {
  "por-que-gastamos-ego-financas": PorQueGastamosEgoFinancasContent,
};

export function getArticleContent(slug: string): ComponentType | undefined {
  return ARTICLE_CONTENT[slug];
}
