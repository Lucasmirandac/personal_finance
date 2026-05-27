"use client"

import clsx from "clsx"
import { BudgetUsage } from "@/lib/budgets"
import { formatBRL, formatPercent } from "@/lib/format"
import { Num } from "@/components/ui/Num"

type Props = {
  usage: BudgetUsage
  compact?: boolean
}

function statusLabel(status: BudgetUsage["status"]): string {
  if (status === "danger") return "Estourado"
  if (status === "warning") return "Perto do limite"
  return "Dentro do orçamento"
}

function barColor(status: BudgetUsage["status"]): string {
  if (status === "danger") return "bg-[var(--system-red)]"
  if (status === "warning") return "bg-[var(--system-orange)]"
  return "bg-[var(--system-green)]"
}

function statusColor(status: BudgetUsage["status"]): string {
  if (status === "danger") return "var(--system-red)"
  if (status === "warning") return "var(--system-orange)"
  return "var(--system-green)"
}

export function BudgetProgressCard({ usage, compact = false }: Readonly<Props>) {
  const pct = Math.min(usage.percentual, 100)

  return (
    <div
      className={clsx(
        "rounded-2xl bg-surface p-4 space-y-3 ring-1 ring-border/60 shadow-[var(--shadow-card)]",
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 space-y-1">
          <div className="flex items-center gap-2">
            <span
              className="h-2.5 w-2.5 shrink-0 rounded-full"
              style={{ backgroundColor: statusColor(usage.status) }}
            />
            <div className="font-medium text-sm truncate">{usage.categoria}</div>
          </div>
          {!compact && (
            <div className="text-[10px] uppercase tracking-wider text-muted">{statusLabel(usage.status)}</div>
          )}
        </div>
        <Num
          className={clsx(
            "text-2xl font-semibold shrink-0 num-display",
            usage.status === "danger" && "text-danger",
            usage.status === "warning" && "text-warning",
            usage.status === "ok" && "text-success",
          )}
        >
          {formatPercent(usage.percentual)}
        </Num>
      </div>
      <div className="h-1.5 rounded-full bg-surface-2 overflow-hidden">
        <div
          className={clsx("h-full rounded-full transition-all", barColor(usage.status))}
          style={{ width: `${pct}%` }}
        />
      </div>
      <div className="flex justify-between text-xs font-mono tabular-nums text-muted">
        <span>{formatBRL(usage.gasto)}</span>
        <span>de {formatBRL(usage.limite)}</span>
      </div>
    </div>
  )
}
