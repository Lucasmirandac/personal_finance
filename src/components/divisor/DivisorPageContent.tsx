"use client";

import Link from "next/link";
import { DivisorDeAguasStep } from "@/components/onboarding/DivisorDeAguasStep";
import { Panel } from "@/components/ui/Panel";
import { useAppStore } from "@/lib/store";
import { ArrowRight, List } from "lucide-react";

export function DivisorPageContent() {
  const { recurringRules } = useAppStore();
  const hasActiveRules = recurringRules.some((rule) => rule.ativo);

  return (
    <div className="space-y-6 lg:space-y-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="max-w-2xl">
          <p className="text-xs uppercase tracking-[0.22em] text-muted">
            Divisor de Águas
          </p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">
            Separe o que é fixo do que você controla.
          </h1>
          <p className="mt-2 text-sm leading-relaxed text-muted">
            Cadastre rendas e custos fixos para calcular sua renda disponível,
            limite diário e projeções com mais precisão.
          </p>
        </div>
        <Link
          href="/recorrentes"
          className="inline-flex items-center gap-1.5 rounded-full border border-border bg-surface/80 px-3 py-1.5 text-xs font-medium shadow-sm hover:bg-surface-2"
        >
          <List size={13} />
          Gerenciar todas as regras
          <ArrowRight size={13} />
        </Link>
      </div>

      {!hasActiveRules && (
        <Panel className="rounded-3xl p-5 shadow-[var(--shadow-card)]">
          <p className="text-sm font-medium">Comece pelo básico</p>
          <p className="mt-2 text-sm text-muted leading-relaxed">
            Adicione pelo menos uma renda (salário, freela) e um custo fixo
            (aluguel, internet). Quanto mais completo, melhor fica seu limite
            diário na home.
          </p>
        </Panel>
      )}

      <Panel className="rounded-3xl p-4 sm:p-5 shadow-[var(--shadow-card)]">
        <DivisorDeAguasStep />
      </Panel>
    </div>
  );
}
