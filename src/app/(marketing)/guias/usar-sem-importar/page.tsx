import type { Metadata } from "next";
import Link from "next/link";
import { MarketingShell } from "@/components/marketing/MarketingShell";
import { GuideLayout } from "@/components/marketing/MarketingLayouts";
import { CSV_OPTIONAL_LINE } from "@/lib/marketing/copy";

export const metadata: Metadata = {
  title: "Como usar o Saldo Real sem importar fatura — qualquer banco",
  description:
    "Use o Saldo Real com Bradesco, Itaú, C6 ou qualquer banco: cadastre contas, renda no Divisor e lance gastos manualmente. Importar a fatura do cartão é opcional.",
  alternates: { canonical: "/guias/usar-sem-importar" },
};

export default function GuiaSemImportarPage() {
  return (
    <MarketingShell pageId="guide_sem_importar">
      <GuideLayout
        pageId="guide_sem_importar"
        title="Como usar o Saldo Real sem importar fatura"
        description={`${CSV_OPTIONAL_LINE} Este guia mostra o caminho manual — ideal para qualquer banco.`}
        updatedAt="outubro de 2026"
        ctaTitle="Pronto para começar manualmente?"
        ctaDescription="Abra o Saldo Real, cadastre suas contas e renda no Divisor de Águas — leva poucos minutos."
        ctaLabel="Começar no app"
      >
        <section>
          <h2>Para quem é</h2>
          <p>
            Este guia é para você que usa qualquer banco ou cartão — Bradesco,
            Itaú, C6, caixas digitais, cooperativas — e não tem (ou não quer)
            baixar a fatura do Nubank ou Inter.
          </p>
          <p>
            O Saldo Real funciona por cadastro manual: contas, renda, custos
            fixos e lançamentos no Quick Add. Limite diário, reserva para poupar
            e projeção de saldo funcionam da mesma forma.
          </p>
        </section>

        <section>
          <h2>Passo a passo</h2>
          <ol>
            <li>
              Abra <Link href="/comecar">Começar</Link> e cadastre uma conta
              com o saldo de hoje e um cartão, se tiver.
            </li>
            <li>
              No último passo, escolha <strong>Ver saldo de hoje</strong>. Trazer
              fatura ou planilha é opcional — você pode pular.
            </li>
            <li>
              <strong>Divisor de Águas:</strong> em{" "}
              <Link href="/divisor">Recorrentes</Link>, cadastre receitas e
              custos fixos do mês. Isso libera o limite diário no painel.
            </li>
            <li>
              <strong>Quick Add:</strong> lance gastos e receitas pelo botão +
              ou em <Link href="/extrato">Extrato</Link>. Cada lançamento entra
              na projeção.
            </li>
            <li>
              Acesse <Link href="/saldo">Hoje</Link> para ver limite diário,
              faturas e projeção dos próximos meses.
            </li>
          </ol>
        </section>

        <section>
          <h2>O que você ganha (sem importar fatura)</h2>
          <ul>
            <li>Saldo projetado com base em contas e recorrentes</li>
            <li>Limite diário seguro até o fim do mês</li>
            <li>Reserva para poupar e Projeção de Paz Futura</li>
            <li>Orçamentos por categoria e simulador &quot;posso comprar?&quot;</li>
            <li>Backup JSON local quando quiser</li>
          </ul>
        </section>

        <section>
          <h2>Quando importar a fatura depois</h2>
          <p>
            Se você usa Nubank ou Inter, pode baixar a fatura no app do banco
            (o arquivo vem como .csv) e importar a qualquer momento em{" "}
            <Link href="/config?tab=importar">Config → Importar</Link>. A
            importação classifica gastos automaticamente e poupa digitação.
          </p>
          <p>
            Guias específicos:{" "}
            <Link href="/guias/importar-nubank">importar fatura Nubank</Link>,{" "}
            <Link href="/guias/importar-inter">importar fatura Inter</Link>.
          </p>
        </section>

        <section>
          <h2>Ver também</h2>
          <ul>
            <li>
              <Link href="/guias/como-poupar">Como reservar para poupar</Link>
            </li>
            <li>
              <Link href="/ferramentas/limite-diario">
                Calculadora de limite diário
              </Link>
            </li>
            <li>
              <Link href="/ferramentas/reserva-poupar">
                Simulador de reserva para poupar
              </Link>
            </li>
          </ul>
        </section>
      </GuideLayout>
    </MarketingShell>
  );
}
