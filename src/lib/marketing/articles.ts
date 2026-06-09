import type { MarketingPageId } from "./site";

export type ArticleMeta = {
  slug: string;
  title: string;
  description: string;
  publishedAt: string;
  updatedAt: string;
  readingMinutes: number;
  tags: string[];
  pageId: MarketingPageId;
};

export const ARTICLES: ArticleMeta[] = [
  {
    slug: "por-que-gastamos-ego-financas",
    title: "Por que gastamos dinheiro — e como não perder para o próprio ego",
    description:
      "Finanças são mais comportamento do que planilha. Entenda por que gastamos por emoção e comparação — e como criar regras antes do impulso.",
    publishedAt: "2026-06-09",
    updatedAt: "2026-06-09",
    readingMinutes: 9,
    tags: ["psicologia financeira", "comportamento", "ego", "gastos"],
    pageId: "article_ego_gastos",
  },
];

export function getAllArticles(): ArticleMeta[] {
  return [...ARTICLES].sort(
    (a, b) =>
      new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime(),
  );
}

export function getArticleBySlug(slug: string): ArticleMeta | undefined {
  return ARTICLES.find((a) => a.slug === slug);
}

export function getArticlePaths(): string[] {
  return ARTICLES.map((a) => `/artigos/${a.slug}`);
}

export function formatArticleDate(isoDate: string): string {
  const [year, month, day] = isoDate.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.toLocaleDateString("pt-BR", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
}
