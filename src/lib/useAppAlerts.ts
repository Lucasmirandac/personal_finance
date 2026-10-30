"use client"

import { useEffect, useMemo, useState } from "react"
import { useAppStore } from "@/lib/store"
import { buildPainelAlerts, PainelAlert } from "@/lib/alerts"
import { projectDailyBalance, CashEvent } from "@/lib/projection"
import { todayIso } from "@/lib/dates"
import { getCloudSyncState, subscribeCloudSync } from "@/lib/cloud-sync/orchestrator"
import { getCloudSyncReminder } from "@/lib/cloud-sync/display"
import { daysSince } from "@/lib/backup"
import { summarizePaymentMonth } from "@/lib/paymentStatus"
import { isCashTransaction } from "@/lib/transactionViews"
import { formatBRL, formatInt } from "@/lib/format"
import type { CloudSyncState } from "@/lib/cloud-sync/types"

export type AppAlertsResult = {
  alerts: PainelAlert[]
  criticalCount: number
  warningCount: number
  infoCount: number
  hasAlerts: boolean
}

export function useAppAlerts(): AppAlertsResult {
  const {
    dataset,
    settings,
    recurringRules,
    accounts,
    manualTransactions,
    normalized,
    budgets,
    subscriptionDismissals,
    lastBackupAt,
    edits,
    paymentStatus,
    hasAnalysis,
  } = useAppStore()

  const [syncState, setSyncState] = useState<CloudSyncState>(getCloudSyncState)

  useEffect(() => {
    return subscribeCloudSync(setSyncState)
  }, [])

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

  const today = todayIso()

  const upcoming = useMemo(() => {
    const events: CashEvent[] = []
    for (const point of series) {
      if (point.date >= today) events.push(...point.events)
    }
    return events.sort((a, b) => (a.date < b.date ? -1 : 1))
  }, [series, today])

  const currentMonth = today.slice(0, 7)
  const paymentSummary = useMemo(
    () =>
      summarizePaymentMonth(
        normalized.filter(
          (tx) => isCashTransaction(tx, accounts) && tx.anoMes === currentMonth,
        ),
        paymentStatus,
      ),
    [normalized, accounts, currentMonth, paymentStatus],
  )

  const alerts = useMemo(() => {
    const list: PainelAlert[] = buildPainelAlerts({
      dataset,
      settings,
      recurringRules,
      accounts,
      manuals: manualTransactions,
      normalized,
      budgets,
      summary,
      upcomingEvents: upcoming,
      subscriptionDismissals,
      lastBackupAt,
    })

    // Contas a pagar pendentes do mês atual
    if (paymentSummary.pendingCount > 0) {
      list.push({
        id: "contas-pendentes-mes",
        severity: "warning",
        accent: "yellow",
        icon: "wallet",
        title: "Contas a pagar do mês",
        detail: `${formatInt(paymentSummary.pendingCount)} conta(s) pendente(s) · ${formatBRL(paymentSummary.pendingTotal)}`,
        href: "/extrato",
      })
    }

    // Alertas de sincronização na nuvem
    const manualBackupDays = daysSince(lastBackupAt)
    const syncReminder = getCloudSyncReminder(syncState, hasAnalysis, manualBackupDays)
    if (syncReminder && syncReminder.variant !== "setup") {
      const isUrgent = syncReminder.variant === "urgent"
      list.push({
        id: "cloud-sync-status",
        severity: isUrgent ? "critical" : "warning",
        accent: isUrgent ? "red" : "orange",
        icon: "cloud",
        title: isUrgent ? "Erro na sincronização" : "Sincronização em nuvem",
        detail: syncReminder.label,
        href: syncReminder.href,
      })
    }

    const compareSeverity: Record<string, number> = {
      critical: 0,
      warning: 1,
      info: 2,
    }

    return list.sort(
      (a, b) => (compareSeverity[a.severity] ?? 3) - (compareSeverity[b.severity] ?? 3),
    )
  }, [
    dataset,
    settings,
    recurringRules,
    accounts,
    manualTransactions,
    normalized,
    budgets,
    summary,
    upcoming,
    subscriptionDismissals,
    lastBackupAt,
    paymentSummary,
    syncState,
    hasAnalysis,
  ])

  const criticalCount = alerts.filter((a) => a.severity === "critical").length
  const warningCount = alerts.filter((a) => a.severity === "warning").length
  const infoCount = alerts.filter((a) => a.severity === "info").length

  return {
    alerts,
    criticalCount,
    warningCount,
    infoCount,
    hasAlerts: alerts.length > 0,
  }
}
