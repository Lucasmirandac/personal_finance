import type { Metadata } from "next";
import Link from "next/link";
import { MarketingShell } from "@/components/marketing/MarketingShell";
import { getAllArticles, formatArticleDate } from "@/lib/marketing/articles";
import { getSiteUrl } from "@/lib/marketing/site";

export const metadata: Metadata = {
  title: "Artigos sobre dinheiro e comportamento",
  description:
    "Educação financeira prática em português: psicologia do dinheiro, hábitos de gasto e decisões com mais clareza — pelo Saldo Real.",
  alternates: { canonical: "/artigos" },
  openGraph: {
    title: "Artigos sobre dinheiro e comportamento | Saldo Real",
    description:
      "Educação financeira prática: psicologia do dinheiro, hábitos de gasto e decisões com mais clareza.",
    url: "/artigos",
    type: "website",
  },
};

export default function ArtigosIndexPage() {
  const articles = getAllArticles();
  const siteUrl = getSiteUrl();
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Blog",
    name: "Artigos Saldo Real",
    description: metadata.description,
    url: `${siteUrl}/artigos`,
    publisher: {
      "@type": "Organization",
      name: "Saldo Real",
      url: siteUrl,
    },
    blogPost: articles.map((a) => ({
      "@type": "BlogPosting",
      headline: a.title,
      url: `${siteUrl}/artigos/${a.slug}`,
      datePublished: a.publishedAt,
      dateModified: a.updatedAt,
    })),
  };

  return (
    <MarketingShell pageId="articles_index">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6 sm:py-14">
        <p className="text-caption font-semibold uppercase tracking-wider text-accent">
          Artigos
        </p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">
          Artigos sobre dinheiro e comportamento
        </h1>
        <p className="mt-4 max-w-2xl text-lg text-muted leading-relaxed">
          Educação financeira prática, sem curso e sem promessa milagrosa. Textos
          para entender por que gastamos — e o que fazer com isso no dia a dia.
        </p>

        <ul className="mt-10 grid gap-6 sm:grid-cols-2">
          {articles.map((article) => (
            <li key={article.slug}>
              <Link
                href={`/artigos/${article.slug}`}
                className="group block h-full rounded-2xl border border-border bg-surface p-6 shadow-[var(--shadow-card)] transition-colors hover:border-accent/40"
              >
                <ul className="flex flex-wrap gap-2">
                  {article.tags.slice(0, 3).map((tag) => (
                    <li
                      key={tag}
                      className="rounded-full bg-surface-2 px-2.5 py-0.5 text-caption text-muted"
                    >
                      {tag}
                    </li>
                  ))}
                </ul>
                <h2 className="mt-4 text-lg font-semibold tracking-tight group-hover:text-accent transition-colors">
                  {article.title}
                </h2>
                <p className="mt-2 text-sm text-muted leading-relaxed line-clamp-3">
                  {article.description}
                </p>
                <p className="mt-4 text-caption text-muted">
                  {formatArticleDate(article.publishedAt)} ·{" "}
                  {article.readingMinutes} min
                </p>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </MarketingShell>
  );
}
