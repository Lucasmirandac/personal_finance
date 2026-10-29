import type { Metadata } from "next";
import Link from "next/link";
import { MarketingShell } from "@/components/marketing/MarketingShell";
import { GuideLayout } from "@/components/marketing/MarketingLayouts";

export const metadata: Metadata = {
  title: "Como importar fatura Inter — guia Saldo Real",
  description:
    "Baixe a fatura no app Inter e importe no Saldo Real. Configure fechamento e pagamento para parcelas caírem no mês certo.",
  alternates: { canonical: "/guias/importar-inter" },
};

export default function GuiaInterPage() {
  return (
    <MarketingShell pageId="guide_inter">
      <GuideLayout
        pageId="guide_inter"
        title="Como importar fatura Inter"
        description="Baixe o extrato do cartão Inter e importe no Saldo Real. Parcelas são recalculadas conforme o ciclo da sua fatura."
        updatedAt="outubro de 2026"
      >
        <section>
          <h2>O que você precisa</h2>
          <ul>
            <li>Fatura Inter que dá para baixar no app ou no Internet Banking</li>
            <li>Colunas: Data, Lançamento, Categoria, Tipo e Valor</li>
            <li>Dia de fechamento e pagamento da fatura anotados</li>
          </ul>
        </section>

        <section>
          <h2>Baixar a fatura no Inter</h2>
          <ol>
            <li>Acesse o Internet Banking ou app Inter na área de cartão/fatura.</li>
            <li>Exporte o extrato da fatura. O arquivo vem como .csv.</li>
            <li>Verifique se o cabeçalho contém Data, Lançamento, Categoria, Tipo e Valor.</li>
          </ol>
        </section>

        <section>
          <h2>Importar no Saldo Real</h2>
          <ol>
            <li>Abra Config → Importar depois de cadastrar o cartão.</li>
            <li>Selecione o arquivo .csv da fatura Inter.</li>
            <li>
              Na primeira importação, cadastre fechamento e pagamento — essencial
              para parcelas Inter caírem no mês correto.
            </li>
            <li>Confirme e explore o painel em <Link href="/saldo">Hoje</Link>.</li>
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
              cinco colunas do Inter. O app lê só o arquivo .csv da fatura, não
              PDF nem OFX.
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
            usar sem importar fatura
          </Link>
        </p>
      </GuideLayout>
    </MarketingShell>
  );
}
