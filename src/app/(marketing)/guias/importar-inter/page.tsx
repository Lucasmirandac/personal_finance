import type { Metadata } from "next";
import Link from "next/link";
import { MarketingShell } from "@/components/marketing/MarketingShell";
import { GuideLayout } from "@/components/marketing/MarketingLayouts";

export const metadata: Metadata = {
  title: "Como importar fatura Inter em CSV — guia Saldo Real",
  description:
    "Exporte o extrato CSV do Inter e importe no Saldo Real. Configure fechamento e pagamento para parcelas caírem no mês certo.",
  alternates: { canonical: "/guias/importar-inter" },
};

export default function GuiaInterPage() {
  return (
    <MarketingShell pageId="guide_inter">
      <GuideLayout
        pageId="guide_inter"
        title="Como importar fatura Inter (CSV)"
        description="Exporte o extrato do cartão Inter e importe no Saldo Real. Parcelas são recalculadas conforme o ciclo da sua fatura."
        updatedAt="junho de 2026"
      >
        <section>
          <h2>O que você precisa</h2>
          <ul>
            <li>Extrato ou fatura Inter exportável em CSV</li>
            <li>Colunas: Data, Lançamento, Categoria, Tipo e Valor</li>
            <li>Dia de fechamento e pagamento da fatura anotados</li>
          </ul>
        </section>

        <section>
          <h2>Exportar CSV no Inter</h2>
          <ol>
            <li>Acesse o Internet Banking ou app Inter na área de cartão/fatura.</li>
            <li>Exporte o extrato da fatura no formato CSV.</li>
            <li>Verifique se o cabeçalho contém Data, Lançamento, Categoria, Tipo e Valor.</li>
          </ol>
        </section>

        <section>
          <h2>Importar no Saldo Real</h2>
          <ol>
            <li>Abra <Link href="/comecar">/comecar</Link> ou Config → Importar.</li>
            <li>Selecione o arquivo CSV do Inter.</li>
            <li>
              Na primeira importação, cadastre fechamento e pagamento — essencial
              para parcelas Inter caírem no mês correto.
            </li>
            <li>Confirme e explore o painel em <Link href="/saldo">/saldo</Link>.</li>
          </ol>
        </section>

        <section>
          <h2>Problemas comuns</h2>
          <ul>
            <li>
              <strong>Parcelas no mês errado:</strong> o dia de fechamento
              informado na importação define a fatura. Confira em Config → Cartões.
            </li>
            <li>
              <strong>Colunas faltando:</strong> o parser exige exatamente as
              cinco colunas do Inter.
            </li>
            <li>
              <strong>Valores com vírgula:</strong> o formato R$ 1.234,56 é
              suportado nativamente.
            </li>
          </ul>
        </section>

        <p>
          Ver também:{" "}
          <Link href="/guias/importar-nubank" className="text-accent underline underline-offset-2">
            guia de importação Nubank
          </Link>
          {" · "}
          <Link href="/guias/usar-sem-importar" className="text-accent underline underline-offset-2">
            usar sem importar CSV
          </Link>
        </p>
      </GuideLayout>
    </MarketingShell>
  );
}
