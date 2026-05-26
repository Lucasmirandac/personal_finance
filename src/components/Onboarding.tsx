"use client";

import Link from "next/link";
import { useState } from "react";
import { ImportPanel } from "@/components/ImportPanel";
import { SettingsPanel } from "@/components/SettingsPanel";
import { useAppStore } from "@/lib/store";
import { getSetupSteps } from "@/lib/setupStatus";
import { Fonte } from "@/lib/types";
import { ArrowRight, Check } from "lucide-react";
import clsx from "clsx";

export function Onboarding() {
  const { dataset, settings, recurringRules, updateSettings } = useAppStore();
  const [showImport, setShowImport] = useState(false);
  const [showSettings, setShowSettings] = useState(false);

  const steps = getSetupSteps(dataset, settings, recurringRules);
  const cardSources = [...new Set(dataset.sources.map((s) => s.fonte))] as Fonte[];

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
              {step.id === "cartoes" && (
                <p className="text-xs subtle mt-0.5">
                  Informe saldo inicial e dias de fechamento/pagamento.
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
                      setShowSettings(false);
                    }}
                  >
                    Importar CSV
                  </button>
                )}
                {step.id === "cartoes" && !step.done && (
                  <button
                    type="button"
                    className="btn btn-primary btn-sm"
                    onClick={() => {
                      setShowSettings(true);
                      setShowImport(false);
                    }}
                  >
                    Configurar cartões
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

      {showSettings && (
        <SettingsPanel
          settings={settings}
          cardSources={cardSources}
          onSave={async (next) => {
            await updateSettings(next);
            setShowSettings(false);
          }}
          onCancel={() => setShowSettings(false)}
        />
      )}
    </div>
  );
}
