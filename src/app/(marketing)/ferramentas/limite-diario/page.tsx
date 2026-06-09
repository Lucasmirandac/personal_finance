import type { Metadata } from "next";
import Link from "next/link";
import { MarketingShell } from "@/components/marketing/MarketingShell";
import { ToolLayout } from "@/components/marketing/MarketingLayouts";
import { LimiteDiarioCalculator } from "@/components/marketing/LimiteDiarioCalculator";

export const metadata: Metadata = {
  title: "Calculadora de limite diário — quanto posso gastar por dia",
  description:
    "Calcule quanto pode gastar por dia até o fim do mês com renda, custos fixos e fatura aberta. Grátis, local e privado.",
  alternates: { canonical: "/ferramentas/limite-diario" },
};

export default function LimiteDiarioPage() {
  return (
    <MarketingShell pageId="tool_limite_diario">
      <ToolLayout
        pageId="tool_limite_diario"
        title="Quanto posso gastar por dia?"
        description="Informe renda e custos fixos do mês. A calculadora mostra um limite diário seguro até o fim do mês — a mesma lógica do painel Saldo Real."
      >
        <LimiteDiarioCalculator />
        <p className="mt-6 text-sm text-muted leading-relaxed">
          Quer reservar parte da renda antes de calcular?{" "}
          <Link
            href="/ferramentas/reserva-poupar"
            className="text-accent underline underline-offset-2"
          >
            Use o simulador de reserva
          </Link>
          .
        </p>
      </ToolLayout>
    </MarketingShell>
  );
}
