import { describe, expect, it } from "vitest";
import {
  AI_EXPENSE_EXPORT_INSTRUCTIONS,
  buildAiExpenseExport,
} from "./aiExpenseExport";
import type {
  Account,
  CategoryBudget,
  InstallmentInfo,
  Natureza,
  TipoFluxo,
  TransactionNormalized,
} from "./types";

function tx(
  overrides: Partial<TransactionNormalized> & { dataISO: string },
): TransactionNormalized {
  const dataISO = overrides.dataISO;
  const [y, m, d] = dataISO.split("-").map(Number);
  const natureza: Natureza = overrides.natureza ?? "Gasto";
  const valorAnalise = overrides.valorAnalise ?? 10;
  const tipoFluxo: TipoFluxo =
    overrides.tipoFluxo ??
    (natureza === "Receita"
      ? "entrada"
      : natureza === "Gasto" || natureza === "Despesa fixa"
        ? "saida"
        : "neutro");
  return {
    id: overrides.id ?? dataISO,
    data: `${String(d).padStart(2, "0")}/${String(m).padStart(2, "0")}/${y}`,
    lancamento: overrides.lancamento ?? "Loja",
    categoria: overrides.categoria ?? "Mercado",
    tipo: overrides.tipo ?? "Débito",
    valorOriginal: overrides.valorOriginal ?? valorAnalise,
    fonte: overrides.fonte ?? "manual",
    sourceId: overrides.sourceId ?? "manual:quick",
    estabelecimento: overrides.estabelecimento ?? "Loja",
    valorAnalise,
    natureza,
    ajuste: natureza !== "Gasto",
    tipoFluxo,
    valorFluxo: overrides.valorFluxo ?? (tipoFluxo === "neutro" ? 0 : valorAnalise),
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
    ...overrides,
  };
}

const TODAY = new Date("2026-06-10T12:00:00.000Z");

