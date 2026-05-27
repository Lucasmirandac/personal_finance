"use client";

import Link from "next/link";
import { useState } from "react";
import { ImportPanel } from "@/components/ImportPanel";
import { AccountsPanel } from "@/components/AccountsPanel";
import { QuickAddModal } from "@/components/QuickAddModal";
import { useAppStore } from "@/lib/store";
import { getSetupSteps } from "@/lib/setupStatus";
import { Button } from "@/components/ui/Button";
import { ArrowRight, Check } from "lucide-react";
import clsx from "clsx";

const linkButtonClasses =
  "inline-flex items-center justify-center gap-1.5 font-medium rounded-md border transition-[background,border-color] whitespace-nowrap border-border bg-surface text-foreground hover:bg-surface-2 hover:border-border-strong text-xs px-2 py-1";

export function Onboarding() {
  const { dataset, settings, recurringRules, accounts, updateSettings } =
    useAppStore();
  const [showImport, setShowImport] = useState(false);
  const [showAccounts, setShowAccounts] = useState(false);
  const [showQuickAdd, setShowQuickAdd] = useState(false);

  const steps = getSetupSteps(dataset, settings, recurringRules, accounts);

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      <div className="text-center">
        <h1 className="text-xl font-semibold tracking-tight">
          Bem-vindo ao seu painel financeiro
        </h1>
        <p className="text-muted text-sm mt-1">
          Três passos para ver seu saldo projetado e entender seus gastos.
        </p>
      </div>

      <ol className="space-y-3">
        {steps.map((step, i) => (
          <li
            key={step.id}
            className={clsx(
              "bg-surface border border-border rounded-lg p-4 flex gap-4 items-start",
              step.done && "border-success/30",
            )}
          >
            <span
              className={clsx(
                "flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-semibold",
                step.done
                  ? "bg-success text-surface"
                  : "bg-surface-2 text-muted",
              )}
            >
              {step.done ? <Check size={16} /> : i + 1}
            </span>
            <div className="flex-1 min-w-0">
              <div className="font-medium text-sm">{step.label}</div>
              {step.id === "csv" && (
                <p className="text-xs text-muted mt-0.5">
                  Importe a fatura Inter ou Nubank em CSV.
                </p>
              )}
              {step.id === "contas" && (
                <p className="text-xs text-muted mt-0.5">
                  Crie suas contas e informe os saldos atuais.
                </p>
              )}
              {step.id === "recorrentes" && (
                <p className="text-xs text-muted mt-0.5">
                  Salário, aluguel e outras entradas/saídas mensais.
                </p>
              )}
              <div className="mt-2 flex flex-wrap gap-2">
                {step.id === "csv" && !step.done && (
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => {
                      setShowImport(true);
                      setShowAccounts(false);
                    }}
                  >
                    Importar CSV
                  </Button>
                )}
                {step.id === "contas" && !step.done && (
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => {
                      setShowAccounts(true);
                      setShowImport(false);
                    }}
                  >
                    Configurar contas
                  </Button>
                )}
                {step.id === "contas" && step.done && accounts.length > 0 && (
                  <Button size="sm" onClick={() => setShowQuickAdd(true)}>
                    Adicionar primeiro gasto
                  </Button>
                )}
                {step.id === "recorrentes" && (
                  <Link href="/recorrentes" className={linkButtonClasses}>
                    Ir para Recorrentes
                    <ArrowRight size={13} />
                  </Link>
                )}
                {step.done && step.id !== "recorrentes" && (
                  <span className="text-xs text-success">Concluído</span>
                )}
              </div>
            </div>
          </li>
        ))}
      </ol>

      {showImport && (
        <div className="bg-surface border border-border rounded-lg p-4">
          <ImportPanel redirectAfterImport="/" compact />
        </div>
      )}

      {showAccounts && (
        <AccountsPanel
          settings={settings}
          onSaveSettings={async (next) => {
            await updateSettings(next);
            setShowAccounts(false);
          }}
        />
      )}

      <QuickAddModal open={showQuickAdd} onClose={() => setShowQuickAdd(false)} />
    </div>
  );
}
