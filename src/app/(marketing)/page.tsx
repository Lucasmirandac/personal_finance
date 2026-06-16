import type { Metadata } from "next";
import Link from "next/link";
import {
  MarketingCtaLink,
  MarketingShell,
} from "@/components/marketing/MarketingShell";
import { getSiteUrl } from "@/lib/marketing/site";
import { SOCIAL_LINKS } from "@/lib/marketing/social";
import { getAllArticles } from "@/lib/marketing/articles";
import {
  CSV_OPTIONAL_LINE,
  HERO_SUBTITLE,
  JSON_LD_APP_DESCRIPTION,
  LANDING_FAQ,
  PRODUCT_PROMISE,
} from "@/lib/marketing/copy";
import {
  ArrowRight,
  BookOpen,
  CalendarRange,
  CircleHelp,
  FileText,
  Landmark,
  LayoutGrid,
  LineChart,
  LockKeyhole,
  PiggyBank,
  Receipt,
  ShieldCheck,
  Upload,
  WalletCards,
} from "lucide-react";

export const metadata: Metadata = {
  title: "Saldo Real — seu saldo real, só no seu navegador",
  description: `${PRODUCT_PROMISE} Importação CSV opcional para Nubank e Inter.`,
  alternates: { canonical: "/" },
  openGraph: {
    title: "Saldo Real — finanças locais e privadas",
    description:
      "Hoje, Extrato, Faturas e Futuro — limite diário, orçamentos e sync criptografado opcional. Tudo no navegador.",
    url: "/",
  },
};

