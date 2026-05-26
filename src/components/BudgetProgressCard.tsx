"use client";

import clsx from "clsx";
import { BudgetUsage } from "@/lib/budgets";
import { formatBRL, formatPercent } from "@/lib/format";

type Props = {
  usage: BudgetUsage;
  compact?: boolean;
};

function statusLabel(status: BudgetUsage["status"]): string {
  if (status === "danger") return "Estourado";
  if (status === "warning") return "Perto do limite";
  return "Dentro do orçamento";
}

function barColor(status: BudgetUsage["status"]): string {
  if (status === "danger") return "bg-[var(--danger)]";
  if (status === "warning") return "bg-[var(--warning)]";
  return "bg-[var(--success)]";
}

export function BudgetProgressCard({ usage, compact = false }: Props) {
  const pct = Math.min(usage.percentual, 100);

  return (
    <div
      className={clsx(
        "border border-[var(--border)] rounded-md p-3 space-y-2",
        usage.status === "danger" && "border-[var(--danger)]/40",
        usage.status === "warning" && "border-[var(--warning)]/40",
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="font-medium text-sm truncate">{usage.categoria}</div>
          {!compact && (
            <div className="text-[10px] subtle">{statusLabel(usage.status)}</div>
          )}
        </div>
        <span
          className={clsx(
            "text-xs num font-medium shrink-0",
            usage.status === "danger" && "text-[var(--danger)]",
            usage.status === "warning" && "text-[var(--warning)]",
            usage.status === "ok" && "text-[var(--success)]",
          )}
        >
          {formatPercent(usage.percentual)}
        </span>
      </div>
      <div className="h-2 rounded-full bg-[var(--surface-2)] overflow-hidden">
        <div
          className={clsx("h-full rounded-full transition-all", barColor(usage.status))}
          style={{ width: `${pct}%` }}
        />
      </div>
      <div className="flex justify-between text-xs num subtle">
        <span>{formatBRL(usage.gasto)}</span>
        <span>de {formatBRL(usage.limite)}</span>
      </div>
    </div>
  );
}
