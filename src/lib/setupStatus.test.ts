import { describe, expect, it } from "vitest";
import { hasCashAccount, hasIncome } from "./setupStatus";
import type { Account, RecurringRule } from "./types";

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
