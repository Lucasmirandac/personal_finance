"use client";

import { SaldoPageContent } from "@/components/SaldoPageContent";
import { EmptyState } from "@/components/EmptyState";
import { useAppStore } from "@/lib/store";

export default function SaldoPage() {
  const { loaded, hasAnalysis } = useAppStore();

  if (!loaded) return <div className="subtle">Carregando…</div>;
  if (!hasAnalysis) {
    return (
      <EmptyState
        title="Configure seus dados"
        description="Importe um CSV ou cadastre recorrentes para ver a projeção de saldo."
      />
    );
  }

  return <SaldoPageContent />;
}
