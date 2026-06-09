import { describe, expect, it } from "vitest";
import {
  mergeSavingsPreference,
  resolveAporteMensal,
} from "./savings";

describe("mergeSavingsPreference", () => {
  it("returns null for missing or invalid input", () => {
    expect(mergeSavingsPreference(null)).toBeNull();
    expect(mergeSavingsPreference(undefined)).toBeNull();
    expect(mergeSavingsPreference({ modo: "other" })).toBeNull();
    expect(mergeSavingsPreference({ modo: "fixed", valorMensal: 0 })).toBeNull();
  });

  it("clamps percent mode to 5–80", () => {
    expect(mergeSavingsPreference({ modo: "percent", percentual: 3 })).toEqual({
      modo: "percent",
      percentual: 5,
    });
    expect(mergeSavingsPreference({ modo: "percent", percentual: 90 })).toEqual({
      modo: "percent",
      percentual: 80,
    });
  });

  it("accepts valid fixed mode", () => {
    expect(
      mergeSavingsPreference({ modo: "fixed", valorMensal: 500.5 }),
    ).toEqual({
      modo: "fixed",
      valorMensal: 500.5,
    });
  });
});

describe("resolveAporteMensal", () => {
  it("returns zero when preference is null", () => {
    expect(resolveAporteMensal(5_000, null)).toEqual({
      aporteMensal: 0,
      modo: null,
      percentualEfetivo: null,
    });
  });

  it("computes percent mode from renda disponivel", () => {
    expect(
      resolveAporteMensal(5_000, { modo: "percent", percentual: 20 }),
    ).toEqual({
      aporteMensal: 1_000,
      modo: "percent",
      percentualEfetivo: 20,
    });
  });

  it("clamps fixed mode to renda disponivel", () => {
    expect(
      resolveAporteMensal(800, { modo: "fixed", valorMensal: 1_000 }),
    ).toEqual({
      aporteMensal: 800,
      modo: "fixed",
      percentualEfetivo: 100,
    });
  });

  it("reports effective percent for fixed mode", () => {
    expect(
      resolveAporteMensal(5_000, { modo: "fixed", valorMensal: 500 }),
    ).toEqual({
      aporteMensal: 500,
      modo: "fixed",
      percentualEfetivo: 10,
    });
  });
});
