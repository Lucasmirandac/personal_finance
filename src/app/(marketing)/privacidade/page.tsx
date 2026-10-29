import type { Metadata } from "next";
import Link from "next/link";
import { MarketingShell } from "@/components/marketing/MarketingShell";

export const metadata: Metadata = {
  title: "Privacidade",
  description:
    "O que o Saldo Real guarda no seu navegador, o que não envia, e como funcionam as métricas opcionais.",
  alternates: { canonical: "/privacidade" },
};

export default function PrivacidadePage() {
  return (
    <MarketingShell>
      <article className="mx-auto max-w-2xl px-4 py-12 sm:px-6 sm:py-16 space-y-8 text-sm leading-relaxed">
        <header className="space-y-3">
          <p className="text-caption font-semibold uppercase tracking-wider text-accent">
            Documento
          </p>
          <h1 className="text-3xl font-semibold tracking-tight">Privacidade</h1>
          <p className="text-muted">
            Atualizado em outubro de 2026. Sem cadastro. Sem conta no Saldo
            Real.
          </p>
        </header>

        <section className="space-y-2">
          <h2 className="text-lg font-semibold">Onde ficam seus dados</h2>
          <p>
            Saldos, contas, lançamentos e backups ficam neste navegador, neste
            aparelho. O Saldo Real não opera um servidor com o seu extrato.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-semibold">O que não enviamos</h2>
          <p>
            Valores, descrições, nomes de estabelecimento, conteúdo de fatura
            ou de planilha pessoal, e a senha de um backup na nuvem, se você
            ativar.
          </p>
        </section>

        <section id="metricas" className="space-y-2 scroll-mt-24">
          <h2 className="text-lg font-semibold">Métricas opcionais</h2>
          <p>
            Se você aceitar, o Google Analytics recebe só eventos de uso: telas
            visitadas, se um passo do início foi concluído, se uma importação
            começou. Sem valores e sem texto de lançamento. Você pode recusar
            no aviso da primeira visita ou depois em{" "}
            <Link href="/config?tab=privacidade" className="underline underline-offset-2">
              Config → Privacidade
            </Link>
            .
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-semibold">Nuvem opcional</h2>
          <p>
            Backup criptografado no seu Google Drive ou Dropbox só existe se
            você ligar. A senha fica com você.
          </p>
        </section>

        <p className="text-muted">
          Uso do app: leia também os{" "}
          <Link href="/termos" className="underline underline-offset-2">
            termos
          </Link>
          .
        </p>
      </article>
    </MarketingShell>
  );
}
