import { describe, expect, it } from "vitest";
import {
  endOfCurrentMonthIso,
  expandRecurringRules,
  isForecastTransaction,
  isFutureRecurringRaw,
} from "./recurring";
import { RecurringRule, TransactionNormalized } from "./types";

function salaryRule(overrides: Partial<RecurringRule> = {}): RecurringRule {
  return {
    id: "salario",
    kind: "receita",
    descricao: "Salário",
    categoria: "SALARIO",
    valor: 5000,
    diaMes: 5,
    inicio: "2026-01-01",
    fim: null,
    ativo: true,
    criadoEm: "2026-01-01T00:00:00.000Z",
    ...overrides,
  };
}

describe("endOfCurrentMonthIso", () => {
  it("returns last day for months with 28, 30 and 31 days", () => {
    expect(endOfCurrentMonthIso(new Date("2026-02-10T12:00:00.000Z"))).toBe(
      "2026-02-28",
    );
    expect(endOfCurrentMonthIso(new Date("2026-04-10T12:00:00.000Z"))).toBe(
      "2026-04-30",
    );
    expect(endOfCurrentMonthIso(new Date("2026-01-10T12:00:00.000Z"))).toBe(
      "2026-01-31",
    );
  });
});

describe("expandRecurringRules", () => {
  it("includes future-day occurrence in the current month", () => {
    const today = new Date("2026-06-02T12:00:00.000Z");
    const raws = expandRecurringRules([salaryRule()], today);
    const june = raws.find((r) => r.id === "manual:salario:2026-06");
    expect(june).toBeDefined();
    expect(june?.data).toBe("05/06/2026");
  });

  it("does not include occurrences beyond the current month", () => {
    const today = new Date("2026-06-02T12:00:00.000Z");
    const raws = expandRecurringRules([salaryRule()], today);
    expect(raws.some((r) => r.id === "manual:salario:2026-07")).toBe(false);
  });

  it("respects rule.fim in the past", () => {
    const today = new Date("2026-06-02T12:00:00.000Z");
    const raws = expandRecurringRules(
      [salaryRule({ fim: "2026-03-31" })],
      today,
    );
    expect(raws.map((r) => r.id)).toEqual([
      "manual:salario:2026-01",
      "manual:salario:2026-02",
      "manual:salario:2026-03",
    ]);
  });

  it("skips rules that start after today", () => {
    const today = new Date("2026-06-02T12:00:00.000Z");
    const raws = expandRecurringRules(
      [salaryRule({ inicio: "2026-07-01" })],
      today,
    );
    expect(raws).toHaveLength(0);
  });
});

describe("isFutureRecurringRaw", () => {
  it("returns true for recurring raw with future date", () => {
    expect(
      isFutureRecurringRaw(
        {
          sourceId: "manual:salario",
          data: "05/06/2026",
          dataISO: "2026-06-05",
        },
        new Date("2026-06-02T12:00:00.000Z"),
      ),
    ).toBe(true);
  });

  it("returns false for past recurring raw", () => {
    expect(
      isFutureRecurringRaw(
        {
          sourceId: "manual:salario",
          data: "05/05/2026",
          dataISO: "2026-05-05",
        },
        new Date("2026-06-02T12:00:00.000Z"),
      ),
    ).toBe(false);
  });
});

describe("isForecastTransaction", () => {
  function tx(
    partial: Partial<TransactionNormalized> & Pick<TransactionNormalized, "dataISO">,
  ): TransactionNormalized {
    const [y, m, d] = partial.dataISO.split("-").map(Number);
    return {
      id: partial.id ?? partial.dataISO,
      data: `${d}/${m}/${y}`,
      lancamento: partial.lancamento ?? "Test",
      categoria: partial.categoria ?? "Cat",
      tipo: partial.tipo ?? "Receita",
      valorOriginal: partial.valorOriginal ?? -100,
      fonte: partial.fonte ?? "manual",
      sourceId: partial.sourceId ?? "manual:salario",
      estabelecimento: "Loja",
      valorAnalise: 100,
      natureza: "Receita",
      ajuste: false,
      tipoFluxo: "entrada",
      valorFluxo: 100,
      mes: m,
      ano: y,
      anoMes: `${y}-${String(m).padStart(2, "0")}`,
      mesLabel: "test",
      diaSemana: "seg",
      diaSemanaIndex: 1,
      semana: "w",
      faixaValor: "0-50",
      fimSemana: false,
      ...partial,
      dataISO: partial.dataISO,
    };
  }

  it("marks future recurring as forecast", () => {
    const today = new Date("2026-06-02T12:00:00.000Z");
    expect(
      isForecastTransaction(
        tx({ dataISO: "2026-06-05", sourceId: "manual:salario" }),
        today,
      ),
    ).toBe(true);
  });

  it("marks future estimated installment as forecast", () => {
    const today = new Date("2026-06-02T12:00:00.000Z");
    expect(
      isForecastTransaction(
        tx({
          dataISO: "2026-07-07",
          sourceId: "src-1",
          installment: {
            current: 3,
            total: 3,
            purchaseDate: "01/05/2026",
            groupKey: "g1",
            estimated: true,
          },
        }),
        today,
      ),
    ).toBe(true);
  });

  it("returns false for past transactions", () => {
    const today = new Date("2026-06-10T12:00:00.000Z");
    expect(
      isForecastTransaction(
        tx({ dataISO: "2026-06-05", sourceId: "manual:salario" }),
        today,
      ),
    ).toBe(false);
  });
});
