import { describe, expect, it } from "vitest";
import {
  derivePaymentState,
  isPayablePlanned,
  matchesPaymentFilter,
  nextPaymentStatus,
  summarizePaymentMonth,
} from "./paymentStatus";
import { PaymentStatusState, TransactionNormalized } from "./types";

function expenseTx(
  overrides: Partial<TransactionNormalized> = {},
): TransactionNormalized {
  return {
    id: "manual:aluguel:2026-06",
    data: "05/06/2026",
    lancamento: "Aluguel",
    categoria: "Moradia",
    tipo: "Despesa fixa",
    valorOriginal: 1500,
    fonte: "manual",
    sourceId: "manual:aluguel",
    estabelecimento: "Aluguel",
    valorAnalise: 1500,
    natureza: "Despesa fixa",
    ajuste: false,
    tipoFluxo: "saida",
    valorFluxo: 1500,
    dataISO: "2026-06-05",
    mes: 6,
    ano: 2026,
    anoMes: "2026-06",
    mesLabel: "jun/2026",
    diaSemana: "sex",
    diaSemanaIndex: 5,
    semana: "2026-W23",
    faixaValor: "1k+",
    fimSemana: false,
    ...overrides,
  };
}

describe("isPayablePlanned", () => {
  it("includes recurring fixed expenses", () => {
    expect(isPayablePlanned(expenseTx())).toBe(true);
  });

  it("excludes recurring income", () => {
    expect(
      isPayablePlanned(
        expenseTx({
          id: "manual:salario:2026-06",
          sourceId: "manual:salario",
          tipo: "Receita",
          tipoFluxo: "entrada",
          valorOriginal: -5000,
          valorFluxo: 5000,
        }),
      ),
    ).toBe(false);
  });

  it("includes manual quick-add outflows", () => {
    expect(
      isPayablePlanned(
        expenseTx({
          id: "tx-1",
          sourceId: "manual:quick",
          tipo: "Avulso",
        }),
      ),
    ).toBe(true);
  });
});

describe("derivePaymentState", () => {
  const today = new Date("2026-06-10T12:00:00.000Z");

  it("returns pago when explicitly marked", () => {
    const status: PaymentStatusState = {
      "manual:aluguel:2026-06": {
        rawId: "manual:aluguel:2026-06",
        status: "pago",
        updatedAt: "2026-06-10T00:00:00.000Z",
      },
    };
    expect(derivePaymentState(expenseTx(), status, today)).toBe("pago");
  });

  it("returns vencida for overdue explicit a_pagar", () => {
    const status: PaymentStatusState = {
      "manual:aluguel:2026-06": {
        rawId: "manual:aluguel:2026-06",
        status: "a_pagar",
        updatedAt: "2026-06-10T00:00:00.000Z",
      },
    };
    expect(derivePaymentState(expenseTx(), status, today)).toBe("vencida");
  });

  it("returns a_confirmar for due items in current month without marking", () => {
    expect(derivePaymentState(expenseTx(), {}, today)).toBe("a_confirmar");
  });

  it("returns previsto for future due dates", () => {
    expect(
      derivePaymentState(
        expenseTx({ dataISO: "2026-06-15", data: "15/06/2026" }),
        {},
        today,
      ),
    ).toBe("previsto");
  });

  it("returns none for past months without marking", () => {
    expect(
      derivePaymentState(
        expenseTx({ dataISO: "2026-05-05", anoMes: "2026-05" }),
        {},
        today,
      ),
    ).toBe("none");
  });
});

describe("matchesPaymentFilter", () => {
  it("matches pending states", () => {
    expect(matchesPaymentFilter("a_confirmar", "pending")).toBe(true);
    expect(matchesPaymentFilter("vencida", "pending")).toBe(true);
    expect(matchesPaymentFilter("pago", "pending")).toBe(false);
  });

  it("matches paid state", () => {
    expect(matchesPaymentFilter("pago", "paid")).toBe(true);
    expect(matchesPaymentFilter("a_pagar", "paid")).toBe(false);
  });
});

describe("nextPaymentStatus", () => {
  it("toggles between pago and a_pagar", () => {
    expect(nextPaymentStatus("pago")).toBe("a_pagar");
    expect(nextPaymentStatus("vencida")).toBe("pago");
    expect(nextPaymentStatus("a_confirmar")).toBe("pago");
  });
});

describe("summarizePaymentMonth", () => {
  it("counts pending and paid planned items", () => {
    const txs = [
      expenseTx(),
      expenseTx({
        id: "manual:internet:2026-06",
        sourceId: "manual:internet",
        lancamento: "Internet",
        valorOriginal: 120,
        valorFluxo: 120,
      }),
    ];
    const status: PaymentStatusState = {
      "manual:internet:2026-06": {
        rawId: "manual:internet:2026-06",
        status: "pago",
        updatedAt: "2026-06-10T00:00:00.000Z",
      },
    };
    const summary = summarizePaymentMonth(
      txs,
      status,
      new Date("2026-06-10T12:00:00.000Z"),
    );
    expect(summary.pendingCount).toBe(1);
    expect(summary.pendingTotal).toBe(1500);
    expect(summary.paidCount).toBe(1);
  });
});
