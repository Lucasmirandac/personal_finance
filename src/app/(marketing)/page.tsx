import type { Metadata } from "next";
import Link from "next/link";
import {
  MarketingCtaLink,
  MarketingShell,
} from "@/components/marketing/MarketingShell";
import { getSiteUrl } from "@/lib/marketing/site";
import {
  LineChart,
  ShieldCheck,
  Upload,
  WalletCards,
} from "lucide-react";

export const metadata: Metadata = {
  title: "Saldo Real — seu saldo real, só no seu navegador",
  description:
    "Controle financeiro local e privado. Importe faturas Nubank e Inter, projete saldo, calcule limite diário e orçamentos — sem cadastro e sem enviar dados.",
  alternates: { canonical: "/" },
  openGraph: {
    title: "Saldo Real — finanças locais e privadas",
    description:
      "Importe CSV, projete saldo e saiba quanto pode gastar por dia. Tudo no navegador.",
    url: "/",
  },
};

const FAQ = [
  {
    q: "Meus dados ficam onde?",
    a: "No IndexedDB do seu navegador. Nada é enviado para servidores do Saldo Real.",
  },
  {
    q: "Preciso criar conta?",
    a: "Não. Abra o app, cadastre conta e renda no onboarding e comece a usar.",
  },
  {
    q: "Funciona offline?",
    a: "Sim, como PWA. Depois de carregar, o painel funciona com seus dados locais.",
  },
  {
    q: "Quais bancos são suportados?",
    a: "Importação CSV do Nubank e Inter. Gastos manuais para qualquer conta.",
  },
];

export default function LandingPage() {
  const siteUrl = getSiteUrl();
  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "SoftwareApplication",
        name: "Saldo Real",
        applicationCategory: "FinanceApplication",
        operatingSystem: "Web",
        offers: { "@type": "Offer", price: "0", priceCurrency: "BRL" },
        description:
          "Painel financeiro pessoal local-first para importar faturas, projetar saldo e controlar orçamentos.",
        url: siteUrl,
      },
      {
        "@type": "FAQPage",
        mainEntity: FAQ.map((item) => ({
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
            Local-first · Sem cadastro
          </p>
          <h1 className="mt-4 text-4xl font-semibold tracking-tight sm:text-5xl sm:leading-[1.1]">
            Seu saldo real.
            <span className="block text-muted">Só no seu navegador.</span>
          </h1>
          <p className="mt-5 text-lg text-muted leading-relaxed max-w-xl">
            Importe faturas do Nubank e Inter, projete os próximos meses e saiba
            quanto pode gastar hoje — sem enviar um centavo de dado para a nuvem.
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
              href="/ferramentas/limite-diario"
              className="inline-flex items-center rounded-full border border-border bg-surface px-5 py-2.5 text-sm font-medium hover:bg-surface-2"
            >
              Calcular limite diário
            </Link>
          </div>
        </div>
      </section>

      <section className="border-y border-border/60 bg-surface/60">
        <div className="mx-auto grid max-w-5xl gap-6 px-4 py-14 sm:grid-cols-3 sm:px-6">
          <Pillar
            icon={<ShieldCheck size={22} />}
            title="100% local"
            text="Seus extratos e saldos ficam no dispositivo. Backup JSON quando você quiser."
          />
          <Pillar
            icon={<Upload size={22} />}
            title="CSV Nubank e Inter"
            text="Importe faturas e classifique gastos automaticamente."
          />
          <Pillar
            icon={<LineChart size={22} />}
            title="Limite diário"
            text="Renda − fixos − fatura = quanto pode gastar por dia, sem planilha."
          />
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
            icon={<LineChart size={18} />}
            title="Veja o painel"
            text="Saldo hoje, faturas, limite diário e projeção 90 dias."
          />
        </ol>
      </section>

      <section className="mx-auto max-w-5xl px-4 pb-20 sm:px-6">
        <h2 className="text-2xl font-semibold tracking-tight">Perguntas frequentes</h2>
        <dl className="mt-8 space-y-6">
          {FAQ.map((item) => (
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
