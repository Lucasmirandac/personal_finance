import { describe, expect, it } from "vitest";
import {
  cardLimitAlertSummary,
  cardLimitUsageForAccount,
  cardLimitUsages,
  getCurrentCycleForAccount,
  projectCardLimitAfterExpense,
  usageFromCycle,
} from "./cardLimits";
import { Account, TransactionNormalized } from "./types";

const today = "2026-06-15";

function cardAccount(partial: Partial<Account> = {}): Account {
  return {
    id: "card-1",
    nome: "Nubank",
    kind: "cartao",
    saldoInicial: 0,
    dataReferencia: "2026-01-01",
    ativa: true,
    criadaEm: "2026-01-01T00:00:00.000Z",
    fonteCsv: "nubank",
    diaFechamento: 10,
    diaPagamento: 20,
    limiteMensal: 1000,
    ...partial,
  };
}

function tx(
  dataISO: string,
  valorAnalise: number,
  partial: Partial<TransactionNormalized> = {},
): TransactionNormalized {
  const [y, m, d] = dataISO.split("-").map(Number);
  return {
    id: partial.id ?? `${dataISO}-${valorAnalise}`,
    data: `${d}/${m}/${y}`,
    lancamento: partial.lancamento ?? "Compra",
    categoria: partial.categoria ?? "MERCADO",
    tipo: partial.tipo ?? "Avulso",
    valorOriginal: partial.valorOriginal ?? -valorAnalise,
    fonte: partial.fonte ?? "nubank",
    sourceId: partial.sourceId ?? "src-1",
    accountId: partial.accountId ?? "card-1",
    estabelecimento: "Loja",
    valorAnalise,
    natureza: "Gasto",
    ajuste: false,
    tipoFluxo: "saida",
    valorFluxo: valorAnalise,
    dataISO,
    mes: m,
    ano: y,
    anoMes: `${y}-${String(m).padStart(2, "0")}`,
    mesLabel: "jun",
    diaSemana: "seg",
    diaSemanaIndex: 1,
    semana: "w",
    faixaValor: "0-50",
    fimSemana: false,
    ...partial,
  };
}

describe("cardLimits", () => {
  it("returns empty usages when no card has a configured limit", () => {
    const account = cardAccount({ limiteMensal: undefined });
    const usages = cardLimitUsages([], [account], today);
    expect(usages).toEqual([]);
  });

  it("computes usage against the current open cycle", () => {
    const account = cardAccount({ limiteMensal: 1000 });
    const accounts = [account];
    const normalized = [tx("2026-06-05", 790)];

    const usage = cardLimitUsageForAccount(account, normalized, accounts, today);
    expect(usage).not.toBeNull();
    expect(usage?.gasto).toBe(790);
    expect(usage?.percentual).toBe(79);
    expect(usage?.status).toBe("ok");
    expect(usage?.restante).toBe(210);
  });

  it("marks warning at 80% and danger at 100%", () => {
    const account = cardAccount({ limiteMensal: 1000 });
    const accounts = [account];

    const warningUsage = cardLimitUsageForAccount(
      account,
      [tx("2026-06-05", 800)],
      accounts,
      today,
    );
    expect(warningUsage?.status).toBe("warning");

    const dangerUsage = cardLimitUsageForAccount(
      account,
      [tx("2026-06-05", 1000)],
      accounts,
      today,
    );
    expect(dangerUsage?.status).toBe("danger");
  });

  it("projects additional expense onto the current cycle", () => {
    const usage = {
      accountId: "card-1",
      accountNome: "Nubank",
      limite: 1000,
      gasto: 700,
      percentual: 70,
      status: "ok" as const,
      restante: 300,
      payDate: "2026-06-20",
    };

    const projected = projectCardLimitAfterExpense(usage, 150);
    expect(projected.gasto).toBe(850);
    expect(projected.percentual).toBe(85);
    expect(projected.status).toBe("warning");
    expect(projected.restante).toBe(150);
  });

  it("ignores inactive cards and cards without limit", () => {
    const active = cardAccount({ id: "a", limiteMensal: 500 });
    const inactive = cardAccount({
      id: "b",
      ativa: false,
      limiteMensal: 500,
    });
    const noLimit = cardAccount({ id: "c", limiteMensal: undefined });

    const usages = cardLimitUsages([], [active, inactive, noLimit], today);
    expect(usages).toHaveLength(1);
    expect(usages[0].accountId).toBe("a");
  });

  it("summarizes warning and danger alerts", () => {
    const summary = cardLimitAlertSummary([
      {
        accountId: "1",
        accountNome: "A",
        limite: 100,
        gasto: 85,
        percentual: 85,
        status: "warning",
        restante: 15,
        payDate: "2026-06-20",
      },
      {
        accountId: "2",
        accountNome: "B",
        limite: 100,
        gasto: 120,
        percentual: 120,
        status: "danger",
        restante: 0,
        payDate: "2026-06-20",
      },
    ]);

    expect(summary.warning).toBe(1);
    expect(summary.danger).toBe(1);
    expect(summary.total).toBe(2);
  });

  it("selects the next upcoming cycle as current", () => {
    const account = cardAccount();
    const cycles = [
      {
        key: "past",
        account,
        payDate: "2026-05-20",
        closeDay: 10,
        paymentDay: 20,
        transactions: [],
        total: 100,
      },
      {
        key: "current",
        account,
        payDate: "2026-06-20",
        closeDay: 10,
        paymentDay: 20,
        transactions: [],
        total: 200,
      },
    ];

    const current = getCurrentCycleForAccount(account.id, cycles, today);
    expect(current?.total).toBe(200);
    expect(usageFromCycle(account, current)?.gasto).toBe(200);
  });
});
