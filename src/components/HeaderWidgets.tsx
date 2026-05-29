"use client";

import Link from "next/link";
import { useMemo } from "react";
import clsx from "clsx";
import { useAppStore } from "@/lib/store";
import { getSetupSteps, isProjectionReady } from "@/lib/setupStatus";
import { projectDailyBalance } from "@/lib/projection";
import { daysSince } from "@/lib/backup";
import {
  budgetAlertSummary,
  budgetUsageForMonth,
} from "@/lib/budgets";

const chipLinkBase =
  "inline-flex items-center px-2 py-0.5 rounded-full font-mono bg-surface/70 border border-border text-muted shadow-sm hover:border-border-strong";

export function BudgetAlertWidget() {
  const { normalized, budgets, hasAnalysis } = useAppStore();

  const usages = useMemo(
    () => budgetUsageForMonth(normalized, budgets),
    [normalized, budgets],
  );
  const alerts = useMemo(() => budgetAlertSummary(usages), [usages]);

  if (!hasAnalysis || usages.length === 0) return null;
  if (alerts.warning + alerts.danger === 0) return null;

  const hasDanger = alerts.danger > 0;
  const dangerPlural = alerts.danger > 1 ? "s" : "";
  const label = hasDanger
    ? `${alerts.danger} orçamento${dangerPlural} estourado${dangerPlural}`
    : `${alerts.warning} perto do limite`;

  return (
    <Link
      href="/dashboard?tab=orcamentos"
      className={clsx(
        chipLinkBase,
        "hidden sm:inline-flex gap-1 text-[10px]",
        hasDanger
          ? "text-danger border-[var(--danger)]/40"
          : "text-warning border-[var(--warning)]/40",
      )}
      title="Ver orçamentos do mês"
    >
      {label}
    </Link>
  );
}

export function BackupReminder() {
  const { lastBackupAt, hasAnalysis } = useAppStore();
  const days = daysSince(lastBackupAt);

  if (!hasAnalysis) return null;
  if (days === null || days <= 14) return null;

  const urgent = days > 30;

  return (
    <Link
      href="/config?tab=backup"
      className={clsx(
        chipLinkBase,
        "hidden sm:inline-flex gap-1 text-[10px]",
        urgent
          ? "text-danger border-[var(--danger)]/40"
          : "text-muted",
      )}
      title="Faça backup dos seus dados locais"
    >
      Backup há {days}d
    </Link>
  );
}

export function SetupIndicator() {
  const { dataset, settings, recurringRules, accounts } = useAppStore();
  const steps = getSetupSteps(dataset, settings, recurringRules, accounts);
  const allDone = steps.every((s) => s.done);

  if (allDone) return null;

  return (
    <Link
      href="/config"
      className={clsx(chipLinkBase, "hidden sm:inline-flex gap-1.5")}
      title={steps.map((s) => `${s.label}: ${s.done ? "ok" : "pendente"}`).join("\n")}
    >
      {steps.map((s) => (
        <span
          key={s.id}
          className={clsx(
            "w-2 h-2 rounded-full",
            s.done ? "bg-[var(--success)]" : "bg-[var(--warning)]",
          )}
          aria-hidden
        />
      ))}
      <span className="text-[10px] text-muted">Setup</span>
    </Link>
  );
}

export function Saldo30Widget() {
  const { dataset, normalized, recurringRules, settings, accounts } =
    useAppStore();

  const ready = isProjectionReady(dataset, settings, accounts);

  const saldo30 = useMemo(() => {
    if (!ready) return null;
    const { series } = projectDailyBalance({
      normalized,
      recurringRules,
      settings,
      accounts,
    });
    if (series.length === 0) return null;
    const today = new Date().toISOString().slice(0, 10);
    const target = addDaysIso(today, 30);
    let best = series.at(-1)!;
    for (const p of series) {
      if (p.date <= target) best = p;
    }
    return { balance: best.balance, date: best.date };
  }, [ready, normalized, recurringRules, settings, accounts]);

  if (!saldo30) return null;

  return (
    <Link
      href="/futuro"
      className={clsx(
        chipLinkBase,
        "hidden md:inline-flex gap-2 tabular-nums text-xs",
      )}
      title={`Saldo em ${saldo30.date}`}
    >
      <span className="text-muted text-[10px]">30d</span>
      <span
        className={clsx(
          "font-medium",
          saldo30.balance >= 0
            ? "text-success"
            : "text-danger",
        )}
      >
        {saldo30.balance.toLocaleString("pt-BR", {
          style: "currency",
          currency: "BRL",
        })}
      </span>
    </Link>
  );
}

function addDaysIso(iso: string, days: number): string {
  const [y, m, d] = iso.split("-").map(Number);
  const t = Date.UTC(y, m - 1, d) + days * 86400000;
  const dt = new Date(t);
  return `${dt.getUTCFullYear()}-${String(dt.getUTCMonth() + 1).padStart(2, "0")}-${String(dt.getUTCDate()).padStart(2, "0")}`;
}
