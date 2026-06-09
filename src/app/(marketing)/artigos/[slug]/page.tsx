import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { MarketingShell } from "@/components/marketing/MarketingShell";
import { ArticleLayout } from "@/components/marketing/MarketingLayouts";
import { getArticleContent } from "@/lib/marketing/articleContent";
import {
  ARTICLES,
  formatArticleDate,
  getArticleBySlug,
} from "@/lib/marketing/articles";
import { getSiteUrl } from "@/lib/marketing/site";

type Props = {
  params: Promise<{ slug: string }>;
};

export function generateStaticParams() {
  return ARTICLES.map((a) => ({ slug: a.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const article = getArticleBySlug(slug);
  if (!article) return {};

  return {
    title: article.title,
    description: article.description,
    alternates: { canonical: `/artigos/${slug}` },
    openGraph: {
      title: article.title,
      description: article.description,
      url: `/artigos/${slug}`,
      type: "article",
      publishedTime: article.publishedAt,
      modifiedTime: article.updatedAt,
    },
  };
}

const RELATED_LINKS = [
  {
    href: "/ferramentas/limite-diario",
    label: "Calculadora de limite diário",
  },
  {
    href: "/ferramentas/reserva-poupar",
    label: "Simulador de reserva para poupar",
  },
  { href: "/guias/como-poupar", label: "Como reservar para poupar" },
  { href: "/artigos", label: "Todos os artigos" },
];

export default async function ArtigoPage({ params }: Readonly<Props>) {
  const { slug } = await params;
  const article = getArticleBySlug(slug);
  const Content = getArticleContent(slug);

  if (!article || !Content) notFound();

  const siteUrl = getSiteUrl();
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    headline: article.title,
    description: article.description,
    datePublished: article.publishedAt,
    dateModified: article.updatedAt,
    author: {
      "@type": "Organization",
      name: "Saldo Real",
      url: siteUrl,
    },
    publisher: {
      "@type": "Organization",
      name: "Saldo Real",
      url: siteUrl,
    },
    mainEntityOfPage: {
      "@type": "WebPage",
      "@id": `${siteUrl}/artigos/${slug}`,
    },
    url: `${siteUrl}/artigos/${slug}`,
    keywords: article.tags.join(", "),
  };

  return (
    <MarketingShell pageId={article.pageId}>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <ArticleLayout
        pageId={article.pageId}
        title={article.title}
        description={article.description}
        publishedAt={formatArticleDate(article.publishedAt)}
        readingMinutes={article.readingMinutes}
        tags={article.tags}
        relatedLinks={RELATED_LINKS}
      >
        <Content />
      </ArticleLayout>
    </MarketingShell>
  );
}
