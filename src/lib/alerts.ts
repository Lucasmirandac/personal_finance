import { budgetAlertSummary, budgetUsageForMonth } from "./budgets"
import { cardLimitAlertSummary, cardLimitUsages } from "./cardLimits"
import { daysSince } from "./backup"
import { todayIso } from "./dates"
import { getSetupSteps } from "./setupStatus"
import { detectSubscriptions } from "./subscriptions"
import { CashEvent, ProjectionSummary } from "./projection"
import { Account, CategoryBudget, Dataset, RecurringRule, Settings, TransactionNormalized } from "./types"

export type PainelAlertSeverity = "critical" | "warning" | "info"
export type PainelAlertAccent =
  | "red"
  | "orange"
  | "yellow"
  | "green"
  | "blue"
  | "indigo"

export type PainelAlert = {
  id: string
  severity: PainelAlertSeverity
  accent: PainelAlertAccent
  title: string
  detail: string
  href?: string
  icon: "alert" | "calendar" | "wallet" | "wrench" | "piggybank" | "income" | "repeat"
}

type BuildPainelAlertsInput = {
  dataset: Dataset
  settings: Settings
  recurringRules: RecurringRule[]
  accounts: Account[]
  normalized: TransactionNormalized[]
  budgets: CategoryBudget[]
  summary: ProjectionSummary | null
  upcomingEvents: CashEvent[]
  subscriptionDismissals: string[]
  lastBackupAt: string | null
}

const compareSeverity: Record<PainelAlertSeverity, number> = {
  critical: 0,
  warning: 1,
  info: 2,
}

const formatBRLShort = (value: number) =>
  value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })

const formatDateShort = (iso: string) => iso.split("-").reverse().join("/")

