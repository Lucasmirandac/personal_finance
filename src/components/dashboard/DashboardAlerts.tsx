"use client"

import { useMemo } from "react"
import { AlertsBar } from "@/components/painel/AlertsBar"
import { formatBRL, formatDateBR } from "@/lib/format"
import { projectDailyBalance } from "@/lib/projection"
import { PainelAlert } from "@/lib/alerts"
import { Account, CategoryBudget, Dataset, RecurringRule, Settings, TransactionNormalized } from "@/lib/types"
import { budgetAlertSummary, budgetUsageForMonth } from "@/lib/budgets"

type Props = {
  dataset: Dataset
  projectionReady: boolean
  normalized: TransactionNormalized[]
  recurringRules: RecurringRule[]
  settings: Settings
  accounts: Account[]
  budgets: CategoryBudget[]
}

export function DashboardAlerts({
  dataset,
  projectionReady,
  normalized,
  recurringRules,
  settings,
  accounts,
  budgets,
}: Readonly<Props>) {
  const alerts = useMemo(() => {
    const nextAlerts: PainelAlert[] = []

    if (!projectionReady) {
      nextAlerts.push({
        id: "dashboard-setup",
        severity: "critical",
        accent: "orange",
        icon: "wrench",
        title: "Projeção incompleta",
        detail: "Configure cartões e saldo inicial para liberar a projeção",
        href: "/config?tab=cartoes",
      })
    }

    const budgetAlerts = budgetAlertSummary(budgetUsageForMonth(normalized, budgets))
    if (budgetAlerts.danger > 0) {
      nextAlerts.push({
        id: "dashboard-budget-danger",
        severity: "critical",
        accent: "red",
        icon: "piggybank",
        title: "Orçamentos estourados",
        detail: `${budgetAlerts.danger} categoria(s) acima do limite`,
        href: "/dashboard?tab=orcamentos",
      })
    }
    if (budgetAlerts.warning > 0) {
      nextAlerts.push({
        id: "dashboard-budget-warning",
        severity: "warning",
        accent: "yellow",
        icon: "piggybank",
        title: "Categorias perto do limite",
        detail: `${budgetAlerts.warning} categoria(s) acima de 80%`,
        href: "/dashboard?tab=orcamentos",
      })
    }

    if (projectionReady) {
      const { series } = projectDailyBalance({
        normalized,
        recurringRules,
        settings,
        accounts,
      })
      const today = new Date().toISOString().slice(0, 10)
      let nextEvent: { description: string; date: string; amount: number } | null = null
      for (const point of series) {
        if (point.date < today) continue
        const event = point.events.find((item) => item.type !== "ancora")
        if (!event) continue
        nextEvent = event
        break
      }
      if (nextEvent) {
        nextAlerts.push({
          id: "dashboard-next-event",
          severity: "info",
          accent: "blue",
          icon: "calendar",
          title: "Próximo evento financeiro",
          detail: `${nextEvent.description} · ${formatDateBR(nextEvent.date)} · ${formatBRL(nextEvent.amount)}`,
          href: "/saldo",
        })
      }
    }

    return nextAlerts
  }, [projectionReady, normalized, recurringRules, settings, accounts, budgets])

  if (!dataset.sources.length && alerts.length === 0) return null

  return <AlertsBar alerts={alerts} />
}
