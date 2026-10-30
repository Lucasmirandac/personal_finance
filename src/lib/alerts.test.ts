import { describe, expect, it } from "vitest"
import { buildPainelAlerts } from "./alerts"
import { DEFAULT_SETTINGS, EMPTY_DATASET, Account } from "./types"

function cashAccount(partial?: Partial<Account>): Account {
  return {
    id: "acc-cc",
    nome: "Conta corrente",
    kind: "cc",
    saldoInicial: 1000,
    dataReferencia: "2026-06-01",
    ativa: true,
    criadaEm: "2026-06-01T00:00:00.000Z",
    ...partial,
  }
}

describe("buildPainelAlerts", () => {
  it("generates critical alert when projection has negative balance", () => {
    const alerts = buildPainelAlerts({
      dataset: EMPTY_DATASET,
      settings: DEFAULT_SETTINGS,
      recurringRules: [],
      accounts: [cashAccount()],
      normalized: [],
      budgets: [],
      summary: {
        saldoInicial: 100,
        menorSaldo: -500,
        menorSaldoData: "2026-11-15",
        saldoFinal: -200,
        totalEntradas: 0,
        totalSaidas: 300,
        mediaDiaria: -10,
      },
      upcomingEvents: [],
      subscriptionDismissals: [],
      lastBackupAt: new Date().toISOString(),
    })

    const negativeAlert = alerts.find((a) => a.id === "saldo-negativo")
    expect(negativeAlert).toBeDefined()
    expect(negativeAlert?.severity).toBe("critical")
    expect(negativeAlert?.detail).toContain("-R$")
  })

  it("prioritizes critical alerts over warnings and info", () => {
    const alerts = buildPainelAlerts({
      dataset: EMPTY_DATASET,
      settings: DEFAULT_SETTINGS,
      recurringRules: [],
      accounts: [cashAccount()],
      normalized: [],
      budgets: [],
      summary: {
        saldoInicial: 100,
        menorSaldo: -500,
        menorSaldoData: "2026-11-15",
        saldoFinal: -200,
        totalEntradas: 0,
        totalSaidas: 300,
        mediaDiaria: -10,
      },
      upcomingEvents: [],
      subscriptionDismissals: [],
      lastBackupAt: "2025-01-01T00:00:00.000Z", // Outdated backup triggers warning
    })

    expect(alerts.length).toBeGreaterThan(1)
    // Critical alert should come before warning alert
    const firstCriticalIdx = alerts.findIndex((a) => a.severity === "critical")
    const firstWarningIdx = alerts.findIndex((a) => a.severity === "warning")
    expect(firstCriticalIdx).toBeLessThan(firstWarningIdx)
  })
})
