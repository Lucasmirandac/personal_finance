"use client"

import { useMemo, useState } from "react"
import Link from "next/link"
import { SaldoCalendarView } from "@/components/SaldoCalendarView"
import { ChartCard } from "@/components/charts/ChartCard"
import { BalanceProjectionChart } from "@/components/charts/BalanceProjectionChart"
import { UpcomingTimeline } from "@/components/painel/UpcomingTimeline"
import { useCashEventEditor } from "@/components/transaction/useCashEventEditor"
import { SegmentedControl } from "@/components/ui/SegmentedControl"
import { StatTile } from "@/components/ui/StatTile"
import { g } from "@/lib/glossary"
import { Panel } from "@/components/ui/Panel"
import { formatBRL, formatDateBR } from "@/lib/format"
import { useAppStore } from "@/lib/store"
import { accountsToBalanceAnchor } from "@/lib/accounts"
import { projectionSnapshot, isSettingsComplete, projectDailyBalance, CashEvent } from "@/lib/projection"
import { EventFilter } from "@/components/saldoEventVisual"
import { Fonte, SaldoView } from "@/lib/types"

export function FuturoPageContent() {
  const { dataset, normalized, recurringRules, settings, accounts, updateSettings, edits } =
    useAppStore()
  const [eventFilter, setEventFilter] = useState<EventFilter>("all")
  const activeView: SaldoView = settings.saldoView ?? "overview"

  const cardSources = useMemo(() => {
    const set = new Set<Fonte>()
    for (const source of dataset.sources) set.add(source.fonte)
    return [...set]
  }, [dataset.sources])

  const complete = isSettingsComplete(settings, cardSources, accounts)
  const anchor = accountsToBalanceAnchor(accounts) ?? settings.balanceAnchor

  const { series, summary } = useMemo(
    () =>
      projectDailyBalance({
        normalized,
        recurringRules,
        settings,
        accounts,
        edits,
      }),
    [normalized, recurringRules, settings, accounts, edits],
  )

  const upcoming = useMemo(() => {
    const today = new Date().toISOString().slice(0, 10)
    const events: CashEvent[] = []
    for (const point of series) {
      if (point.date >= today) events.push(...point.events)
    }
    return events.sort((a, b) => (a.date < b.date ? -1 : 1))
  }, [series])

  const snapshot7 = summary ? projectionSnapshot(series, summary.saldoInicial, 7) : null
  const snapshot30 = summary ? projectionSnapshot(series, summary.saldoInicial, 30) : null
  const snapshot90 = summary ? projectionSnapshot(series, summary.saldoInicial, 90) : null
  const horizonEnd = series.length > 0 ? series.at(-1)?.date ?? null : null
  const upcomingIncome = upcoming.filter((event) => event.amount > 0).reduce((sum, event) => sum + event.amount, 0)
  const upcomingOutcome = upcoming.filter((event) => event.amount < 0).reduce((sum, event) => sum + event.amount, 0)

  const handleSetView = async (view: SaldoView) => {
    if (view === activeView) return
    await updateSettings({ ...settings, saldoView: view })
  }

  const { handleEventClick, editor } = useCashEventEditor()

  if (!complete || !anchor) {
    return (
      <Panel className="rounded-3xl p-6 shadow-[var(--shadow-card)]">
        <p className="text-xs uppercase tracking-[0.22em] text-muted">Futuro</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight">
          Configure contas para enxergar a projeção.
        </h1>
        <p className="mt-3 max-w-xl text-sm text-muted">
          A linha do tempo precisa de um saldo de referência para calcular os
          próximos dias.
        </p>
        <Link
          href="/config?tab=contas"
          className="mt-4 inline-flex rounded-full border border-foreground bg-foreground px-3 py-1.5 text-xs font-medium text-surface"
        >
          Configurar contas
        </Link>
      </Panel>
    )
  }

  return (
    <div className="space-y-6 lg:space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.22em] text-muted">Futuro</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">
            O que vem antes de virar surpresa.
          </h1>
          <p className="mt-2 text-sm text-muted">
            Projeção de saldo, calendário e compromissos a partir de {formatDateBR(anchor.data)}.
          </p>
        </div>
        <div className="overflow-x-auto no-scrollbar">
          <SegmentedControl<SaldoView>
            value={activeView}
            onChange={handleSetView}
            options={[
              { value: "overview", label: "Projeção" },
              { value: "calendar", label: "Calendário" },
            ]}
          />
        </div>
      </div>

      {summary && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          <StatTile label="Em 7d" value={formatBRL(snapshot7?.balance)} info={g("saldo7d")} />
          <StatTile label="Em 30d" value={formatBRL(snapshot30?.balance)} info={g("saldo30d")} />
          <StatTile label="Em 90d" value={formatBRL(snapshot90?.balance)} info={g("saldo90d")} />
          <StatTile
            label="Menor saldo"
            value={formatBRL(summary.menorSaldo)}
            hint={summary.menorSaldoData ?? undefined}
            tone={summary.menorSaldo >= 0 ? "default" : "danger"}
            info={g("menorSaldo")}
          />
          <StatTile label="Receitas" value={formatBRL(upcomingIncome)} tone="success" info={g("entradas")} />
          <StatTile label="Saídas" value={formatBRL(Math.abs(upcomingOutcome))} tone="danger" info={g("saidas")} />
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-5">
        <div className="lg:col-span-3">
          {activeView === "overview" && series.length > 0 && (
            <ChartCard
              title="Projeção de saldo"
              subtitle="Compras de cartão entram no dia de pagamento da fatura"
              info={g("projecaoSaldo")}
              className="rounded-3xl"
            >
              <BalanceProjectionChart data={series} />
            </ChartCard>
          )}
          {activeView === "overview" && series.length === 0 && (
            <Panel className="rounded-3xl p-4 text-sm text-muted">
              Nenhum dia no horizonte para exibir no gráfico.
            </Panel>
          )}
          {activeView === "calendar" && horizonEnd && (
            <SaldoCalendarView
              series={series}
              anchorISO={anchor.data}
              horizonEndISO={horizonEnd}
              filter={eventFilter}
              onEventClick={handleEventClick}
            />
          )}
          {activeView === "calendar" && !horizonEnd && (
            <Panel className="rounded-3xl p-4 text-sm text-muted">
              Nenhum dia no horizonte para exibir no calendário.
            </Panel>
          )}
        </div>

        <div className="lg:col-span-2">
          <UpcomingTimeline
            series={series}
            filter={eventFilter}
            onFilterChange={setEventFilter}
            onEventClick={handleEventClick}
          />
        </div>
      </div>
      {editor}
    </div>
  )
}
