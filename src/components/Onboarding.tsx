"use client";

import Link from "next/link";
import { useState } from "react";
import { ImportPanel } from "@/components/ImportPanel";
import { AccountsPanel } from "@/components/AccountsPanel";
import { QuickAddModal } from "@/components/QuickAddModal";
import { useAppStore } from "@/lib/store";
import { getSetupSteps } from "@/lib/setupStatus";
import { ArrowRight, Check } from "lucide-react";
import clsx from "clsx";

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
        <p className="subtle text-sm mt-1">
          Três passos para ver seu saldo projetado e entender seus gastos.
        </p>
      </div>

      <ol className="space-y-3">
        {steps.map((step, i) => (
          <li
            key={step.id}
            className={clsx(
              "panel p-4 flex gap-4 items-start",
              step.done && "border-[var(--success)]/30",
            )}
          >
            <span
              className={clsx(
                "flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-semibold",
                step.done
                  ? "bg-[var(--success)] text-[var(--surface)]"
                  : "bg-[var(--surface-2)] text-[var(--muted)]",
              )}
            >
              {step.done ? <Check size={16} /> : i + 1}
            </span>
            <div className="flex-1 min-w-0">
              <div className="font-medium text-sm">{step.label}</div>
              {step.id === "csv" && (
                <p className="text-xs subtle mt-0.5">
                  Importe a fatura Inter ou Nubank em CSV.
                </p>
              )}
              {step.id === "contas" && (
                <p className="text-xs subtle mt-0.5">
                  Crie suas contas e informe os saldos atuais.
                </p>
              )}
              {step.id === "recorrentes" && (
                <p className="text-xs subtle mt-0.5">
                  Salário, aluguel e outras entradas/saídas mensais.
                </p>
              )}
              <div className="mt-2 flex flex-wrap gap-2">
                {step.id === "csv" && !step.done && (
                  <button
                    type="button"
                    className="btn btn-primary btn-sm"
                    onClick={() => {
                      setShowImport(true);
                      setShowAccounts(false);
                    }}
                  >
                    Importar CSV
                  </button>
                )}
                {step.id === "contas" && !step.done && (
                  <button
                    type="button"
                    className="btn btn-primary btn-sm"
                    onClick={() => {
                      setShowAccounts(true);
                      setShowImport(false);
                    }}
                  >
                    Configurar contas
                  </button>
                )}
                {step.id === "contas" && step.done && accounts.length > 0 && (
                  <button
                    type="button"
                    className="btn btn-sm"
                    onClick={() => setShowQuickAdd(true)}
                  >
                    Adicionar primeiro gasto
                  </button>
                )}
                {step.id === "recorrentes" && (
                  <Link href="/recorrentes" className="btn btn-sm">
                    Ir para Recorrentes
                    <ArrowRight size={13} />
                  </Link>
                )}
                {step.done && step.id !== "recorrentes" && (
                  <span className="text-xs text-[var(--success)]">Concluído</span>
                )}
              </div>
            </div>
          </li>
        ))}
      </ol>

      {showImport && (
        <div className="panel p-4">
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
