"use client";

import { SaldoPageContent } from "@/components/SaldoPageContent";
import { EmptyState } from "@/components/EmptyState";
import { useAppStore } from "@/lib/store";

export default function SaldoPage() {
  const { loaded, hasAnalysis } = useAppStore();

  if (!loaded) return <div className="text-muted">Carregando…</div>;
  if (!hasAnalysis) {
    return (
      <EmptyState
        title="Configure seus dados"
        description="Cadastre contas e lance o mês na grade para ver o saldo de hoje."
      />
    );
  }

  return <SaldoPageContent />;
}