function sectionAfter(markdown: string, heading: string): string {
  const start = markdown.indexOf(heading);
  if (start < 0) return "";
  const rest = markdown.slice(start + heading.length);
  const next = rest.search(/\n## /);
  return next < 0 ? rest : rest.slice(0, next);
}

describe("buildAiExpenseExport", () => {
  it("includes gasto and despesa fixa in realized totals and table", () => {
    const result = buildAiExpenseExport({
      today: TODAY,
      transactions: [
        tx({
          id: "g1",
          dataISO: "2026-06-02",
          lancamento: "Supermercado Extra",
          estabelecimento: "Extra",
          natureza: "Gasto",
          valorAnalise: 80,
        }),
        tx({
          id: "f1",
          dataISO: "2026-06-05",
          lancamento: "Aluguel",
          estabelecimento: "Aluguel",
          categoria: "Moradia",
          natureza: "Despesa fixa",
          valorAnalise: 1500,
          sourceId: "manual:aluguel",
        }),
      ],
    });

    expect(result.realizedCount).toBe(2);
    expect(result.realizedTotal).toBe(1580);
    expect(result.filename).toBe("gastos-para-ia-2026-06-10.md");
    const realized = sectionAfter(result.markdown, "## Lançamentos realizados");
    expect(realized).toContain("Supermercado Extra");
    expect(realized).toContain("Aluguel");
    expect(realized).toContain("80.00");
    expect(realized).toContain("1500.00");
  });

  it("omits fatura payment and estorno from the list, with count and original total", () => {
    const result = buildAiExpenseExport({
      today: TODAY,
      transactions: [
        tx({
          id: "g1",
          dataISO: "2026-06-02",
          lancamento: "Padaria",
          natureza: "Gasto",
          valorAnalise: 20,
        }),
        tx({
          id: "pay",
          dataISO: "2026-06-08",
          lancamento: "PAGAMENTO FATURA NUBANK",
          natureza: "Pagamento de fatura",
          valorAnalise: 0,
          valorOriginal: 430.5,
          tipoFluxo: "neutro",
          valorFluxo: 0,
        }),
        tx({
          id: "est",
          dataISO: "2026-06-09",
          lancamento: "ESTORNO IFOOD",
          natureza: "Estorno / crédito",
          valorAnalise: 0,
          valorOriginal: -15,
          tipoFluxo: "neutro",
          valorFluxo: 0,
        }),
      ],
    });

    expect(result.realizedCount).toBe(1);
    expect(result.realizedTotal).toBe(20);
    expect(result.omittedCount).toBe(2);
    expect(result.omittedTotal).toBe(445.5);
    const realized = sectionAfter(result.markdown, "## Lançamentos realizados");
    expect(realized).toContain("Padaria");
    expect(realized).not.toContain("PAGAMENTO FATURA NUBANK");
    expect(realized).not.toContain("ESTORNO IFOOD");
    expect(result.markdown).toContain(
      "2 pagamento(s) de fatura e/ou estorno omitidos (445.50 no valor original)",
    );
  });

  it("keeps future recurring out of realized total and lists it in the 3-month horizon", () => {
    const result = buildAiExpenseExport({
      today: TODAY,
      transactions: [
        tx({
          id: "past",
          dataISO: "2026-05-05",
          lancamento: "Aluguel maio",
          categoria: "Moradia",
          natureza: "Despesa fixa",
          valorAnalise: 1500,
          sourceId: "manual:aluguel",
        }),
        tx({
          id: "soon",
          dataISO: "2026-07-05",
          lancamento: "Aluguel julho",
          categoria: "Moradia",
          natureza: "Despesa fixa",
          valorAnalise: 1500,
          sourceId: "manual:aluguel",
        }),
        tx({
          id: "far",
          dataISO: "2026-12-05",
          lancamento: "Aluguel dezembro",
          categoria: "Moradia",
          natureza: "Despesa fixa",
          valorAnalise: 1500,
          sourceId: "manual:aluguel",
        }),
      ],
    });

    expect(result.realizedCount).toBe(1);
    expect(result.realizedTotal).toBe(1500);
    expect(result.forecastCount).toBe(1);
    const realized = sectionAfter(result.markdown, "## Lançamentos realizados");
    const future = sectionAfter(
      result.markdown,
      "## Compromissos futuros (próximos 3 meses)",
    );
    expect(realized).toContain("Aluguel maio");
    expect(realized).not.toContain("Aluguel julho");
    expect(realized).not.toContain("Aluguel dezembro");
    expect(future).toContain("Aluguel julho");
    expect(future).toContain("Recorrência");
    expect(future).not.toContain("Aluguel dezembro");
  });

  it("lists future estimated installment as a commitment, not a realized expense", () => {
    const installment: InstallmentInfo = {
      current: 3,
      total: 4,
      purchaseDate: "10/04/2026",
      groupKey: "g1",
      estimated: true,
    };
    const result = buildAiExpenseExport({
      today: TODAY,
      transactions: [
        tx({
          id: "parcela",
          dataISO: "2026-07-10",
          lancamento: "Geladeira 3/4",
          natureza: "Gasto",
          valorAnalise: 200,
          sourceId: "src-1",
          installment,
        }),
      ],
    });

    expect(result.realizedCount).toBe(0);
    expect(result.forecastCount).toBe(1);
    const future = sectionAfter(
      result.markdown,
      "## Compromissos futuros (próximos 3 meses)",
    );
    expect(future).toContain("Geladeira 3/4");
    expect(future).toContain("Parcela estimada 3/4");
  });

  it("does not produce lançamentos when the recorte is empty", () => {
    const result = buildAiExpenseExport({
      today: TODAY,
      transactions: [],
    });

    expect(result.realizedCount).toBe(0);
    expect(result.realizedTotal).toBe(0);
    expect(result.forecastCount).toBe(0);
    expect(result.periodLabel).toBe("sem lançamentos");
    expect(sectionAfter(result.markdown, "## Lançamentos realizados")).toContain(
      "Nenhum gasto realizado neste recorte.",
    );
  });

  it("summarizes receita without listing each income line", () => {
    const result = buildAiExpenseExport({
      today: TODAY,
      transactions: [
        tx({
          id: "sal",
          dataISO: "2026-06-05",
          lancamento: "Salário CLT",
          categoria: "Salário",
          natureza: "Receita",
          valorAnalise: 0,
          valorOriginal: -4000,
          tipoFluxo: "entrada",
          valorFluxo: 4000,
          sourceId: "manual:salario",
        }),
        tx({
          id: "g1",
          dataISO: "2026-06-06",
          lancamento: "Café",
          natureza: "Gasto",
          valorAnalise: 12,
        }),
      ],
    });

    expect(result.revenueTotal).toBe(4000);
    expect(result.realizedTotal).toBe(12);
    const realized = sectionAfter(result.markdown, "## Lançamentos realizados");
    expect(realized).toContain("Café");
    expect(realized).not.toContain("Salário CLT");
    expect(result.markdown).toContain(
      "Receitas no período (não listadas linha a linha): 4000.00",
    );
  });

  it("includes active budgets and account names", () => {
    const accounts: Account[] = [
      {
        id: "cash-1",
        nome: "Nubank conta",
        kind: "cc",
        saldoInicial: 0,
        dataReferencia: "2026-06-01",
        ativa: true,
        criadaEm: "2026-01-01T00:00:00.000Z",
      },
    ];
    const budgets: CategoryBudget[] = [
      {
        id: "b1",
        categoria: "Mercado",
        valorMensal: 800,
        ativa: true,
        criadaEm: "2026-01-01T00:00:00.000Z",
        atualizadaEm: "2026-01-01T00:00:00.000Z",
      },
      {
        id: "b2",
        categoria: "Lazer",
        valorMensal: 200,
        ativa: false,
        criadaEm: "2026-01-01T00:00:00.000Z",
        atualizadaEm: "2026-01-01T00:00:00.000Z",
      },
    ];
    const result = buildAiExpenseExport({
      today: TODAY,
      accounts,
      budgets,
      transactions: [
        tx({
          id: "g1",
          dataISO: "2026-06-02",
          lancamento: "Mercado",
          accountId: "cash-1",
          valorAnalise: 50,
        }),
      ],
    });

    const budgetsSection = sectionAfter(result.markdown, "## Orçamentos ativos");
    expect(budgetsSection).toContain("Mercado");
    expect(budgetsSection).toContain("800.00");
    expect(budgetsSection).not.toContain("Lazer");
    expect(sectionAfter(result.markdown, "## Lançamentos realizados")).toContain(
      "Nubank conta",
    );
  });

  it("notes when Análise filters are active", () => {
    const result = buildAiExpenseExport({
      today: TODAY,
      filtersActive: true,
      dateFrom: "2026-06-01",
      dateTo: "2026-06-30",
      transactions: [
        tx({ id: "g1", dataISO: "2026-06-12", valorAnalise: 9 }),
      ],
    });

    expect(result.periodLabel).toBe("2026-06-01 a 2026-06-30");
    expect(result.markdown).toContain(
      "Filtros da tela Análise: ativos — os dados abaixo já passaram por eles",
    );
  });
});

describe("AI_EXPENSE_EXPORT_INSTRUCTIONS", () => {
  it("tells the model to use realized expenses only", () => {
    expect(AI_EXPENSE_EXPORT_INSTRUCTIONS).toContain("lançamentos realizados");
    expect(AI_EXPENSE_EXPORT_INSTRUCTIONS).toContain("Não invente lançamentos");
  });
});