export default function LandingPage() {
  const siteUrl = getSiteUrl();
  const featuredArticle = getAllArticles()[0];
  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "SoftwareApplication",
        name: "Saldo Real",
        applicationCategory: "FinanceApplication",
        operatingSystem: "Web",
        offers: { "@type": "Offer", price: "0", priceCurrency: "BRL" },
        description: JSON_LD_APP_DESCRIPTION,
        url: siteUrl,
        sameAs: SOCIAL_LINKS.map((link) => link.href),
      },
      {
        "@type": "FAQPage",
        mainEntity: LANDING_FAQ.map((item) => ({
          "@type": "Question",
          name: item.q,
          acceptedAnswer: { "@type": "Answer", text: item.a },
        })),
      },
    ],
  };

  return (
    <MarketingShell pageId="landing">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <section className="mx-auto max-w-5xl px-4 pt-14 pb-16 sm:px-6 sm:pt-20 sm:pb-24">
        <div className="max-w-2xl">
          <p className="text-caption font-semibold uppercase tracking-wider text-accent">
            Local-first · Sem cadastro · PWA offline
          </p>
          <h1 className="mt-4 text-4xl font-semibold tracking-tight sm:text-5xl sm:leading-[1.1]">
            Seu saldo real.
            <span className="block text-muted">Só no seu navegador.</span>
          </h1>
          <p className="mt-5 text-lg text-muted leading-relaxed max-w-xl">
            {HERO_SUBTITLE}
          </p>
          <p className="mt-3 text-sm text-muted leading-relaxed max-w-xl">
            {CSV_OPTIONAL_LINE}
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <MarketingCtaLink
              href="/comecar"
              pageId="landing"
              cta="comecar"
              variant="primary"
              className="px-6 py-2.5 text-base"
            >
              Começar grátis
            </MarketingCtaLink>
            <Link
              href="/ferramentas/posso-comprar"
              className="inline-flex items-center rounded-full border border-border bg-surface px-5 py-2.5 text-sm font-medium hover:bg-surface-2"
            >
              Posso comprar?
            </Link>
            <Link
              href="/ferramentas/limite-diario"
              className="inline-flex items-center rounded-full border border-border bg-surface px-5 py-2.5 text-sm font-medium hover:bg-surface-2"
            >
              Calcular limite diário
            </Link>
          </div>
        </div>
      </section>

      <section className="border-y border-border/60 bg-surface/60">
        <div className="mx-auto grid max-w-5xl gap-6 px-4 py-14 sm:grid-cols-2 lg:grid-cols-4 sm:px-6">
          <Pillar
            icon={<ShieldCheck size={22} />}
            title="100% local"
            text="IndexedDB e backup JSON. Dados financeiros não passam pelo Saldo Real."
          />
          <Pillar
            icon={<CircleHelp size={22} />}
            title="Decidir antes"
            text="Limite diário, Posso comprar? e alertas de orçamento antes de salvar."
          />
          <Pillar
            icon={<LayoutGrid size={22} />}
            title="Visão completa"
            text="Hoje, Extrato com status pago/a pagar, Faturas e Futuro em 90 dias."
          />
          <Pillar
            icon={<LockKeyhole size={22} />}
            title="Backup opcional"
            text="Sync criptografado no seu Google Drive ou Dropbox — você guarda a senha."
          />
        </div>
      </section>

      <section className="mx-auto max-w-5xl px-4 py-16 sm:px-6">
        <h2 className="text-2xl font-semibold tracking-tight">
          Quatro telas, uma visão
        </h2>
        <p className="mt-3 max-w-2xl text-muted leading-relaxed">
          Cada rota responde uma pergunta diferente — do saldo de hoje à projeção
          dos próximos meses.
        </p>
        <div className="mt-8 grid gap-6 sm:grid-cols-2">
          <RouteCard
            icon={<WalletCards size={22} />}
            title="Hoje"
            text="Saldo real, limite diário e alertas do dia — a resposta para quanto posso gastar agora."
          />
          <RouteCard
            icon={<FileText size={22} />}
            title="Extrato"
            text="Contas à vista com status de pagamento: pago, a pagar ou vencida."
          />
          <RouteCard
            icon={<Receipt size={22} />}
            title="Faturas"
            text="Ciclos de cartão, teto mensal e impacto no fluxo de caixa."
          />
          <RouteCard
            icon={<CalendarRange size={22} />}
            title="Futuro"
            text="Projeção de saldo e linha do tempo — veja os próximos 90 dias."
          />
        </div>
      </section>

      <section className="border-y border-border/60 bg-surface/60">
        <div className="mx-auto max-w-5xl px-4 py-16 sm:px-6">
          <h2 className="text-2xl font-semibold tracking-tight">
            Dois caminhos, mesmo painel
          </h2>
          <p className="mt-3 max-w-2xl text-muted leading-relaxed">
            Escolha como alimentar o Saldo Real — o painel funciona igual nos dois
            casos.
          </p>
          <div className="mt-8 grid gap-6 sm:grid-cols-2">
            <div className="rounded-2xl border border-accent/30 bg-surface p-6 shadow-[var(--shadow-card)]">
              <span className="text-accent">
                <WalletCards size={22} aria-hidden />
              </span>
              <p className="mt-3 font-semibold">Qualquer banco</p>
              <p className="mt-2 text-sm text-muted leading-relaxed">
                Cadastre contas, renda no Divisor de Águas e lance gastos no Quick
                Add. Ideal para Bradesco, Itaú, C6 e demais.
              </p>
              <MarketingCtaLink
                href="/comecar"
                pageId="landing"
                cta="comecar"
                variant="primary"
                className="mt-5"
              >
                Começar manualmente
              </MarketingCtaLink>
            </div>
            <div className="rounded-2xl border border-border bg-surface p-6 shadow-[var(--shadow-card)]">
              <span className="text-accent">
                <Upload size={22} aria-hidden />
              </span>
              <p className="mt-3 font-semibold">Importação rápida</p>
              <p className="mt-2 text-sm text-muted leading-relaxed">
                CSV do Nubank ou Inter detectado automaticamente. Classifica
                gastos e poupa digitação.
              </p>
              <Link
                href="/guias/importar-nubank"
                className="mt-5 inline-flex items-center gap-1.5 rounded-full border border-border bg-surface px-4 py-2 text-sm font-medium hover:bg-surface-2"
              >
                Ver guias de importação
                <ArrowRight size={14} aria-hidden />
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-5xl px-4 py-16 sm:px-6">
        <p className="text-caption font-semibold uppercase tracking-wider text-accent">
          Antes de gastar
        </p>
        <h2 className="mt-3 text-2xl font-semibold tracking-tight sm:text-3xl">
          Decidir antes de gastar.
        </h2>
        <p className="mt-4 max-w-2xl text-muted leading-relaxed">
          O Saldo Real não só mostra números — avisa antes de você esticar o mês
          ou estourar uma categoria.
        </p>

        <ol className="mt-10 grid gap-4 sm:grid-cols-3">
          <FlowStep
            n={1}
            icon={<LineChart size={18} />}
            title="Limite diário"
            text="Quanto pode gastar hoje, com renda, fixos e faturas já descontados."
          />
          <FlowStep
            n={2}
            icon={<CircleHelp size={18} />}
            title="Posso comprar?"
            text="Simule parcelas e veja o semáforo antes de confirmar a compra."
          />
          <FlowStep
            n={3}
            icon={<Receipt size={18} />}
            title="Orçamentos"
            text="Alerta se a categoria vai estourar no mês — no Quick Add, antes de salvar."
          />
        </ol>

        <div className="mt-8 flex flex-wrap gap-3">
          <MarketingCtaLink
            href="/ferramentas/posso-comprar"
            pageId="landing"
            cta="ferramenta"
            variant="primary"
            className="px-5 py-2.5"
          >
            Simular compra
          </MarketingCtaLink>
          <Link
            href="/ferramentas/limite-diario"
            className="inline-flex items-center gap-1.5 rounded-full border border-border bg-surface px-5 py-2.5 text-sm font-medium hover:bg-surface-2"
          >
            Calcular limite diário
            <ArrowRight size={14} aria-hidden />
          </Link>
        </div>
      </section>

      <section className="border-y border-border/60 bg-surface/60">
        <div className="mx-auto max-w-5xl px-4 py-14 sm:px-6">
          <p className="text-caption font-semibold uppercase tracking-wider text-accent">
            Poupar com clareza
          </p>
          <h2 className="mt-3 text-2xl font-semibold tracking-tight sm:text-3xl">
            Reserve antes de gastar.
          </h2>
          <p className="mt-4 max-w-2xl text-muted leading-relaxed">
            Defina quanto da sua renda disponível guardar todo mês. A reserva
            sai do limite diário e alimenta a Projeção de Paz Futura — tudo no
            navegador, sem planilha.
          </p>

          <ol className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <FlowStep
              n={1}
              icon={<WalletCards size={18} />}
              title="Renda disponível"
              text="Renda mensal menos custos fixos — a base do orçamento."
            />
            <FlowStep
              n={2}
              icon={<PiggyBank size={18} />}
              title="Reserva mensal"
              text="Percentual (5–80%) ou valor fixo da renda disponível."
            />
            <FlowStep
              n={3}
              icon={<LineChart size={18} />}
              title="Limite diário"
              text="O que sobra divide pelos dias restantes do mês."
            />
            <FlowStep
              n={4}
              icon={<Landmark size={18} />}
              title="Paz Futura"
              text="Patrimônio projetado e meses de tranquilidade."
            />
          </ol>

          <div className="mt-8 flex flex-wrap gap-3">
            <MarketingCtaLink
              href="/ferramentas/reserva-poupar"
              pageId="landing"
              cta="ferramenta"
              variant="primary"
              className="px-5 py-2.5"
            >
              Simular reserva
            </MarketingCtaLink>
            <Link
              href="/guias/como-poupar"
              className="inline-flex items-center gap-1.5 rounded-full border border-border bg-surface px-5 py-2.5 text-sm font-medium hover:bg-surface-2"
            >
              Ler o guia
              <ArrowRight size={14} aria-hidden />
            </Link>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-5xl px-4 py-16 sm:px-6">
        <h2 className="text-2xl font-semibold tracking-tight">Como funciona</h2>
        <ol className="mt-8 grid gap-6 sm:grid-cols-3">
          <Step
            n={1}
            icon={<WalletCards size={18} />}
            title="Cadastre contas"
            text="Conta corrente com saldo inicial — base da projeção."
          />
          <Step
            n={2}
            icon={<Upload size={18} />}
            title="Importe ou lance"
            text="CSV do cartão ou gastos manuais no Quick Add."
          />
          <Step
            n={3}
            icon={<LayoutGrid size={18} />}
            title="Veja o painel"
            text="Navegue entre Hoje, Extrato, Faturas e Futuro — e configure backup ou sync quando quiser."
          />
        </ol>
      </section>

      {featuredArticle && (
        <section className="border-y border-border/60 bg-surface/60">
          <div className="mx-auto max-w-5xl px-4 py-14 sm:px-6">
            <p className="text-caption font-semibold uppercase tracking-wider text-accent">
              Aprenda
            </p>
            <h2 className="mt-3 text-2xl font-semibold tracking-tight sm:text-3xl">
              Dinheiro é comportamento
            </h2>
            <p className="mt-4 max-w-2xl text-muted leading-relaxed">
              Artigos sobre psicologia financeira, hábitos de gasto e decisões
              com mais clareza — sem curso e sem promessa milagrosa.
            </p>

            <Link
              href={`/artigos/${featuredArticle.slug}`}
              className="group mt-8 block rounded-2xl border border-border bg-surface p-6 shadow-[var(--shadow-card)] transition-colors hover:border-accent/40 sm:max-w-2xl"
            >
              <span className="inline-flex items-center gap-2 text-accent">
                <BookOpen size={18} aria-hidden />
                <span className="text-caption font-semibold uppercase tracking-wider">
                  Artigo em destaque
                </span>
              </span>
              <h3 className="mt-3 text-lg font-semibold tracking-tight group-hover:text-accent transition-colors">
                {featuredArticle.title}
              </h3>
              <p className="mt-2 text-sm text-muted leading-relaxed">
                {featuredArticle.description}
              </p>
              <p className="mt-4 inline-flex items-center gap-1.5 text-sm font-medium text-accent">
                Ler artigo
                <ArrowRight size={14} aria-hidden />
              </p>
            </Link>

            <Link
              href="/artigos"
              className="mt-6 inline-flex items-center gap-1.5 text-sm font-medium text-muted hover:text-foreground"
            >
              Ver todos os artigos
              <ArrowRight size={14} aria-hidden />
            </Link>
          </div>
        </section>
      )}

      <section className="mx-auto max-w-5xl px-4 pb-20 sm:px-6">
        <h2 className="text-2xl font-semibold tracking-tight">Perguntas frequentes</h2>
        <dl className="mt-8 space-y-6">
          {LANDING_FAQ.map((item) => (
            <div key={item.q} className="rounded-2xl border border-border bg-surface p-5">
              <dt className="font-medium">{item.q}</dt>
              <dd className="mt-2 text-sm text-muted leading-relaxed">{item.a}</dd>
            </div>
          ))}
        </dl>
      </section>
    </MarketingShell>
  );
}

