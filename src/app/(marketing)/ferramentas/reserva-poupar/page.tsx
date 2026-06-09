import type { Metadata } from "next";
import Link from "next/link";
import { MarketingShell } from "@/components/marketing/MarketingShell";
import { ToolLayout } from "@/components/marketing/MarketingLayouts";
import { ReservaPouparCalculator } from "@/components/marketing/ReservaPouparCalculator";

export const metadata: Metadata = {
  title: "Simulador de reserva para poupar — quanto guardar por mês",
  description:
    "Calcule aporte mensal e limite diário com reserva para poupar. Mesma lógica do painel Saldo Real — grátis, local e privado.",
  alternates: { canonical: "/ferramentas/reserva-poupar" },
};

export default function ReservaPouparPage() {
  return (
    <MarketingShell pageId="tool_reserva_poupar">
      <ToolLayout
        pageId="tool_reserva_poupar"
        title="Quanto reservar para poupar?"
        description="Informe renda, custos fixos e quanto quer guardar. A calculadora mostra o aporte mensal e o limite diário seguro — a mesma lógica do painel Saldo Real."
      >
        <ReservaPouparCalculator />
        <p className="mt-6 text-sm text-muted leading-relaxed">
          Só quer o limite diário sem reserva?{" "}
          <Link
            href="/ferramentas/limite-diario"
            className="text-accent underline underline-offset-2"
          >
            Use a calculadora de limite diário
          </Link>
          .
        </p>
      </ToolLayout>
    </MarketingShell>
  );
}
