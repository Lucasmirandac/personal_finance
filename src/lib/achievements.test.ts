import { describe, expect, it } from "vitest";
import {
  computeStreakDays,
  detectVoltaCerteira,
  evaluateAchievements,
  mergeAchievementSnapshots,
} from "./achievements";
import { EMPTY_ACHIEVEMENTS, type TransactionNormalized } from "./types";

function tx(dataISO: string): TransactionNormalized {
  const [y, m, d] = dataISO.split("-").map(Number);
  return {
    id: dataISO,
    data: `${d}/${m}/${y}`,
    lancamento: "Test",
    categoria: "Mercado",
    tipo: "Débito",
    valorOriginal: -10,
    fonte: "manual",
    sourceId: "s1",
    estabelecimento: "Loja",
    valorAnalise: 10,
    natureza: "Gasto",
    ajuste: false,
    tipoFluxo: "saida",
    valorFluxo: 10,
    dataISO,
    mes: m,
    ano: y,
    anoMes: `${y}-${String(m).padStart(2, "0")}`,
    mesLabel: "test",
    diaSemana: "seg",
    diaSemanaIndex: 1,
    semana: "w",
    faixaValor: "0-50",
    fimSemana: false,
  };
}

describe("computeStreakDays", () => {
  it("counts streak ending today", () => {
    const today = new Date("2026-06-10T12:00:00.000Z");
    const normalized = [
      tx("2026-06-10"),
      tx("2026-06-09"),
      tx("2026-06-08"),
    ];
    expect(computeStreakDays(normalized, today)).toBe(3);
  });

  it("returns 0 when latest activity is too old", () => {
    const today = new Date("2026-06-10T12:00:00.000Z");
    expect(computeStreakDays([tx("2026-06-01")], today)).toBe(0);
  });

  it("ignores future-dated transactions for streak", () => {
    const today = new Date("2026-06-02T12:00:00.000Z");
    const normalized = [
      tx("2026-06-02"),
      tx("2026-06-01"),
      tx("2026-06-05"),
    ];
    expect(computeStreakDays(normalized, today)).toBe(2);
  });
});

describe("detectVoltaCerteira", () => {
  it("detects return after 3+ inactive days", () => {
    const today = new Date("2026-06-10T12:00:00.000Z");
    const normalized = [tx("2026-06-01"), tx("2026-06-10")];
    expect(detectVoltaCerteira(normalized, today)).toBe(true);
  });

  it("ignores future-dated activity", () => {
    const today = new Date("2026-06-02T12:00:00.000Z");
    const normalized = [tx("2026-06-01"), tx("2026-06-05")];
    expect(detectVoltaCerteira(normalized, today)).toBe(false);
  });
});

describe("evaluateAchievements", () => {
  it("is idempotent for already unlocked", () => {
    const today = new Date("2026-06-10T12:00:00.000Z");
    const normalized = Array.from({ length: 7 }, (_, i) =>
      tx(`2026-06-0${i + 4}`),
    );
    const first = evaluateAchievements({
      normalized,
      manualTransactions: [{ id: "1", sourceId: "manual:quick" }],
      accounts: [],
      recurringRules: [],
      structuralCategories: [],
      snapshot: EMPTY_ACHIEVEMENTS,
      today,
    });
    const second = evaluateAchievements({
      normalized,
      manualTransactions: [{ id: "1", sourceId: "manual:quick" }],
      accounts: [],
      recurringRules: [],
      structuralCategories: [],
      snapshot: first.snapshot,
      today,
    });
    expect(second.newlyUnlocked).toHaveLength(0);
    expect(second.allUnlocked.length).toBe(first.allUnlocked.length);
  });
});

describe("mergeAchievementSnapshots", () => {
  it("keeps earliest unlock date per id", () => {
    const merged = mergeAchievementSnapshots(
      {
        unlocked: [
          { id: "semana-viva", unlockedAt: "2026-06-10T00:00:00.000Z" },
        ],
        meta: { lastSobraTotal: 0, lastStreak: 7 },
      },
      {
        unlocked: [
          { id: "semana-viva", unlockedAt: "2026-06-09T00:00:00.000Z" },
        ],
        meta: { lastSobraTotal: 100, lastStreak: 3 },
      },
    );
    expect(merged.unlocked[0]?.unlockedAt).toBe("2026-06-09T00:00:00.000Z");
    expect(merged.meta.lastSobraTotal).toBe(100);
  });
});