export const buildPainelAlerts = ({
  dataset,
  settings,
  recurringRules,
  accounts,
  normalized,
  budgets,
  summary,
  upcomingEvents,
  subscriptionDismissals,
  lastBackupAt,
}: BuildPainelAlertsInput): PainelAlert[] => {
  const alerts: PainelAlert[] = []
  const today = todayIso()

  const setupSteps = getSetupSteps(dataset, settings, recurringRules, accounts).filter(
    (step) => !step.done,
  )
  if (setupSteps.length > 0) {
    alerts.push({
      id: "setup-pendente",
      severity: "critical",
      accent: "orange",
      icon: "wrench",
      title: "Configuração pendente",
      detail: `${setupSteps.length} etapa(s) ainda precisam de atenção`,
      href: "/config",
    })
  }

  if (summary?.menorSaldo != null && summary.menorSaldo < 0) {
    const minimumDate = summary.menorSaldoData
      ? ` em ${formatDateShort(summary.menorSaldoData)}`
      : ""
    alerts.push({
      id: "saldo-negativo",
      severity: "critical",
      accent: "red",
      icon: "wallet",
      title: "Saldo projetado negativo",
      detail: `Mínimo de ${formatBRLShort(summary.menorSaldo)}${minimumDate}`,
      href: "/saldo",
    })
  }

  const usages = budgetUsageForMonth(normalized, budgets)
  const budgetAlert = budgetAlertSummary(usages)
  if (budgetAlert.danger > 0) {
    alerts.push({
      id: "budget-danger",
      severity: "critical",
      accent: "red",
      icon: "piggybank",
      title: "Orçamento estourado",
      detail: `${budgetAlert.danger} categoria(s) acima do limite`,
      href: "/dashboard?tab=orcamentos",
    })
  }
  if (budgetAlert.warning > 0) {
    alerts.push({
      id: "budget-warning",
      severity: "warning",
      accent: "yellow",
      icon: "piggybank",
      title: "Orçamento perto do limite",
      detail: `${budgetAlert.warning} categoria(s) passando de 80%`,
      href: "/dashboard?tab=orcamentos",
    })
  }

  const cardLimitUsagesList = cardLimitUsages(normalized, accounts, today)
  const cardLimitAlert = cardLimitAlertSummary(cardLimitUsagesList)
  if (cardLimitAlert.danger > 0) {
    alerts.push({
      id: "card-limit-danger",
      severity: "critical",
      accent: "red",
      icon: "wallet",
      title: "Teto do cartão estourado",
      detail: `${cardLimitAlert.danger} cartão(ões) acima do teto definido`,
      href: "/faturas",
    })
  }
  if (cardLimitAlert.warning > 0) {
    alerts.push({
      id: "card-limit-warning",
      severity: "warning",
      accent: "yellow",
      icon: "wallet",
      title: "Cartão perto do teto",
      detail: `${cardLimitAlert.warning} cartão(ões) passando de 80% do teto`,
      href: "/faturas",
    })
  }

  const nearOutgoing = upcomingEvents
    .filter((event) => event.date >= today && event.date <= plusDays(today, 7) && event.amount < 0)
    .sort((a, b) => a.amount - b.amount)[0]
  if (nearOutgoing) {
    alerts.push({
      id: "saida-proxima",
      severity: "warning",
      accent: "orange",
      icon: "calendar",
      title: "Conta alta nos próximos 7 dias",
      detail: `${nearOutgoing.description} · ${formatDateShort(nearOutgoing.date)} · ${formatBRLShort(Math.abs(nearOutgoing.amount))}`,
      href: "/saldo",
    })
  }

  const daysWithoutBackup = daysSince(lastBackupAt)
  if (daysWithoutBackup != null && daysWithoutBackup > 30) {
    alerts.push({
      id: "backup-atrasado",
      severity: "warning",
      accent: "orange",
      icon: "alert",
      title: "Backup atrasado",
      detail: `Último backup há ${daysWithoutBackup} dias`,
      href: "/config?tab=backup",
    })
  }

  const nearIncome = upcomingEvents
    .filter((event) => event.date >= today && event.date <= plusDays(today, 7) && event.amount > 0)
    .sort((a, b) => (a.date < b.date ? -1 : 1))[0]
  if (nearIncome) {
    alerts.push({
      id: "receita-proxima",
      severity: "info",
      accent: "green",
      icon: "income",
      title: "Receita próxima",
      detail: `${nearIncome.description} · ${formatDateShort(nearIncome.date)} · ${formatBRLShort(nearIncome.amount)}`,
      href: "/saldo",
    })
  }

  const recurringToday = recurringRules.filter(
    (rule) => rule.ativo && rule.inicio <= today && (!rule.fim || rule.fim >= today) && rule.diaMes === Number(today.slice(-2)),
  )
  if (recurringToday.length > 0) {
    alerts.push({
      id: "recorrentes-hoje",
      severity: "info",
      accent: "indigo",
      icon: "repeat",
      title: "Recorrentes de hoje",
      detail: `${recurringToday.length} lançamento(s) previstos para hoje`,
      href: "/recorrentes",
    })
  }

  const subscriptionSuggestions = detectSubscriptions(
    normalized,
    recurringRules,
    subscriptionDismissals,
  )
  if (subscriptionSuggestions.length > 0) {
    alerts.push({
      id: "assinaturas-detectadas",
      severity: "info",
      accent: "blue",
      icon: "calendar",
      title: "Assinaturas detectadas",
      detail: `${subscriptionSuggestions.length} sugestão(ões) para transformar em recorrente`,
      href: "/config?tab=contas",
    })
  }

  return alerts.sort((a, b) => compareSeverity[a.severity] - compareSeverity[b.severity])
}

const plusDays = (iso: string, days: number) => {
  const [y, m, d] = iso.split("-").map(Number)
  const next = new Date(Date.UTC(y, m - 1, d) + days * 86400000)
  return `${next.getUTCFullYear()}-${String(next.getUTCMonth() + 1).padStart(2, "0")}-${String(next.getUTCDate()).padStart(2, "0")}`
}
