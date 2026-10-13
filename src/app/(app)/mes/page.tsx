"use client";

import { EmptyState } from "@/components/EmptyState";
import { MonthGridPageContent } from "@/components/mes/MonthGridPageContent";
import { useAppStore } from "@/lib/store";

export default function MesPage() {
  const { loaded, accounts } = useAppStore();

  if (!loaded) return <div className="text-muted">Carregando…</div>;
  if (accounts.filter((a) => a.ativa).length === 0) {
    return (
      <EmptyState
        title="Cadastre uma conta"
        description="A grade do mês lança em contas e cartões. Cadastre ao menos uma conta para começar."
      />
    );
  }

  return <MonthGridPageContent />;
}
