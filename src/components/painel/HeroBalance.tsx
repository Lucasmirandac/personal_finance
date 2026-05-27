"use client"

import clsx from "clsx"
import { ArrowDownRight, ArrowUpRight } from "lucide-react"
import { BalanceSparkline } from "@/components/painel/BalanceSparkline"
import { Button } from "@/components/ui/Button"
import { Num } from "@/components/ui/Num"
import { projectionSnapshot, DailyBalancePoint, ProjectionSummary } from "@/lib/projection"
import { formatBRL, formatDateBR } from "@/lib/format"

type Props = {
  summary: ProjectionSummary | null
  series: DailyBalancePoint[]
  onAdjustBalance: () => void
}

export function HeroBalance({ summary, series, onAdjustBalance }: Props) {
  if (!summary) return null
  const snapshot30 = projectionSnapshot(series, summary.saldoInicial, 30)
  const toneUp = (snapshot30?.delta ?? 0) >= 0
  const negativeOutlook = summary.menorSaldo < 0

  return (
    <section
      className={clsx(
        "relative overflow-hidden rounded-3xl bg-gradient-to-br p-5 shadow-[var(--shadow-card-lg)] ring-1 ring-black/5",
        negativeOutlook
          ? "from-[color-mix(in_oklab,var(--system-red)_16%,var(--surface))] to-[color-mix(in_oklab,var(--system-orange)_8%,var(--surface))]"
          : "from-[color-mix(in_oklab,var(--system-green)_14%,var(--surface))] to-[color-mix(in_oklab,var(--system-blue)_8%,var(--surface))]",
      )}
    >
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-[11px] uppercase tracking-wider text-muted">Saldo atual</p>
          <Num className="mt-2 block text-5xl font-semibold tracking-tight num-display sm:text-6xl">
            {formatBRL(summary.saldoInicial)}
          </Num>
          {snapshot30 && (
            <div
              className={clsx(
                "mt-3 inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs",
                toneUp
                  ? "bg-[color-mix(in_oklab,var(--system-green)_14%,transparent)] text-success"
                  : "bg-[color-mix(in_oklab,var(--system-red)_14%,transparent)] text-danger",
              )}
            >
              {toneUp ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
              <span>
                {formatBRL(snapshot30.delta)} em 30 dias ({formatDateBR(snapshot30.date)})
              </span>
            </div>
          )}
        </div>

        <Button size="sm" onClick={onAdjustBalance} className="rounded-full">
          Ajustar saldo
        </Button>
      </div>

      <div className="mt-4">
        <BalanceSparkline data={series.slice(0, 30)} />
      </div>
    </section>
  )
}
