import { describe, expect, it } from "vitest";
import { computeSavingsDemo } from "./savingsDemo";

const today = new Date("2026-06-10T12:00:00.000Z");

describe("computeSavingsDemo", () => {
  it("subtracts 20% percent savings from sobra and diarioRestante", () => {
    const without = computeSavingsDemo({
      rendaMensal: 10_000,
      custoFixoMensal: 2_000,
      gastoVariavelMes: 500,
      today,
    });
    const withSavings = computeSavingsDemo({
      rendaMensal: 10_000,
      custoFixoMensal: 2_000,
      gastoVariavelMes: 500,
      poupanca: { modo: "percent", percentual: 20 },
      today,
    });

    expect(withSavings.rendaDisponivel).toBe(8_000);
    expect(withSavings.aporteMensal).toBe(1_600);
    expect(withSavings.sobraDoMes).toBe(without.sobraDoMes - 1_600);
    expect(withSavings.diarioRestante).toBeLessThan(without.diarioRestante);
    expect(withSavings.aporte12m).toBe(19_200);
  });

  it("subtracts fixed savings reservation from sobra", () => {
    const without = computeSavingsDemo({
      rendaMensal: 10_000,
      custoFixoMensal: 2_000,
      gastoVariavelMes: 500,
      today,
    });
    const withSavings = computeSavingsDemo({
      rendaMensal: 10_000,
      custoFixoMensal: 2_000,
      gastoVariavelMes: 500,
      poupanca: { modo: "fixed", valorMensal: 500 },
      today,
    });

    expect(withSavings.aporteMensal).toBe(500);
    expect(withSavings.sobraDoMes).toBe(without.sobraDoMes - 500);
    expect(withSavings.percentualEfetivo).toBe(6.25);
  });

  it("flags when reservation consumes all available remainder", () => {
    const result = computeSavingsDemo({
      rendaMensal: 5_000,
      custoFixoMensal: 4_000,
      poupanca: { modo: "percent", percentual: 80 },
      today,
    });

    expect(result.rendaDisponivel).toBe(1_000);
    expect(result.aporteMensal).toBe(800);
    expect(result.diarioRestante).toBeGreaterThan(0);
    expect(result.reservaConsomeTodaRenda).toBe(false);
  });
});
