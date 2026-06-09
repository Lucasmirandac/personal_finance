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

  it("uses the injected today for open invoices instead of the system clock", () => {
    const interCard = {
      id: "card-inter",
      nome: "Inter",
      kind: "cartao" as const,
      saldoInicial: 0,
      dataReferencia: "2026-01-01",
      ativa: true,
      criadaEm: "2026-01-01T00:00:00.000Z",
      fonteCsv: "inter" as const,
      diaFechamento: 30,
      diaPagamento: 7,
    };
    // Inter installment is paid on its own date (07/06/2026).
    const installment = tx("2026-06-07", 500, {
      id: "parcela",
      fonte: "inter",
      sourceId: "src-inter",
      natureza: "Gasto",
      valorAnalise: 500,
      tipo: "Parcela 2/3",
      accountId: "card-inter",
    });

    const baseInput = {
      normalized: [installment],
      recurringRules: [salaryRule, rentRule],
      accounts: [interCard],
      structuralCategories: [],
    };

    // today before the due date → still an open invoice.
    const before = computeDailyAllowance({
      ...baseInput,
      today: new Date("2026-06-01T12:00:00.000Z"),
    });
    expect(before.faturaAbertaCartao).toBe(500);

    // today after the due date → invoice already paid, not open anymore.
    const after = computeDailyAllowance({
      ...baseInput,
      today: new Date("2026-06-30T12:00:00.000Z"),
    });
    expect(after.faturaAbertaCartao).toBe(0);
  });

  it("sets tetoCartaoRecomendado to renda disponivel minus open invoice", () => {
    const interCard = {
      id: "card-inter",
      nome: "Inter",
      kind: "cartao" as const,
      saldoInicial: 0,
      dataReferencia: "2026-01-01",
      ativa: true,
      criadaEm: "2026-01-01T00:00:00.000Z",
      fonteCsv: "inter" as const,
      diaFechamento: 30,
      diaPagamento: 7,
    };
    const installment = tx("2026-06-07", 1_500, {
      id: "parcela",
      fonte: "inter",
      sourceId: "src-inter",
      natureza: "Gasto",
      valorAnalise: 1_500,
      tipo: "Parcela 2/3",
      accountId: "card-inter",
    });

    const result = computeDailyAllowance({
      normalized: [installment],
      recurringRules: [salaryRule, rentRule],
      accounts: [interCard],
      structuralCategories: [],
      today: new Date("2026-06-01T12:00:00.000Z"),
    });

    expect(result.rendaDisponivel).toBe(8_000);
    expect(result.faturaAbertaCartao).toBe(1_500);
    expect(result.tetoCartaoRecomendado).toBe(6_500);
    expect(result.faturaAbertaPct).toBe(18.75);
  });

  it("floors tetoCartaoRecomendado at zero when open invoice exceeds renda disponivel", () => {
    const interCard = {
      id: "card-inter",
      nome: "Inter",
      kind: "cartao" as const,
      saldoInicial: 0,
      dataReferencia: "2026-01-01",
      ativa: true,
      criadaEm: "2026-01-01T00:00:00.000Z",
      fonteCsv: "inter" as const,
      diaFechamento: 30,
      diaPagamento: 7,
    };
    const installment = tx("2026-06-07", 9_000, {
      id: "parcela",
      fonte: "inter",
      sourceId: "src-inter",
      natureza: "Gasto",
      valorAnalise: 9_000,
      tipo: "Parcela 2/3",
      accountId: "card-inter",
    });

    const result = computeDailyAllowance({
      normalized: [installment],
      recurringRules: [salaryRule, rentRule],
      accounts: [interCard],
      structuralCategories: [],
      today: new Date("2026-06-01T12:00:00.000Z"),
    });

    expect(result.rendaDisponivel).toBe(8_000);
    expect(result.faturaAbertaCartao).toBe(9_000);
    expect(result.tetoCartaoRecomendado).toBe(0);
    expect(result.faturaAbertaPct).toBe(112.5);
    expect(result.status).toBe("alerta");
  });

  it("subtracts percent savings reservation from sobra and diarioRestante", () => {
    const without = computeDailyAllowance({
      normalized: [tx("2026-06-10", 500)],
      recurringRules: [salaryRule, rentRule],
      accounts: [],
      structuralCategories: [],
      today,
    });
    const withSavings = computeDailyAllowance({
      normalized: [tx("2026-06-10", 500)],
      recurringRules: [salaryRule, rentRule],
      accounts: [],
      structuralCategories: [],
      poupanca: { modo: "percent", percentual: 20 },
      today,
    });

    expect(withSavings.aporteMensal).toBe(1_600);
    expect(withSavings.sobraDoMes).toBe(without.sobraDoMes - 1_600);
    expect(withSavings.diarioRestante).toBeLessThan(without.diarioRestante);
  });

  it("subtracts fixed savings reservation from sobra and diarioRestante", () => {
    const without = computeDailyAllowance({
      normalized: [tx("2026-06-10", 500)],
      recurringRules: [salaryRule, rentRule],
      accounts: [],
      structuralCategories: [],
      today,
    });
    const withSavings = computeDailyAllowance({
      normalized: [tx("2026-06-10", 500)],
      recurringRules: [salaryRule, rentRule],
      accounts: [],
      structuralCategories: [],
      poupanca: { modo: "fixed", valorMensal: 500 },
      today,
    });

    expect(withSavings.aporteMensal).toBe(500);
    expect(withSavings.sobraDoMes).toBe(without.sobraDoMes - 500);
  });
});
