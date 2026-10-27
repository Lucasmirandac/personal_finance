import type { Metadata } from "next";
import Link from "next/link";
import { MarketingShell } from "@/components/marketing/MarketingShell";

export const metadata: Metadata = {
  title: "Termos de uso",
  description:
    "O Saldo Real é gratuito, sem cadastro. Seus dados ficam no navegador. Apoio no APOIA.se é opcional.",
  alternates: { canonical: "/termos" },
};

export default function TermosPage() {
  return (
    <MarketingShell>
      <article className="mx-auto max-w-2xl px-4 py-12 sm:px-6 sm:py-16 space-y-8 text-sm leading-relaxed">
        <header className="space-y-3">
          <p className="text-caption font-semibold uppercase tracking-wider text-accent">
            Documento
          </p>
          <h1 className="text-3xl font-semibold tracking-tight">Termos de uso</h1>
          <p className="text-muted">Atualizado em outubro de 2026.</p>
        </header>

        <section className="space-y-2">
          <h2 className="text-lg font-semibold">O que é o Saldo Real</h2>
          <p>
            Um painel financeiro que roda no seu navegador. Não há criação de
            conta nem login. Ao clicar em Começar, o app guarda dados neste
            aparelho.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-semibold">Preço</h2>
          <p>
            O app é gratuito, sem paywall e sem anúncio baseado nos seus
            lançamentos. Apoiar no APOIA.se é opcional e não destrava função
            escondida.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-semibold">Sua responsabilidade</h2>
          <p>
            Os números vêm do que você cadastra ou cola. Confira antes de
            decidir um gasto. Exporte um backup se quiser levar os dados para
            outro aparelho.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-semibold">Privacidade</h2>
          <p>
            O detalhe do que fica no aparelho e o que as métricas opcionais
            podem ver está em{" "}
            <Link href="/privacidade" className="underline underline-offset-2">
              Privacidade
            </Link>
            .
          </p>
        </section>
      </article>
    </MarketingShell>
  );
}
