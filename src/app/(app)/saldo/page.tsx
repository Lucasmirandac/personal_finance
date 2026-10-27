"use client";

import { SaldoPageContent } from "@/components/SaldoPageContent";
import { EmptyState } from "@/components/EmptyState";
import { useAppStore } from "@/lib/store";
import { hasCashAccount } from "@/lib/setupStatus";

export default function SaldoPage() {
  const { loaded, hasAnalysis, accounts } = useAppStore();

  if (!loaded) return <div className="text-muted">Carregando…</div>;
  if (!hasAnalysis && !hasCashAccount(accounts)) {
    return (
      <EmptyState
        title="Configure seus dados"
        description="Cadastre uma conta de débito para ver o saldo de hoje. Leva um minuto."
      />
    );
  }

  return <SaldoPageContent />;
}
