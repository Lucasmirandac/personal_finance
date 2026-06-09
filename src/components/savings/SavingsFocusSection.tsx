"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Pencil } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { LabelWithInfo } from "@/components/ui/LabelWithInfo";
import { Panel } from "@/components/ui/Panel";
import { Num } from "@/components/ui/Num";
import { computeLeverageRatio } from "@/lib/leverage";
import { formatBRL } from "@/lib/format";
import { g } from "@/lib/glossary";
import { resolveAporteMensal } from "@/lib/savings";
import { rendaDisponivelFromLeverage } from "@/lib/wealth";
import { useAppStore } from "@/lib/store";
import { SavingsGoalForm } from "./SavingsGoalForm";

export function SavingsFocusSection() {
  const {
    settings,
    updateSettings,
    recurringRules,
    normalized,
    structuralCategories,
  } = useAppStore();
  const [editing, setEditing] = useState(false);

  const rendaDisponivel = useMemo(() => {
    const leverage = computeLeverageRatio({
      recurringRules,
      normalized,
      structuralCategories,
    });
    return rendaDisponivelFromLeverage(leverage);
  }, [recurringRules, normalized, structuralCategories]);

  const resolved = useMemo(
    () => resolveAporteMensal(rendaDisponivel, settings.poupanca),
    [rendaDisponivel, settings.poupanca],
  );

  const pref = settings.poupanca;

  async function handleSave(next: NonNullable<typeof pref>) {
    await updateSettings({ ...settings, poupanca: next });
    setEditing(false);
  }

  async function handleRemove() {
    await updateSettings({ ...settings, poupanca: null });
    setEditing(false);
  }

  if (rendaDisponivel <= 0) {
    return (
      <Panel className="rounded-3xl p-5 shadow-[var(--shadow-card)] ring-1 ring-border/60">
        <LabelWithInfo
          labelClassName="text-caption uppercase tracking-wider text-muted"
          info={g("reservaMensal")}
          ariaTopic="Reserva para poupar"
        >
          Reserva para poupar
        </LabelWithInfo>
        <p className="mt-3 text-sm text-muted leading-relaxed">
          Cadastre receitas e custos fixos em{" "}
          <Link href="/recorrentes" className="text-accent underline underline-offset-2">
            Recorrentes
          </Link>{" "}
          para definir quanto reservar para poupar.
        </p>
      </Panel>
    );
  }

  if (!pref && !editing) {
    return (
      <Panel className="rounded-3xl p-5 shadow-[var(--shadow-card)] ring-1 ring-border/60">
        <LabelWithInfo
          labelClassName="text-caption uppercase tracking-wider text-muted"
          info={g("reservaMensal")}
          ariaTopic="Reserva para poupar"
        >
          Reserva para poupar
        </LabelWithInfo>
        <p className="mt-2 text-sm text-muted leading-relaxed">
          Quanto da sua renda disponível você quer guardar todo mês.
        </p>
        <p className="mt-2 text-sm text-muted leading-relaxed">
          Defina uma reserva para ver o saldo diário já descontando o que você
          pretende poupar.
        </p>
        <Button
          variant="primary"
          size="sm"
          className="mt-4 rounded-full"
          onClick={() => setEditing(true)}
        >
          Definir reserva
        </Button>
      </Panel>
    );
  }

  if (editing || !pref) {
    return (
      <Panel className="rounded-3xl p-5 shadow-[var(--shadow-card)] ring-1 ring-border/60">
        <LabelWithInfo
          labelClassName="text-caption uppercase tracking-wider text-muted"
          info={g("reservaMensal")}
          ariaTopic="Reserva para poupar"
        >
          Reserva para poupar
        </LabelWithInfo>
        <p className="mt-2 text-sm text-muted leading-relaxed">
          Quanto da sua renda disponível você quer guardar todo mês.
        </p>
        <div className="mt-4">
          <SavingsGoalForm
            rendaDisponivel={rendaDisponivel}
            initial={pref ?? null}
            onSave={handleSave}
            onRemove={pref ? handleRemove : undefined}
            showRemove={!!pref}
            onCancel={pref ? () => setEditing(false) : undefined}
          />
        </div>
      </Panel>
    );
  }

  const summaryLabel =
    pref.modo === "percent"
      ? `${pref.percentual ?? 0}% da renda disponível`
      : formatBRL(pref.valorMensal ?? 0);

  return (
    <Panel className="rounded-3xl p-5 shadow-[var(--shadow-card)] ring-1 ring-border/60">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <LabelWithInfo
          labelClassName="text-caption uppercase tracking-wider text-muted"
          info={g("reservaMensal")}
          ariaTopic="Reserva para poupar"
        >
          Reserva para poupar
        </LabelWithInfo>
        <Button
          variant="ghost"
          size="sm"
          className="rounded-full"
          onClick={() => setEditing(true)}
          aria-label="Editar reserva para poupar"
        >
          <Pencil size={13} />
        </Button>
      </div>

      <Num className="mt-3 block text-2xl font-semibold tracking-tight num-display">
        {formatBRL(resolved.aporteMensal)}
      </Num>
      <p className="mt-1 text-sm text-muted">/mês · {summaryLabel}</p>
      <p className="mt-3 text-xs text-muted leading-relaxed">
        Esse valor já é descontado do saldo diário e entra na projeção de
        patrimônio.
      </p>
    </Panel>
  );
}
