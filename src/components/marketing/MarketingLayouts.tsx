import Link from "next/link";
import { MarketingCtaLink } from "@/components/marketing/MarketingShell";
import { TOOL_UPSELL_LINE } from "@/lib/marketing/copy";
import type { MarketingPageId } from "@/lib/marketing/site";

type Props = {
  pageId: MarketingPageId;
  title: string;
  description: string;
  children: React.ReactNode;
};

export function ToolLayout({
  pageId,
  title,
  description,
  children,
}: Readonly<Props>) {
  return (
    <div className="mx-auto max-w-xl px-4 py-10 sm:px-6 sm:py-14">
      <p className="text-caption font-semibold uppercase tracking-wider text-accent">
        Ferramenta gratuita
      </p>
      <h1 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">
        {title}
      </h1>
      <p className="mt-3 text-muted leading-relaxed">{description}</p>
      <p className="mt-2 text-caption text-muted">
        Cálculo 100% no seu navegador — nenhum dado financeiro é enviado.
      </p>

      <div className="mt-8">{children}</div>

      <div className="mt-10 rounded-2xl border border-border bg-surface-2/50 p-5">
        <p className="text-sm font-medium">Quer isso automático com suas faturas?</p>
        <p className="mt-1 text-sm text-muted">{TOOL_UPSELL_LINE}</p>
        <MarketingCtaLink
          href="/comecar"
          pageId={pageId}
          cta="comecar"
          variant="primary"
          className="mt-4"
        >
          Abrir Saldo Real
        </MarketingCtaLink>
      </div>
    </div>
  );
}

type GuideProps = {
  pageId: MarketingPageId;
  title: string;
  description: string;
  updatedAt: string;
  ctaTitle?: string;
  ctaDescription?: string;
  ctaLabel?: string;
  children: React.ReactNode;
};

export function GuideLayout({
  pageId,
  title,
  description,
  updatedAt,
  ctaTitle = "Pronto para importar?",
  ctaDescription = "Abra o Saldo Real, importe seu CSV e configure o ciclo da fatura em poucos minutos.",
  ctaLabel = "Começar agora",
  children,
}: Readonly<GuideProps>) {
  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6 sm:py-14">
      <p className="text-caption font-semibold uppercase tracking-wider text-accent">
        Guia
      </p>
      <h1 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">
        {title}
      </h1>
      <p className="mt-3 text-lg text-muted leading-relaxed">{description}</p>
      <p className="mt-2 text-caption text-muted">Atualizado em {updatedAt}</p>

      <article className="prose prose-neutral mt-10 max-w-none space-y-8 [&_h2]:text-xl [&_h2]:font-semibold [&_h2]:tracking-tight [&_ol]:list-decimal [&_ol]:pl-5 [&_ul]:list-disc [&_ul]:pl-5 [&_li]:mt-2 [&_p]:text-muted [&_p]:leading-relaxed">
        {children}
      </article>

      <div className="mt-12 rounded-2xl border border-dashed border-border-strong bg-surface p-6">
        <p className="font-medium">{ctaTitle}</p>
        <p className="mt-1 text-sm text-muted">{ctaDescription}</p>
        <MarketingCtaLink
          href="/comecar"
          pageId={pageId}
          cta="guia"
          variant="primary"
          className="mt-4"
        >
          {ctaLabel}
        </MarketingCtaLink>
      </div>
    </div>
  );
}

type ArticleProps = {
  pageId: MarketingPageId;
  title: string;
  description: string;
  publishedAt: string;
  readingMinutes: number;
  tags: string[];
  ctaTitle?: string;
  ctaDescription?: string;
  ctaLabel?: string;
  relatedLinks?: { href: string; label: string }[];
  children: React.ReactNode;
};

export function ArticleLayout({
  pageId,
  title,
  description,
  publishedAt,
  readingMinutes,
  tags,
  ctaTitle = "Menos ansiedade com números reais",
  ctaDescription = "Cadastre contas, importe faturas e veja limite diário e projeção — tudo local no navegador.",
  ctaLabel = "Abrir Saldo Real",
  relatedLinks = [],
  children,
}: Readonly<ArticleProps>) {
  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6 sm:py-14">
      <p className="text-caption font-semibold uppercase tracking-wider text-accent">
        Artigo
      </p>
      <h1 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">
        {title}
      </h1>
      <p className="mt-3 text-lg text-muted leading-relaxed">{description}</p>
      <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 text-caption text-muted">
        <span>Publicado em {publishedAt}</span>
        <span aria-hidden>·</span>
        <span>{readingMinutes} min de leitura</span>
      </div>
      {tags.length > 0 && (
        <ul className="mt-4 flex flex-wrap gap-2">
          {tags.map((tag) => (
            <li
              key={tag}
              className="rounded-full bg-surface-2 px-2.5 py-0.5 text-caption text-muted"
            >
              {tag}
            </li>
          ))}
        </ul>
      )}

      <article className="prose prose-neutral mt-10 max-w-none space-y-8 [&_h2]:text-xl [&_h2]:font-semibold [&_h2]:tracking-tight [&_h3]:text-base [&_h3]:font-semibold [&_ol]:list-decimal [&_ol]:pl-5 [&_ul]:list-disc [&_ul]:pl-5 [&_li]:mt-2 [&_p]:text-muted [&_p]:leading-relaxed">
        {children}
      </article>

      {relatedLinks.length > 0 && (
        <div className="mt-12 border-t border-border/60 pt-8">
          <p className="font-medium">Continuar lendo</p>
          <ul className="mt-3 space-y-2 text-sm">
            {relatedLinks.map((link) => (
              <li key={link.href}>
                <Link
                  href={link.href}
                  className="text-accent underline underline-offset-2"
                >
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="mt-12 rounded-2xl border border-dashed border-border-strong bg-surface p-6">
        <p className="font-medium">{ctaTitle}</p>
        <p className="mt-1 text-sm text-muted">{ctaDescription}</p>
        <MarketingCtaLink
          href="/comecar"
          pageId={pageId}
          cta="guia"
          variant="primary"
          className="mt-4"
        >
          {ctaLabel}
        </MarketingCtaLink>
      </div>
    </div>
  );
}
