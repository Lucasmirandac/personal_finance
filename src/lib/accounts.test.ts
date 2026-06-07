import { describe, expect, it } from "vitest";
import {
  ensureCardAccount,
  hasCardCycleConfigured,
  migrateAccountsFromLegacy,
  upsertCardAccountCycle,
} from "./accounts";
import {
  DEFAULT_SETTINGS,
  EMPTY_DATASET,
  type Dataset,
  type Settings,
  type Source,
} from "./types";

function source(fonte: "inter" | "nubank"): Source {
  return {
    id: `src-${fonte}`,
    fileName: `${fonte}.csv`,
    fonte,
    importedAt: "2026-01-01T00:00:00.000Z",
    rowsRaw: 1,
    raw: [],
  };
}

describe("migrateAccountsFromLegacy", () => {
  it("returns empty array when there is no legacy data", () => {
    expect(migrateAccountsFromLegacy(DEFAULT_SETTINGS, EMPTY_DATASET)).toEqual(
      [],
    );
  });

  it("creates Conta Principal when balanceAnchor is set", () => {
    const settings: Settings = {
      ...DEFAULT_SETTINGS,
      balanceAnchor: { data: "2026-03-01", valor: 1500 },
    };
    const accounts = migrateAccountsFromLegacy(settings, EMPTY_DATASET);
    expect(accounts).toHaveLength(1);
    expect(accounts[0]).toMatchObject({
      nome: "Conta Principal",
      kind: "cc",
      saldoInicial: 1500,
      dataReferencia: "2026-03-01",
      isDefault: true,
    });
  });

  it("creates only card accounts from dataset sources when there is no anchor", () => {
    const dataset: Dataset = {
      sources: [source("inter"), source("nubank")],
    };
    const accounts = migrateAccountsFromLegacy(DEFAULT_SETTINGS, dataset);
    expect(accounts).toHaveLength(2);
    expect(accounts.every((a) => a.kind === "cartao")).toBe(true);
    expect(accounts.map((a) => a.fonteCsv).sort()).toEqual(["inter", "nubank"]);
    expect(accounts.some((a) => a.nome === "Conta Principal")).toBe(false);
    expect(accounts.every((a) => a.cicloConfirmado !== true)).toBe(true);
    expect(accounts.every((a) => a.diaFechamento == null)).toBe(true);
  });

  it("creates Conta Principal plus one card per source without duplicates", () => {
    const settings: Settings = {
      ...DEFAULT_SETTINGS,
      balanceAnchor: { data: "2026-03-01", valor: 5000 },
      cards: [
        { fonte: "inter", diaFechamento: 5, diaPagamento: 15 },
        { fonte: "nubank", diaFechamento: 8, diaPagamento: 18 },
      ],
    };
    const dataset: Dataset = {
      sources: [source("inter"), source("nubank")],
    };
    const accounts = migrateAccountsFromLegacy(settings, dataset);
    expect(accounts).toHaveLength(3);
    expect(accounts.filter((a) => a.kind === "cc")).toHaveLength(1);
    expect(accounts.filter((a) => a.kind === "cartao")).toHaveLength(2);
    const cardFontes = accounts
      .filter((a) => a.kind === "cartao")
      .map((a) => a.fonteCsv);
    expect(new Set(cardFontes).size).toBe(2);
    expect(
      accounts
        .filter((a) => a.kind === "cartao")
        .every((a) => a.cicloConfirmado === true),
    ).toBe(true);
  });
});

describe("hasCardCycleConfigured", () => {
  it("returns false when account is missing or not confirmed", () => {
    expect(hasCardCycleConfigured(undefined)).toBe(false);
    expect(
      hasCardCycleConfigured({
        id: "c1",
        nome: "Inter",
        kind: "cartao",
        saldoInicial: 0,
        dataReferencia: "2026-06-01",
        ativa: true,
        criadaEm: "2026-06-01T00:00:00.000Z",
        fonteCsv: "inter",
        diaFechamento: 10,
        diaPagamento: 20,
      }),
    ).toBe(false);
  });

  it("returns true when cycle was explicitly confirmed", () => {
    expect(
      hasCardCycleConfigured({
        id: "c1",
        nome: "Inter",
        kind: "cartao",
        saldoInicial: 0,
        dataReferencia: "2026-06-01",
        ativa: true,
        criadaEm: "2026-06-01T00:00:00.000Z",
        fonteCsv: "inter",
        diaFechamento: 10,
        diaPagamento: 20,
        cicloConfirmado: true,
      }),
    ).toBe(true);
  });
});

describe("ensureCardAccount", () => {
  it("creates card without default cycle days", () => {
    const { account } = ensureCardAccount([], "inter");
    expect(account.fonteCsv).toBe("inter");
    expect(account.diaFechamento).toBeUndefined();
    expect(account.diaPagamento).toBeUndefined();
    expect(account.cicloConfirmado).toBeUndefined();
  });
});

describe("upsertCardAccountCycle", () => {
  it("creates a confirmed card account for a new fonte", () => {
    const { accounts, account } = upsertCardAccountCycle([], "nubank", {
      diaFechamento: 5,
      diaPagamento: 12,
    });
    expect(accounts).toHaveLength(1);
    expect(account).toMatchObject({
      fonteCsv: "nubank",
      diaFechamento: 5,
      diaPagamento: 12,
      cicloConfirmado: true,
    });
  });

  it("updates an existing card account and marks cycle confirmed", () => {
    const { accounts: created } = upsertCardAccountCycle([], "inter", {
      diaFechamento: 10,
      diaPagamento: 20,
    });
    const { accounts, account } = upsertCardAccountCycle(created, "inter", {
      diaFechamento: 3,
      diaPagamento: 8,
    });
    expect(accounts).toHaveLength(1);
    expect(account).toMatchObject({
      id: created[0].id,
      diaFechamento: 3,
      diaPagamento: 8,
      cicloConfirmado: true,
    });
  });
});
