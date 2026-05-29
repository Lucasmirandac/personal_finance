"use client"

import { useMemo, useState } from "react"
import Link from "next/link"
import clsx from "clsx"
import { AccountsPanel } from "@/components/AccountsPanel"
import { AdjustBalanceModal } from "@/components/AdjustBalanceModal"
import { AlertsBar } from "@/components/painel/AlertsBar"
import { DailyAllowancePanel } from "@/components/painel/DailyAllowancePanel"
import { StatTile } from "@/components/ui/StatTile"
import { DrawerBackdrop, DrawerPanel } from "@/components/ui/Drawer"
import { Panel } from "@/components/ui/Panel"
import { Button } from "@/components/ui/Button"
import { Num } from "@/components/ui/Num"
import { formatBRL, formatDateBR, formatLongDate, formatRelativeDays } from "@/lib/format"
import { buildPainelAlerts, PainelAlert } from "@/lib/alerts"
import { useAppStore } from "@/lib/store"
import { ACCOUNT_KIND_LABELS, accountsToBalanceAnchor } from "@/lib/accounts"
import {
  projectionSnapshot,
  isSettingsComplete,
  projectDailyBalance,
  CashEvent,
  ProjectionSnapshot,
  ProjectionSummary,
} from "@/lib/projection"
import { todayIso } from "@/lib/dates"
import { Account, BalanceAnchor, Fonte } from "@/lib/types"
import {
  ArrowRight,
  CalendarDays,
  Landmark,
  PiggyBank,
  Plus,
  SlidersHorizontal,
  Sparkles,
  WalletCards,
} from "lucide-react"

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
  } = useAppStore()

  const [configOpen, setConfigOpen] = useState(false)
  const [adjustOpen, setAdjustOpen] = useState(false)

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
  const nextEvent = upcoming[0] ?? null
  const nextBill = upcoming.find((event) => event.amount < 0) ?? null
  const activeAccounts = accounts.filter((account) => account.ativa)
  const totalAccounts = activeAccounts.reduce((sum, account) => sum + account.saldoInicial, 0)
  const cardAccounts = activeAccounts.filter((account) => account.kind === "cartao")
  const upcomingIncome = upcoming.filter((event) => event.amount > 0).reduce((sum, event) => sum + event.amount, 0)
  const upcomingOutcome = upcoming.filter((event) => event.amount < 0).reduce((sum, event) => sum + event.amount, 0)
  const outlookTone = summary && summary.menorSaldo < 0 ? "danger" : "success"

  if (!complete || !anchor) {
    return <SetupRequired />
  }

  return (
    <div className="space-y-5 lg:space-y-6">
      <section className="grid grid-cols-1 gap-4 lg:grid-cols-12">
        <TodayHero
          summary={summary}
          snapshot30={snapshot30}
          nextBill={nextBill}
          outlookTone={outlookTone}
          onAdjustBalance={() => setAdjustOpen(true)}
        />

        <div className="lg:col-span-4">
          <DailyAllowancePanel />
        </div>
      </section>

      <section className="grid grid-cols-1 gap-4 lg:grid-cols-12">
        <ActionSummary
          alerts={alerts}
          snapshot7={snapshot7}
          upcomingIncome={upcomingIncome}
          upcomingOutcome={upcomingOutcome}
          summary={summary}
        />

        <div className="space-y-4 lg:col-span-5">
          <FlowPanel nextEvent={nextEvent} activeAccountsCount={activeAccounts.length} />
          <AccountsSummary
            anchor={anchor}
            activeAccounts={activeAccounts}
            cardAccountsCount={cardAccounts.length}
            totalAccounts={totalAccounts}
            onManage={() => setConfigOpen(true)}
          />
        </div>
      </section>

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

function SetupRequired() {
  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <Panel className="rounded-3xl p-6 shadow-[var(--shadow-card)]">
        <p className="text-xs uppercase tracking-[0.2em] text-muted">Hoje</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight">
          Falta conectar seu ponto de partida.
        </h1>
        <p className="mt-3 max-w-xl text-sm leading-relaxed text-muted">
          Cadastre contas e saldo atual para liberar a visão guiada do dia,
          projeções e alertas de risco.
        </p>
      </Panel>
      <AccountsPanel />
    </div>
  )
}

