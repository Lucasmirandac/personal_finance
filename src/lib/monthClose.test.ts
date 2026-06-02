import { describe, expect, it } from "vitest";
import {
  computeMonthCloseSummary,
  getOldestPendingClose,
} from "./monthClose";
import type {
  CategoryBudget,
  MonthCloseEntry,
  TransactionNormalized,
} from "./types";

function tx(
  partial: Pick<TransactionNormalized, "categoria" | "anoMes" | "valorFluxo"> &
    Partial<TransactionNormalized>,
): TransactionNormalized {
  const [y, m] = partial.anoMes.split("-").map(Number);
  return {
    ...partial,
    id: partial.id ?? "1",
    data: partial.data ?? "01/01/2026",
    lancamento: partial.lancamento ?? "Test",
    categoria: partial.categoria,
    tipo: partial.tipo ?? "Débito",
    valorOriginal: partial.valorOriginal ?? -partial.valorFluxo,
    fonte: partial.fonte ?? "manual",
    sourceId: partial.sourceId ?? "s1",
    estabelecimento: partial.estabelecimento ?? "Loja",
    valorAnalise: partial.valorAnalise ?? partial.valorFluxo,
    natureza: partial.natureza ?? "Gasto",
    ajuste: partial.ajuste ?? false,
    tipoFluxo: partial.tipoFluxo ?? "saida",
    valorFluxo: partial.valorFluxo,
    dataISO: partial.dataISO ?? `${partial.anoMes}-15`,
    mes: partial.mes ?? m,
    ano: partial.ano ?? y,
    anoMes: partial.anoMes,
    mesLabel: partial.mesLabel ?? "mar/26",
    diaSemana: partial.diaSemana ?? "dom",
    diaSemanaIndex: partial.diaSemanaIndex ?? 0,
    semana: partial.semana ?? "2026-W11",
    faixaValor: partial.faixaValor ?? "0-50",
    fimSemana: partial.fimSemana ?? true,
  };
}

const todayJune = new Date("2026-06-15T12:00:00.000Z");

describe("getOldestPendingClose", () => {
  it("returns null when nothing is pending", () => {
    expect(
      getOldestPendingClose(
        [tx({ categoria: "Mercado", anoMes: "2026-05", valorFluxo: 10 })],
        [{ anoMes: "2026-05", sobra: 1, top3estouro: [], closedAt: "x" }],
        todayJune,
      ),
    ).toBeNull();
  });

  it("returns null for current month only", () => {
    expect(
      getOldestPendingClose(
        [tx({ categoria: "Mercado", anoMes: "2026-06", valorFluxo: 10 })],
        [],
        todayJune,
      ),
    ).toBeNull();
  });

  it("returns the oldest pending month", () => {
    const normalized = [
      tx({ categoria: "A", anoMes: "2026-04", valorFluxo: 10 }),
      tx({ categoria: "B", anoMes: "2026-05", valorFluxo: 10 }),
    ];
    expect(getOldestPendingClose(normalized, [], todayJune)).toBe("2026-04");
  });

  it("skips already closed months", () => {
    const normalized = [
      tx({ categoria: "A", anoMes: "2026-04", valorFluxo: 10 }),
      tx({ categoria: "B", anoMes: "2026-05", valorFluxo: 10 }),
    ];
    const closed: MonthCloseEntry[] = [
      { anoMes: "2026-04", sobra: 0, top3estouro: [], closedAt: "x" },
    ];
    expect(getOldestPendingClose(normalized, closed, todayJune)).toBe("2026-05");
  });
});

describe("computeMonthCloseSummary", () => {
  const baseBudget: CategoryBudget = {
    id: "b1",
    categoria: "Mercado",
    valorMensal: 100,
    ativa: true,
    criadaEm: "x",
    atualizadaEm: "x",
  };

  it("suggests criar_orcamento without active budgets", () => {
    const summary = computeMonthCloseSummary({
      anoMes: "2026-05",
      normalized: [
        tx({ categoria: "Mercado", anoMes: "2026-05", valorFluxo: 50 }),
      ],
      recurringRules: [],
      accounts: [],
      structuralCategories: [],
      budgets: [],
    });
    expect(summary.hasActiveBudgets).toBe(false);
    expect(summary.sugestao).toEqual({ tipo: "criar_orcamento" });
  });

  it("suggests aumentar_limite when a category is over budget", () => {
    const budgets: CategoryBudget[] = [
      baseBudget,
      {
        ...baseBudget,
        id: "b2",
        categoria: "Lazer",
        valorMensal: 50,
      },
    ];
    const summary = computeMonthCloseSummary({
      anoMes: "2026-05",
      normalized: [
        tx({ categoria: "Mercado", anoMes: "2026-05", valorFluxo: 150 }),
        tx({ categoria: "Lazer", anoMes: "2026-05", valorFluxo: 20 }),
      ],
      recurringRules: [],
      accounts: [],
      structuralCategories: [],
      budgets,
    });
    expect(summary.sugestao.tipo).toBe("aumentar_limite");
    if (summary.sugestao.tipo === "aumentar_limite") {
      expect(summary.sugestao.categoria).toBe("Mercado");
      expect(summary.sugestao.deltaSugerido).toBeGreaterThan(0);
    }
    expect(summary.top3Estouro[0]?.categoria).toBe("Mercado");
  });

  it("suggests manter when no category is over 100%", () => {
    const summary = computeMonthCloseSummary({
      anoMes: "2026-05",
      normalized: [
        tx({ categoria: "Mercado", anoMes: "2026-05", valorFluxo: 40 }),
      ],
      recurringRules: [],
      accounts: [],
      structuralCategories: [],
      budgets: [baseBudget],
    });
    expect(summary.sugestao).toEqual({ tipo: "manter" });
  });
});
