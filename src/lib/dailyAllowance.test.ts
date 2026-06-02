import { describe, expect, it } from "vitest";
import { computeDailyAllowance } from "./dailyAllowance";
import { RecurringRule, TransactionNormalized } from "./types";

const today = new Date("2026-06-15T12:00:00.000Z");

function tx(
  dataISO: string,
  valorFluxo: number,
  partial: Partial<TransactionNormalized> = {},
): TransactionNormalized {
  const [y, m, d] = dataISO.split("-").map(Number);
  return {
    id: partial.id ?? dataISO,
    data: `${d}/${m}/${y}`,
    lancamento: partial.lancamento ?? "Gasto",
    categoria: partial.categoria ?? "MERCADO",
    tipo: partial.tipo ?? "Avulso",
    valorOriginal: partial.valorOriginal ?? valorFluxo,
    fonte: partial.fonte ?? "manual",
    sourceId: partial.sourceId ?? "manual:quick",
    estabelecimento: "Loja",
    valorAnalise: valorFluxo,
    natureza: "Gasto",
    ajuste: false,
    tipoFluxo: "saida",
    valorFluxo,
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

const salaryRule: RecurringRule = {
  id: "salario",
  kind: "receita",
  descricao: "Salário",
  categoria: "SALARIO",
  valor: 10_000,
  diaMes: 5,
  inicio: "2026-01-01",
  fim: null,
  ativo: true,
  criadoEm: "2026-01-01T00:00:00.000Z",
};

const rentRule: RecurringRule = {
  id: "aluguel",
  kind: "despesa_fixa",
  descricao: "Aluguel",
  categoria: "MORADIA",
  valor: 2_000,
  diaMes: 5,
  inicio: "2026-01-01",
  fim: null,
  ativo: true,
  criadoEm: "2026-01-01T00:00:00.000Z",
};

describe("computeDailyAllowance", () => {
  it("returns positive diarioRestante when month has surplus", () => {
    const result = computeDailyAllowance({
      normalized: [tx("2026-06-10", 500)],
      recurringRules: [salaryRule, rentRule],
      accounts: [],
      structuralCategories: [],
      today,
    });
    expect(result.temRendaCadastrada).toBe(true);
    expect(result.rendaDisponivel).toBe(8_000);
    expect(result.sobraDoMes).toBeGreaterThan(0);
    expect(result.diarioRestante).toBeGreaterThan(0);
    expect(result.status).not.toBe("alerta");
  });

  it("floors diarioRestante at zero when month is overspent", () => {
    const result = computeDailyAllowance({
      normalized: [tx("2026-06-10", 9_000)],
      recurringRules: [salaryRule, rentRule],
      accounts: [],
      structuralCategories: [],
      today,
    });
    expect(result.rendaDisponivel).toBe(8_000);
    expect(result.sobraDoMes).toBeLessThan(0);
    expect(result.diarioRestante).toBe(0);
    expect(result.status).toBe("alerta");
  });

  it("reports no income when recurring revenue is missing", () => {
    const result = computeDailyAllowance({
      normalized: [],
      recurringRules: [rentRule],
      accounts: [],
      structuralCategories: [],
      today,
    });
    expect(result.temRendaCadastrada).toBe(false);
    expect(result.rendaMensal).toBe(0);
    expect(result.diarioRestante).toBe(0);
  });
});