function Pillar({
  icon,
  title,
  text,
}: Readonly<{
  icon: React.ReactNode;
  title: string;
  text: string;
}>) {
  return (
    <div className="rounded-2xl border border-border bg-surface p-5 shadow-[var(--shadow-card)]">
      <span className="text-accent">{icon}</span>
      <p className="mt-3 font-semibold">{title}</p>
      <p className="mt-2 text-sm text-muted leading-relaxed">{text}</p>
    </div>
  );
}

function RouteCard({
  icon,
  title,
  text,
}: Readonly<{
  icon: React.ReactNode;
  title: string;
  text: string;
}>) {
  return (
    <div className="rounded-2xl border border-border bg-surface p-6 shadow-[var(--shadow-card)]">
      <span className="text-accent">{icon}</span>
      <p className="mt-3 font-semibold">{title}</p>
      <p className="mt-2 text-sm text-muted leading-relaxed">{text}</p>
    </div>
  );
}

function Step({
  n,
  icon,
  title,
  text,
}: Readonly<{
  n: number;
  icon: React.ReactNode;
  title: string;
  text: string;
}>) {
  return (
    <li className="rounded-2xl border border-border bg-surface p-5 list-none">
      <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-accent/12 text-accent text-sm font-semibold">
        {n}
      </span>
      <p className="mt-4 flex items-center gap-2 font-semibold">
        {icon}
        {title}
      </p>
      <p className="mt-2 text-sm text-muted leading-relaxed">{text}</p>
    </li>
  );
}

function FlowStep({
  n,
  icon,
  title,
  text,
}: Readonly<{
  n: number;
  icon: React.ReactNode;
  title: string;
  text: string;
}>) {
  return (
    <li className="relative rounded-2xl border border-border bg-surface p-5 list-none shadow-[var(--shadow-card)]">
      <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-accent/12 text-accent text-xs font-semibold">
        {n}
      </span>
      <p className="mt-3 flex items-center gap-2 text-sm font-semibold">
        <span className="text-accent">{icon}</span>
        {title}
      </p>
      <p className="mt-2 text-sm text-muted leading-relaxed">{text}</p>
    </li>
  );
}