function TodayHero({
  summary,
  snapshot30,
  nextBill,
  outlookTone,
  onAdjustBalance,
}: Readonly<{
  summary: ProjectionSummary | null
  snapshot30: ProjectionSnapshot
  nextBill: CashEvent | null
  outlookTone: "success" | "danger"
  onAdjustBalance: () => void
}>) {
  return (
    <Panel className="relative overflow-hidden rounded-[2rem] p-5 shadow-[var(--shadow-card-lg)] lg:col-span-8">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,color-mix(in_oklab,var(--accent)_18%,transparent),transparent_24rem)]" />
      <div className="relative flex flex-col gap-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-[0.22em] text-muted">Hoje</p>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">
              Seu dia financeiro em uma decisão.
            </h1>
            <p className="mt-2 text-sm capitalize text-muted">{formatLongDate(todayIso())}</p>
          </div>

          <div className="flex flex-wrap gap-2">
            <Link
              href="/recorrentes"
              className="inline-flex items-center justify-center gap-1.5 rounded-full border border-border bg-surface/80 px-3 py-1.5 text-xs font-medium shadow-sm hover:bg-surface-2"
            >
              <Plus size={13} />
              Adicionar
            </Link>
            <Button size="sm" className="rounded-full" onClick={onAdjustBalance}>
              <SlidersHorizontal size={13} />
              Ajustar saldo
            </Button>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-[1.15fr_0.85fr]">
          <div>
            <p className="text-[11px] uppercase tracking-wider text-muted">Saldo atual</p>
            <Num className="mt-2 block text-5xl font-semibold tracking-tight num-display sm:text-6xl">
              {formatBRL(summary?.saldoInicial)}
            </Num>
            <p
              className={clsx(
                "mt-3 inline-flex rounded-full px-3 py-1 text-xs font-medium",
                outlookTone === "danger"
                  ? "bg-danger/10 text-danger"
                  : "bg-success/10 text-success",
              )}
            >
              {outlookTone === "danger"
                ? `Menor saldo previsto: ${formatBRL(summary?.menorSaldo)}`
                : "Projeção sem saldo negativo no horizonte"}
            </p>
          </div>

          <div className="grid gap-2">
            <TodayMetric
              label="Próximo compromisso"
              value={nextBill ? formatBRL(nextBill.amount) : "Sem saídas"}
              hint={
                nextBill
                  ? `${nextBill.description} · ${formatRelativeDays(nextBill.date)}`
                  : "Nada crítico no horizonte"
              }
              tone={nextBill ? "danger" : "success"}
            />
            <TodayMetric
              label="Saldo em 30 dias"
              value={formatBRL(snapshot30?.balance)}
              hint={snapshot30 ? formatDateBR(snapshot30.date) : "Sem projeção"}
              tone={(snapshot30?.balance ?? 0) >= 0 ? "success" : "danger"}
            />
          </div>
        </div>
      </div>
    </Panel>
  )
}

function ActionSummary({
  alerts,
  snapshot7,
  upcomingIncome,
  upcomingOutcome,
  summary,
}: Readonly<{
  alerts: PainelAlert[]
  snapshot7: ProjectionSnapshot
  upcomingIncome: number
  upcomingOutcome: number
  summary: ProjectionSummary | null
}>) {
  return (
    <div className="space-y-4 lg:col-span-7">
      <div>
        <div className="mb-2 flex items-end justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-[0.22em] text-muted">Plano de ação</p>
            <h2 className="text-xl font-semibold tracking-tight">O que merece sua atenção</h2>
          </div>
          {alerts.length > 0 && (
            <span className="rounded-full bg-surface/80 px-3 py-1 text-xs text-muted ring-1 ring-border/70">
              {alerts.length} alerta{alerts.length === 1 ? "" : "s"}
            </span>
          )}
        </div>
        <AlertsBar alerts={alerts} />
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatTile label="Em 7d" value={formatBRL(snapshot7?.balance)} />
        <StatTile label="Entradas" value={formatBRL(upcomingIncome)} tone="success" />
        <StatTile label="Saídas" value={formatBRL(upcomingOutcome)} tone="danger" />
        <StatTile
          label="Menor saldo"
          value={formatBRL(summary?.menorSaldo)}
          hint={summary?.menorSaldoData ?? undefined}
          tone={(summary?.menorSaldo ?? 0) >= 0 ? "default" : "danger"}
        />
      </div>
    </div>
  )
}

