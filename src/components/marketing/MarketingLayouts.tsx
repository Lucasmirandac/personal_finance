import { MarketingCtaLink } from "@/components/marketing/MarketingShell";
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
        <p className="mt-1 text-sm text-muted">
          Importe CSV do Nubank ou Inter, cadastre contas e veja limite diário,
          projeção e orçamentos no painel.
        </p>
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
  children: React.ReactNode;
};

export function GuideLayout({
  pageId,
  title,
  description,
  updatedAt,
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
        <p className="font-medium">Pronto para importar?</p>
        <p className="mt-1 text-sm text-muted">
          Abra o Saldo Real, importe seu CSV e configure o ciclo da fatura em
          poucos minutos.
        </p>
        <MarketingCtaLink
          href="/comecar"
          pageId={pageId}
          cta="guia"
          variant="primary"
          className="mt-4"
        >
          Começar agora
        </MarketingCtaLink>
      </div>
    </div>
  );
}
