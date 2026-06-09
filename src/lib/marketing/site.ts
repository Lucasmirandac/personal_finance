export function getSiteUrl(): string {
  const url = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (url) return url.replace(/\/$/, "");
  return process.env.NODE_ENV === "production"
    ? "https://saldoreal.app"
    : "http://localhost:3000";
}

import { getArticlePaths } from "./articles";

export const MARKETING_ROUTES = [
  "/",
  "/comecar",
  "/artigos",
  "/guias/importar-nubank",
  "/guias/importar-inter",
  "/guias/como-poupar",
  "/guias/usar-sem-importar",
  "/ferramentas/limite-diario",
  "/ferramentas/posso-comprar",
  "/ferramentas/reserva-poupar",
] as const;

export type MarketingPageId =
  | "landing"
  | "articles_index"
  | "article_ego_gastos"
  | "guide_nubank"
  | "guide_inter"
  | "guide_poupar"
  | "guide_sem_importar"
  | "tool_limite_diario"
  | "tool_posso_comprar"
  | "tool_reserva_poupar";

export function getAllMarketingPaths(): string[] {
  return [...MARKETING_ROUTES, ...getArticlePaths()];
}
