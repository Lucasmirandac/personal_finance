"use client"

import { useMemo, useState } from "react"
import { AccountsPanel } from "@/components/AccountsPanel"
import { AdjustBalanceModal } from "@/components/AdjustBalanceModal"
import { SaldoCalendarView } from "@/components/SaldoCalendarView"
import { ChartCard } from "@/components/charts/ChartCard"
import { BalanceProjectionChart } from "@/components/charts/BalanceProjectionChart"
import { AccountStack } from "@/components/painel/AccountStack"
import { AlertsBar } from "@/components/painel/AlertsBar"
import { GreetingHeader } from "@/components/painel/GreetingHeader"
import { HeroBalance } from "@/components/painel/HeroBalance"
import { UpcomingTimeline } from "@/components/painel/UpcomingTimeline"
import { WealthProjectionPanel } from "@/components/saldo/WealthProjectionPanel"
import { SegmentedControl } from "@/components/ui/SegmentedControl"
import { StatTile } from "@/components/ui/StatTile"
import { DrawerBackdrop, DrawerPanel } from "@/components/ui/Drawer"
import { Panel } from "@/components/ui/Panel"
import { formatBRL } from "@/lib/format"
import { buildPainelAlerts } from "@/lib/alerts"
import { useAppStore } from "@/lib/store"
import { accountsToBalanceAnchor } from "@/lib/accounts"
import { projectionSnapshot, isSettingsComplete, projectDailyBalance, CashEvent } from "@/lib/projection"
import { EventFilter } from "@/components/saldoEventVisual"
import { Fonte, SaldoView } from "@/lib/types"

export function SaldoPageContent() {
  const {
    dataset,
    normalized,
    recurringRules,
    settings,
    accounts,
    budgets,
    subscriptionDismissals,
    lastBackupAt,
    updateSettings,
  } = useAppStore()

  const [configOpen, setConfigOpen] = useState(false)
  const [adjustOpen, setAdjustOpen] = useState(false)
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
      }),
    [normalized, recurringRules, settings, accounts],
  )

  const upcoming = useMemo(() => {
    const today = new Date().toISOString().slice(0, 10)
    const events: CashEvent[] = []
    for (const point of series) {
      if (point.date >= today) events.push(...point.events)
    }
    return events.sort((a, b) => (a.date < b.date ? -1 : 1))
  }, [series])

  const alerts = useMemo(
    () =>
      buildPainelAlerts({
        dataset,
        settings,
        recurringRules,
        accounts,
        normalized,
        budgets,
        summary,
        upcomingEvents: upcoming,
        subscriptionDismissals,
        lastBackupAt,
      }),
    [
      dataset,
      settings,
      recurringRules,
      accounts,
      normalized,
      budgets,
      summary,
      upcoming,
      subscriptionDismissals,
      lastBackupAt,
    ],
  )

  const snapshot7 = summary ? projectionSnapshot(series, summary.saldoInicial, 7) : null
  const snapshot30 = summary ? projectionSnapshot(series, summary.saldoInicial, 30) : null
  const snapshot90 = summary ? projectionSnapshot(series, summary.saldoInicial, 90) : null

  const horizonEnd = series.length > 0 ? series.at(-1)?.date ?? null : null

  const handleSetView = async (view: SaldoView) => {
    if (view === activeView) return
    await updateSettings({ ...settings, saldoView: view })
  }

  if (!complete || !anchor) {
    return (
      <div className="space-y-4">
        <p className="text-sm text-muted">
          Cadastre contas e saldo atual para liberar o Painel.
        </p>
        <AccountsPanel />
      </div>
    )
  }

  return (
    <div className="space-y-6 lg:space-y-8">
      <GreetingHeader
        onAdjustBalance={() => setAdjustOpen(true)}
        onConfig={() => setConfigOpen(true)}
      />

      <AlertsBar alerts={alerts} />

      <HeroBalance
        summary={summary}
        series={series}
        onAdjustBalance={() => setAdjustOpen(true)}
      />

      <AccountStack accounts={accounts} />

      {summary && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          <StatTile label="Em 7d" value={formatBRL(snapshot7?.balance)} />
          <StatTile label="Em 30d" value={formatBRL(snapshot30?.balance)} />
          <StatTile label="Em 90d" value={formatBRL(snapshot90?.balance)} />
          <StatTile
            label="Menor saldo"
            value={formatBRL(summary.menorSaldo)}
            hint={summary.menorSaldoData ?? undefined}
            tone={summary.menorSaldo >= 0 ? "default" : "danger"}
          />
          <StatTile
            label="Receitas"
            value={formatBRL(upcoming.filter((event) => event.amount > 0).reduce((sum, event) => sum + event.amount, 0))}
            tone="success"
          />
          <StatTile
            label="Saídas"
            value={formatBRL(upcoming.filter((event) => event.amount < 0).reduce((sum, event) => sum + event.amount, 0))}
            tone="danger"
          />
        </div>
      )}

      <SegmentedControl<SaldoView>
        value={activeView}
        onChange={handleSetView}
        options={[
          { value: "overview", label: "Projeção" },
          { value: "calendar", label: "Calendário" },
        ]}
      />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-5">
        <div className="lg:col-span-3">
          {activeView === "overview" && series.length > 0 && (
            <ChartCard
              title="Projeção de saldo"
              subtitle="Compras de cartão no dia de pagamento da fatura"
            >
              <BalanceProjectionChart data={series} />
            </ChartCard>
          )}
          {activeView === "overview" && series.length === 0 && (
            <Panel className="p-4 text-sm text-muted">
              Nenhum dia no horizonte para exibir no gráfico.
            </Panel>
          )}
          {activeView === "calendar" && horizonEnd && (
            <SaldoCalendarView
              series={series}
              anchorISO={anchor.data}
              horizonEndISO={horizonEnd}
              filter={eventFilter}
            />
          )}
          {activeView === "calendar" && !horizonEnd && (
            <Panel className="p-4 text-sm text-muted">
              Nenhum dia no horizonte para exibir no calendário.
            </Panel>
          )}
        </div>

        <div className="lg:col-span-2">
          <UpcomingTimeline
            series={series}
            filter={eventFilter}
            onFilterChange={setEventFilter}
          />
        </div>
      </div>

      <WealthProjectionPanel />

      <AdjustBalanceModal open={adjustOpen} onClose={() => setAdjustOpen(false)} />

      {configOpen && (
        <DrawerBackdrop onClick={() => setConfigOpen(false)}>
          <DrawerPanel
            role="dialog"
            aria-modal="true"
            className="w-[min(100%,36rem)] p-4 overflow-auto"
            onClick={(event) => event.stopPropagation()}
          >
            <AccountsPanel onClose={() => setConfigOpen(false)} />
          </DrawerPanel>
        </DrawerBackdrop>
      )}
    </div>
  )
}
