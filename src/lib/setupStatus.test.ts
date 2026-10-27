import { describe, expect, it } from "vitest";
import {
  getSetupSteps,
  hasCardAccount,
  hasCashAccount,
  hasFinishedAccountSetup,
  hasIncome,
  hasMonthLaunched,
} from "./setupStatus";
import {
  DEFAULT_SETTINGS,
  EMPTY_DATASET,
  type Account,
  type ManualTransaction,
  type RecurringRule,
} from "./types";

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
  };
}

function cardAccount(partial?: Partial<Account>): Account {
  return {
    id: "acc-card",
    nome: "Nubank",
    kind: "cartao",
    saldoInicial: 0,
    dataReferencia: "2026-06-01",
    ativa: true,
    criadaEm: "2026-06-01T00:00:00.000Z",
    fonteCsv: "nubank",
    diaFechamento: 10,
    diaPagamento: 20,
    ...partial,
  };
}

function recurringRule(partial: Partial<RecurringRule>): RecurringRule {
  return {
    id: "rec-1",
    kind: "receita",
    descricao: "Salário",
    categoria: "Renda",
    valor: 5000,
    diaMes: 5,
    inicio: "2026-01-01",
    fim: null,
    ativo: true,
    criadoEm: "2026-06-01T00:00:00.000Z",
    ...partial,
  };
}

describe("hasCashAccount", () => {
  it("returns false when there are no accounts", () => {
    expect(hasCashAccount([])).toBe(false);
  });

  it("returns false when only card accounts exist", () => {
    expect(hasCashAccount([cardAccount()])).toBe(false);
  });

  it("returns true when an active cash account exists", () => {
    expect(hasCashAccount([cashAccount()])).toBe(true);
  });

  it("returns false when cash account is inactive", () => {
    expect(hasCashAccount([cashAccount({ ativa: false })])).toBe(false);
  });
});

describe("hasCardAccount", () => {
  it("returns false when there are no cards", () => {
    expect(hasCardAccount([])).toBe(false);
    expect(hasCardAccount([cashAccount()])).toBe(false);
  });

  it("returns true when an active card exists", () => {
    expect(hasCardAccount([cardAccount()])).toBe(true);
  });

  it("returns false when the card is inactive", () => {
    expect(hasCardAccount([cardAccount({ ativa: false })])).toBe(false);
  });
});

describe("hasFinishedAccountSetup", () => {
  it("needs cash and a card", () => {
    expect(hasFinishedAccountSetup([])).toBe(false);
    expect(hasFinishedAccountSetup([cashAccount()])).toBe(false);
    expect(hasFinishedAccountSetup([cardAccount()])).toBe(false);
    expect(hasFinishedAccountSetup([cashAccount(), cardAccount()])).toBe(true);
  });
});

describe("hasMonthLaunched", () => {
  it("returns false with no manuals, fixos or csv", () => {
    expect(hasMonthLaunched([])).toBe(false);
    expect(
      hasMonthLaunched([recurringRule({ kind: "receita" })]),
    ).toBe(false);
  });

  it("returns true with an active fixed expense", () => {
    expect(
      hasMonthLaunched([
        recurringRule({ kind: "despesa_fixa", descricao: "Aluguel" }),
      ]),
    ).toBe(true);
  });

  it("returns true with a manual transaction", () => {
    const tx = { id: "m1" } as ManualTransaction;
    expect(hasMonthLaunched([], [tx])).toBe(true);
  });

  it("returns true when a csv source exists", () => {
    expect(hasMonthLaunched([], [], 1)).toBe(true);
  });
});

describe("getSetupSteps", () => {
  it("does not include a csv step", () => {
    const steps = getSetupSteps(
      EMPTY_DATASET,
      DEFAULT_SETTINGS,
      [],
      [cashAccount(), cardAccount()],
    );
    expect(steps.map((s) => s.id)).not.toContain("csv");
    expect(steps.filter((s) => s.id !== "nuvem").map((s) => s.id)).toEqual([
      "contas",
      "mes",
    ]);
  });

  it("marks contas done only with cash and a card", () => {
    const cashOnly = getSetupSteps(EMPTY_DATASET, DEFAULT_SETTINGS, [], [
      cashAccount(),
    ]);
    expect(cashOnly.find((s) => s.id === "contas")?.done).toBe(false);

    const both = getSetupSteps(EMPTY_DATASET, DEFAULT_SETTINGS, [], [
      cashAccount(),
      cardAccount(),
    ]);
    expect(both.find((s) => s.id === "contas")?.done).toBe(true);
  });

  it("marks mes launched from a manual row", () => {
    const steps = getSetupSteps(
      EMPTY_DATASET,
      DEFAULT_SETTINGS,
      [],
      [cashAccount(), cardAccount()],
      false,
      [{ id: "m1" } as ManualTransaction],
    );
    expect(steps.find((s) => s.id === "mes")?.done).toBe(true);
  });
});

describe("hasIncome", () => {
  it("returns false when there are no recurring rules", () => {
    expect(hasIncome([])).toBe(false);
  });

  it("returns false when only fixed expenses exist", () => {
    expect(
      hasIncome([
        recurringRule({ kind: "despesa_fixa", descricao: "Aluguel" }),
      ]),
    ).toBe(false);
  });

  it("returns false when income rule is inactive", () => {
    expect(hasIncome([recurringRule({ ativo: false })])).toBe(false);
  });

  it("returns true when at least one active income rule exists", () => {
    expect(hasIncome([recurringRule({ kind: "receita" })])).toBe(true);
  });
});
