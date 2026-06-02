import { describe, expect, it } from "vitest";
import {
  budgetCategoriesMatch,
  budgetCategoryKey,
  canShowBudgetSuggestions,
  previousCompleteMonths,
  removeOutlierMonthlyTotals,
  roundBudgetSuggestion,
  suggestBudgetsFromHistory,
} from "./budgets";
import type { CategoryBudget, TransactionNormalized } from "./types";

function tx(
  partial: Pick<TransactionNormalized, "categoria" | "anoMes" | "valorFluxo"> &
    Partial<TransactionNormalized>,
): TransactionNormalized {
  return {
    id: "1",
    data: "01/01/2026",
    lancamento: "Test",
    categoria: partial.categoria,
    tipo: "Débito",
    valorOriginal: -partial.valorFluxo,
    fonte: "manual",
    sourceId: "s1",
    estabelecimento: "Loja",
    valorAnalise: partial.valorFluxo,
    natureza: "Gasto",
    ajuste: false,
    tipoFluxo: "saida",
    valorFluxo: partial.valorFluxo,
    dataISO: partial.dataISO ?? "2026-03-15",
    mes: 3,
    ano: 2026,
    anoMes: partial.anoMes,
    mesLabel: "mar/26",
    diaSemana: "dom",
    diaSemanaIndex: 0,
    semana: "2026-W11",
    faixaValor: "0-50",
    fimSemana: true,
    ...partial,
  };
}

describe("budgetCategoryKey", () => {
  it("ignores accents and case", () => {
    expect(budgetCategoriesMatch("Alimentação", "alimentacao")).toBe(true);
    expect(budgetCategoryKey("Mercado")).toBe("mercado");
  });
});

describe("roundBudgetSuggestion", () => {
  it("rounds up to 10 below 500", () => {
    expect(roundBudgetSuggestion(237)).toBe(240);
    expect(roundBudgetSuggestion(10)).toBe(10);
  });

  it("rounds up to 50 above 500", () => {
    expect(roundBudgetSuggestion(520)).toBe(550);
  });
});

describe("removeOutlierMonthlyTotals", () => {
  it("drops months above 2x median", () => {
    const { cleaned, ignoredCount } = removeOutlierMonthlyTotals([
      100, 120, 500,
    ]);
    expect(ignoredCount).toBe(1);
    expect(cleaned).toEqual([100, 120]);
  });
});

describe("previousCompleteMonths", () => {
  it("excludes current month", () => {
    const ref = new Date("2026-06-15T12:00:00.000Z");
    expect(previousCompleteMonths(ref, 3)).toEqual([
      "2026-05",
      "2026-04",
      "2026-03",
    ]);
  });
});

describe("suggestBudgetsFromHistory", () => {
  const ref = new Date("2026-06-15T12:00:00.000Z");

  it("returns empty without enough history", () => {
    const normalized = [
      tx({
        categoria: "Mercado",
        anoMes: "2026-06",
        valorFluxo: 50,
        dataISO: "2026-06-10",
      }),
    ];
    expect(
      suggestBudgetsFromHistory(normalized, [], { referenceDate: ref }),
    ).toEqual([]);
    expect(canShowBudgetSuggestions(normalized, [], { referenceDate: ref })).toBe(
      false,
    );
  });

  it("suggests top categories from last 3 complete months", () => {
    const months = ["2026-03", "2026-04", "2026-05"];
    const normalized: TransactionNormalized[] = [];
    for (const anoMes of months) {
      for (let i = 0; i < 4; i++) {
        normalized.push(
          tx({
            categoria: "Mercado",
            anoMes,
            valorFluxo: 200,
            dataISO: `${anoMes}-0${i + 1}`,
          }),
        );
        normalized.push(
          tx({
            categoria: "Transporte",
            anoMes,
            valorFluxo: 80,
            dataISO: `${anoMes}-1${i}`,
          }),
        );
        normalized.push(
          tx({
            categoria: "Lazer",
            anoMes,
            valorFluxo: 50,
            dataISO: `${anoMes}-2${i}`,
          }),
        );
      }
    }
    normalized.push(
      tx({
        categoria: "Mercado",
        anoMes: "2026-02",
        valorFluxo: 100,
        dataISO: "2026-02-01",
      }),
    );

    const suggestions = suggestBudgetsFromHistory(normalized, [], {
      referenceDate: ref,
    });
    expect(suggestions.length).toBeGreaterThanOrEqual(2);
    const mercado = suggestions.find((s) => s.categoria === "Mercado");
    expect(mercado?.valorSugerido).toBe(800);
    expect(mercado?.mesesConsiderados).toBe(3);
    expect(canShowBudgetSuggestions(normalized, [], { referenceDate: ref })).toBe(
      true,
    );
  });

  it("excludes categories with active budgets", () => {
    const months = ["2026-03", "2026-04", "2026-05"];
    const normalized: TransactionNormalized[] = [];
    for (const anoMes of months) {
      for (let i = 0; i < 3; i++) {
        normalized.push(
          tx({
            categoria: "Mercado",
            anoMes,
            valorFluxo: 100,
            dataISO: `${anoMes}-0${i + 1}`,
          }),
        );
      }
    }
    const budgets: CategoryBudget[] = [
      {
        id: "b1",
        categoria: "Mercado",
        valorMensal: 500,
        ativa: true,
        criadaEm: "",
        atualizadaEm: "",
      },
    ];
    const suggestions = suggestBudgetsFromHistory(normalized, budgets, {
      referenceDate: ref,
    });
    expect(suggestions.some((s) => s.categoria === "Mercado")).toBe(false);
  });
});
