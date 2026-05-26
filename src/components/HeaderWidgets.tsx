"use client";

import Link from "next/link";
import { useMemo } from "react";
import clsx from "clsx";
import { useAppStore } from "@/lib/store";
import { getSetupSteps, isProjectionReady } from "@/lib/setupStatus";
import { projectDailyBalance } from "@/lib/projection";

export function SetupIndicator() {
  const { dataset, settings, recurringRules, accounts } = useAppStore();
  const steps = getSetupSteps(dataset, settings, recurringRules, accounts);
  const allDone = steps.every((s) => s.done);

  if (allDone) return null;

  return (
    <Link
      href="/config"
      className="hidden sm:inline-flex items-center gap-1.5 chip hover:border-[var(--border-strong)]"
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
      <span className="text-[10px] subtle">Setup</span>
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
    let best = series[series.length - 1];
    for (const p of series) {
      if (p.date <= target) best = p;
    }
    return { balance: best.balance, date: best.date };
  }, [ready, normalized, recurringRules, settings, accounts]);

  if (!saldo30) return null;

  return (
    <Link
      href="/saldo"
      className="hidden md:inline-flex items-center gap-2 chip hover:border-[var(--border-strong)] num text-xs"
      title={`Saldo em ${saldo30.date}`}
    >
      <span className="subtle text-[10px]">30d</span>
      <span
        className={clsx(
          "font-medium",
          saldo30.balance >= 0
            ? "text-[var(--success)]"
            : "text-[var(--danger)]",
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
