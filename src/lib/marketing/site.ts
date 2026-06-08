export function getSiteUrl(): string {
  const url = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (url) return url.replace(/\/$/, "");
  return process.env.NODE_ENV === "production"
    ? "https://saldoreal.app"
    : "http://localhost:3000";
}

export const MARKETING_ROUTES = [
  "/",
  "/comecar",
  "/guias/importar-nubank",
  "/guias/importar-inter",
  "/ferramentas/limite-diario",
  "/ferramentas/posso-comprar",
] as const;

export type MarketingPageId =
  | "landing"
  | "guide_nubank"
  | "guide_inter"
  | "tool_limite_diario"
  | "tool_posso_comprar";