function FlowPanel({
  nextEvent,
  activeAccountsCount,
}: Readonly<{
  nextEvent: CashEvent | null
  activeAccountsCount: number
}>) {
  const accountsDescription = `${activeAccountsCount} conta${activeAccountsCount === 1 ? "" : "s"} ativa${activeAccountsCount === 1 ? "" : "s"}`

  return (
    <Panel className="rounded-3xl p-4 shadow-[var(--shadow-card)]">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-[0.22em] text-muted">Próximos passos</p>
          <h2 className="mt-1 text-xl font-semibold tracking-tight">Explore sem perder contexto</h2>
        </div>
        <Sparkles className="text-accent" size={20} />
      </div>
      <div className="mt-4 grid gap-2">
        <FlowLink
          href="/futuro"
          icon={<CalendarDays size={18} />}
          title="Ver o futuro"
          description={nextEvent ? `Próximo evento: ${nextEvent.description}` : "Projeção, calendário e agenda"}
        />
        <FlowLink
          href="/dashboard?tab=patrimonio"
          icon={<PiggyBank size={18} />}
          title="Planejar patrimônio"
          description="Paz Futura, meta de poupança e evolução em 12 meses"
        />
        <FlowLink
          href="/config?tab=contas"
          icon={<Landmark size={18} />}
          title="Ajustar contas"
          description={accountsDescription}
        />
      </div>
    </Panel>
  )
}

function AccountsSummary({
  anchor,
  activeAccounts,
  cardAccountsCount,
  totalAccounts,
  onManage,
}: Readonly<{
  anchor: BalanceAnchor
  activeAccounts: Account[]
  cardAccountsCount: number
  totalAccounts: number
  onManage: () => void
}>) {
  return (
    <Panel className="rounded-3xl p-4 shadow-[var(--shadow-card)]">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-[0.22em] text-muted">Contas</p>
          <h2 className="mt-1 text-xl font-semibold tracking-tight">{formatBRL(totalAccounts)}</h2>
          <p className="text-xs text-muted">
            Referência {formatDateBR(anchor.data)} · {cardAccountsCount} cartão{cardAccountsCount === 1 ? "" : "ões"}
          </p>
        </div>
        <Button size="sm" className="rounded-full" onClick={onManage}>
          <WalletCards size={13} />
          Gerenciar
        </Button>
      </div>
      <div className="mt-4 space-y-2">
        {activeAccounts.slice(0, 3).map((account) => (
          <div key={account.id} className="flex items-center justify-between gap-3 rounded-2xl bg-surface-2/70 px-3 py-2">
            <div className="min-w-0">
              <p className="truncate text-sm font-medium">{account.nome}</p>
              <p className="text-xs text-muted">{ACCOUNT_KIND_LABELS[account.kind]}</p>
            </div>
            <Num className="shrink-0 font-mono text-sm tabular-nums">
              {formatBRL(account.saldoInicial)}
            </Num>
          </div>
        ))}
      </div>
    </Panel>
  )
}

function TodayMetric({
  label,
  value,
  hint,
  tone,
}: Readonly<{
  label: string
  value: string
  hint: string
  tone: "success" | "danger"
}>) {
  return (
    <div className="rounded-2xl bg-surface/72 p-3 ring-1 ring-border/70">
      <p className="text-[10px] uppercase tracking-wider text-muted">{label}</p>
      <Num className={clsx("mt-1 block text-xl font-semibold num-display", tone === "success" ? "text-success" : "text-danger")}>
        {value}
      </Num>
      <p className="mt-1 truncate text-xs text-muted">{hint}</p>
    </div>
  )
}

function FlowLink({
  href,
  icon,
  title,
  description,
}: Readonly<{
  href: string
  icon: React.ReactNode
  title: string
  description: string
}>) {
  return (
    <Link
      href={href}
      className="group flex items-center gap-3 rounded-2xl bg-surface-2/70 p-3 transition-colors hover:bg-surface-2"
    >
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-surface text-accent ring-1 ring-border/70">
        {icon}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-medium">{title}</span>
        <span className="block truncate text-xs text-muted">{description}</span>
      </span>
      <ArrowRight size={16} className="text-muted transition-transform group-hover:translate-x-0.5" />
    </Link>
  )
}
