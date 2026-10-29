import type { Metadata } from "next";
import Link from "next/link";
import { MarketingShell } from "@/components/marketing/MarketingShell";
import { GuideLayout } from "@/components/marketing/MarketingLayouts";

export const metadata: Metadata = {
  title: "Como importar fatura Nubank — guia Saldo Real",
  description:
    "Passo a passo para baixar a fatura no app Nubank e importar no Saldo Real. Configure o ciclo da fatura para não errar o mês.",
  alternates: { canonical: "/guias/importar-nubank" },
};

export default function GuiaNubankPage() {
  return (
    <MarketingShell pageId="guide_nubank">
      <GuideLayout
        pageId="guide_nubank"
        title="Como importar fatura Nubank"
        description="Baixe a fatura no app Nubank e importe no Saldo Real em poucos minutos — tudo no navegador, sem cadastro."
        updatedAt="outubro de 2026"
      >
        <section>
          <h2>O que você precisa</h2>
          <ul>
            <li>Conta Nubank com fatura que dá para baixar no app</li>
            <li>Navegador moderno (Chrome, Safari, Firefox)</li>
            <li>Saldo Real aberto em <Link href="/comecar">Começar</Link></li>
          </ul>
        </section>

        <section>
          <h2>Baixar a fatura no Nubank</h2>
          <ol>
            <li>Abra o app Nubank e acesse a área de faturas ou extrato.</li>
            <li>Procure a opção de exportar ou baixar o extrato. O arquivo vem como .csv.</li>
            <li>Salve o arquivo no dispositivo — o formato esperado usa colunas <code>date</code>, <code>title</code> e <code>amount</code>.</li>
          </ol>
          <p>
            Dica: se o arquivo vier com separador diferente, abra no Excel ou
            Google Planilhas e exporte novamente como CSV UTF-8.
          </p>
        </section>

        <section>
          <h2>Importar no Saldo Real</h2>
          <ol>
            <li>Em Config → Importar, arraste o arquivo .csv ou clique para selecionar.</li>
            <li>Na primeira importação, informe dia de fechamento e pagamento da fatura — isso define em qual mês cada compra entra.</li>
            <li>Revise o resumo e continue para o painel.</li>
          </ol>
        </section>

        <section>
          <h2>Problemas comuns</h2>
          <ul>
            <li>
              <strong>Formato não reconhecido:</strong> confira se as colunas são
              date, title e amount (minúsculas). O app lê só o arquivo .csv da
              fatura, não PDF nem OFX.
            </li>
            <li>
              <strong>Compras no mês errado:</strong> ajuste fechamento/pagamento
              em Config → Cartões e reimporte se necessário.
            </li>
            <li>
              <strong>Linhas ignoradas:</strong> datas ou valores inválidos são
              pulados — corrija no arquivo e importe de novo.
            </li>
          </ul>
        </section>

        <p>
          Próximo passo:{" "}
          <Link href="/guias/importar-inter" className="text-accent underline underline-offset-2">
            guia de importação Inter
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
