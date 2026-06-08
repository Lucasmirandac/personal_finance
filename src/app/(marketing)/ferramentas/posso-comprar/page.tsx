import type { Metadata } from "next";
import { MarketingShell } from "@/components/marketing/MarketingShell";
import { ToolLayout } from "@/components/marketing/MarketingLayouts";
import { PossoComprarCalculator } from "@/components/marketing/PossoComprarCalculator";

export const metadata: Metadata = {
  title: "Posso comprar isso? — simulador de compra parcelada",
  description:
    "Simule se uma compra cabe no seu mês com semáforo verde, amarelo ou vermelho. Cálculo local, sem cadastro.",
  alternates: { canonical: "/ferramentas/posso-comprar" },
};

export default function PossoComprarPage() {
  return (
    <MarketingShell pageId="tool_posso_comprar">
      <ToolLayout
        pageId="tool_posso_comprar"
        title="Posso comprar isso?"
        description="Informe valor, parcelas, renda disponível e saldo. Veja se a compra estica o mês — versão simplificada do simulador do app."
      >
        <PossoComprarCalculator />
      </ToolLayout>
    </MarketingShell>
  );
}
