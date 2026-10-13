import { describe, expect, it } from "vitest";
import type { Account, TransactionNormalized } from "./types";
import {
  attachAccountsToSheetRows,
  buildMonthGridImport,
  defaultDateForMonth,
  isDuplicateMonthTx,
  isSheetRowReady,
  looksLikeSheetPaste,
  mapSheetTipoToAccount,
  monthGridSlices,
  parseMonthSheetText,
  parseParcelaText,
  parsePaidCell,
  parseSheetDate,
  resolveSheetDate,
} from "./monthGrid";

const cash: Account = {
  id: "cash-1",
  nome: "Carteira",
  kind: "cc",
  saldoInicial: 1000,
  dataReferencia: "2026-11-01",
  ativa: true,
  criadaEm: "2026-11-01T00:00:00.000Z",
  isDefault: true,
};

const inter: Account = {
  id: "card-inter",
  nome: "Inter",
  kind: "cartao",
  saldoInicial: 0,
  dataReferencia: "2026-11-01",
  ativa: true,
  criadaEm: "2026-11-01T00:00:00.000Z",
  fonteCsv: "inter",
};

const nubank: Account = {
  id: "card-nubank",
  nome: "Nubank",
  kind: "cartao",
  saldoInicial: 0,
  dataReferencia: "2026-11-01",
  ativa: true,
  criadaEm: "2026-11-01T00:00:00.000Z",
  fonteCsv: "nubank",
};

const ACCOUNTS = [cash, inter, nubank];

const NOV_SHEET = `
		TOTAL DE GASTOS	R$ 6.659,78		Inter	R$ 4.081,78
			Nubank	R$ 0,00
			Débito	R$ 2.578,00

		Total de gastos fixos	R$ 2.578,00

		Nome	Pago	Data	Tipo	Categoria	Valor
		Ingles		07/11	Débito	Estudo	R$ 300,00
		Consórcio		10/11	Débito	Carro	R$ 684,00
		Aluguel	TRUE	09/11	Débito	Casa	R$ 792,00

		PARCELADINHOS	R$ 2.277,78

		Descrição	Parcelas	Data	Tipo	Categoria	Valor
		Tenis	Parcela 6/9	31/03	Inter	Compras Pessoais	R$ 50,97
		PFC	Parcela 8/12	01/02	Inter	Assinaturas	R$ 29,90
		Hotel RJ	Parcela 1 de 3		Inter	Viagem	R$ 319,75

		Gastos correntes	R$ 1.804,00

		Descrição	Data	Tipo	Categoria	Valor
		Açai		Inter	Alimentação	R$ 17,00
		Uber mãe		Inter	Transporte	R$ 55,42
		Mercado	13/11	Débito	Alimentação	R$ 75,23

		Gastos por categoria
		Categoria	Orçado	Realizado
		Assinaturas	R$ 150,00	R$ 130,59
		Casa	R$ 1.300,00	R$ 1.203,70
`.trim();

describe("parseParcelaText", () => {
  it("parses slash and de forms", () => {
    expect(parseParcelaText("Parcela 6/9")).toEqual({ current: 6, total: 9 });
    expect(parseParcelaText("Parcela 2 de 4")).toEqual({ current: 2, total: 4 });
    expect(parseParcelaText("Tenis (1/3)")).toEqual({ current: 1, total: 3 });
  });

  it("rejects invalid ranges", () => {
    expect(parseParcelaText("Parcela 5/3")).toBeNull();
    expect(parseParcelaText("Avulso")).toBeNull();
  });
});

describe("parseSheetDate", () => {
  it("fills year from the selected month", () => {
    expect(parseSheetDate("07/11", "2026-11")).toBe("2026-11-07");
    expect(parseSheetDate("31/03", "2026-11")).toBe("2026-03-31");
  });
});

describe("resolveSheetDate", () => {
  it("keeps dates inside the selected month", () => {
    expect(resolveSheetDate("07/11", "2026-11", "2026-11-13")).toEqual({
      iso: "2026-11-07",
      usedDefault: false,
    });
  });

  it("falls back when the parsed month is not the selected month", () => {
    expect(resolveSheetDate("31/03", "2026-11", "2026-11-13")).toEqual({
      iso: "2026-11-13",
      usedDefault: true,
    });
  });

  it("uses today when the date is empty in the current month", () => {
    expect(resolveSheetDate("", "2026-11", "2026-11-13")).toEqual({
      iso: "2026-11-13",
      usedDefault: false,
    });
  });
});

describe("mapSheetTipoToAccount", () => {
  it("maps Débito to the default cash account", () => {
    expect(mapSheetTipoToAccount("Débito", ACCOUNTS)?.id).toBe("cash-1");
  });

  it("maps Inter and Nubank to card accounts", () => {
    expect(mapSheetTipoToAccount("Inter", ACCOUNTS)?.id).toBe("card-inter");
    expect(mapSheetTipoToAccount("Nubank", ACCOUNTS)?.id).toBe("card-nubank");
  });

  it("leaves unknown labels unmapped", () => {
    expect(mapSheetTipoToAccount("C6", ACCOUNTS)).toBeUndefined();
  });
});

describe("looksLikeSheetPaste", () => {
  it("accepts tab-separated or multi-line text", () => {
    expect(looksLikeSheetPaste("a\tb")).toBe(true);
    expect(looksLikeSheetPaste("uma\nduas")).toBe(true);
    expect(looksLikeSheetPaste("  ")).toBe(false);
  });
});

describe("parseMonthSheetText", () => {
  it("reads the three typed sections and ignores totals", () => {
    const parsed = parseMonthSheetText(NOV_SHEET, "2026-11", "2026-11-13");
    const rows = attachAccountsToSheetRows(parsed.rows, ACCOUNTS);

    const fixos = rows.filter((r) => r.kind === "fixo");
    const parcelas = rows.filter((r) => r.kind === "parcela");
    const correntes = rows.filter((r) => r.kind === "corrente");

    expect(fixos.map((r) => r.descricao)).toEqual([
      "Ingles",
      "Consórcio",
      "Aluguel",
    ]);
    expect(fixos[2]?.pago).toBe(true);
    expect(fixos[0]?.accountId).toBe("cash-1");
    expect(fixos[0]?.dataIso).toBe("2026-11-07");
    expect(fixos[0]?.valor).toBe(300);

    expect(parcelas).toHaveLength(3);
    expect(parcelas[0]?.parcela).toEqual({ current: 6, total: 9 });
    expect(parcelas[0]?.dataIso).toBe("2026-11-13");
    expect(parcelas[0]?.issues).toContain("date_defaulted");
    expect(parcelas[2]?.parcela).toEqual({ current: 1, total: 3 });
    expect(parcelas[0]?.accountId).toBe("card-inter");

    expect(correntes.map((r) => r.descricao)).toEqual([
      "Açai",
      "Uber mãe",
      "Mercado",
    ]);
    expect(correntes[2]?.accountId).toBe("cash-1");
    expect(correntes[2]?.dataIso).toBe("2026-11-13");
    expect(correntes.every(isSheetRowReady)).toBe(true);

    expect(rows.some((r) => r.descricao === "Assinaturas")).toBe(false);
  });

  it("treats a headerless block as current expenses", () => {
    const text = "Açai\t\tInter\tAlimentação\tR$ 17,00\nUber\t\tInter\tTransporte\t11,13";
    const parsed = parseMonthSheetText(text, "2026-11", "2026-11-13");
    expect(parsed.rows).toHaveLength(2);
    expect(parsed.rows[0]?.kind).toBe("corrente");
    expect(parsed.rows[0]?.descricao).toBe("Açai");
    expect(parsed.rows[1]?.valor).toBe(11.13);
  });
});

describe("parsePaidCell", () => {
  it("accepts checkbox exports from Sheets", () => {
    expect(parsePaidCell("TRUE")).toBe(true);
    expect(parsePaidCell("FALSE")).toBe(false);
    expect(parsePaidCell("")).toBe(false);
  });
});

describe("defaultDateForMonth", () => {
  it("uses the first day when browsing another month", () => {
    expect(defaultDateForMonth("2026-10", "2026-11-13")).toBe("2026-10-01");
  });
});

describe("isDuplicateMonthTx", () => {
  it("matches description, date and amount", () => {
    const existing = [
      {
        lancamento: "Açai",
        dataISO: "2026-11-13",
        valorOriginal: 17,
        accountId: "card-inter",
      },
    ] as TransactionNormalized[];
    expect(
      isDuplicateMonthTx(
        {
          descricao: "Açai",
          valor: 17,
          dataIso: "2026-11-13",
          accountId: "card-inter",
        },
        existing,
      ),
    ).toBe(true);
    expect(
      isDuplicateMonthTx(
        {
          descricao: "Açai",
          valor: 18,
          dataIso: "2026-11-13",
          accountId: "card-inter",
        },
        existing,
      ),
    ).toBe(false);
  });
});

describe("monthGridSlices", () => {
  function tx(
    overrides: Partial<TransactionNormalized>,
  ): TransactionNormalized {
    return {
      id: "tx",
      data: "13/11/2026",
      lancamento: "Item",
      categoria: "Casa",
      tipo: "Avulso",
      valorOriginal: 10,
      fonte: "manual",
      sourceId: "manual:quick",
      estabelecimento: "Item",
      valorAnalise: 10,
      natureza: "Gasto",
      ajuste: false,
      tipoFluxo: "saida",
      valorFluxo: 10,
      dataISO: "2026-11-13",
      mes: 11,
      ano: 2026,
      anoMes: "2026-11",
      mesLabel: "nov/2026",
      diaSemana: "sex",
      diaSemanaIndex: 5,
      semana: "2026-W46",
      faixaValor: "Até R$ 25",
      fimSemana: false,
      ...overrides,
    };
  }

  it("splits fixos, installments and current manual expenses", () => {
    const { fixos, parcelas, correntes } = monthGridSlices(
      [
        tx({
          id: "manual:luz:2026-11",
          sourceId: "manual:luz",
          tipo: "Despesa fixa",
          lancamento: "Luz",
          natureza: "Despesa fixa",
        }),
        tx({
          id: "parcela-1",
          lancamento: "Tenis (6/9)",
        }),
        tx({
          id: "gasto-1",
          lancamento: "Açai",
        }),
        tx({
          id: "other-month",
          anoMes: "2026-10",
          dataISO: "2026-10-13",
        }),
      ],
      "2026-11",
    );
    expect(fixos.map((r) => r.lancamento)).toEqual(["Luz"]);
    expect(parcelas.map((r) => r.lancamento)).toEqual(["Tenis (6/9)"]);
    expect(correntes.map((r) => r.lancamento)).toEqual(["Açai"]);
  });
});

describe("buildMonthGridImport", () => {
  it("creates a recurring for a new fixed expense and a manual for a current one", () => {
    const parsed = attachAccountsToSheetRows(
      parseMonthSheetText(NOV_SHEET, "2026-11", "2026-11-13").rows,
      ACCOUNTS,
    );
    const result = buildMonthGridImport({
      rows: parsed,
      monthIso: "2026-11",
      rules: [],
      existing: [],
    });
    expect(result.rules).toHaveLength(3);
    expect(result.rules[0]?.descricao).toBe("Ingles");
    expect(result.rules[2] && parsed.find((r) => r.descricao === "Aluguel")?.pago).toBe(
      true,
    );
    expect(result.payments.some((p) => p.status === "pago")).toBe(true);
    expect(result.manuals.some((m) => m.lancamento.includes("Tenis"))).toBe(true);
    expect(result.manuals.some((m) => m.lancamento === "Açai")).toBe(true);
  });

  it("edits an existing matching fixed rule instead of duplicating it", () => {
    const rows = attachAccountsToSheetRows(
      parseMonthSheetText(
        "Nome\tPago\tData\tTipo\tCategoria\tValor\nLuz\t\t13/11\tDébito\tCasa\tR$ 200,00",
        "2026-11",
        "2026-11-13",
      ).rows,
      ACCOUNTS,
    );
    const result = buildMonthGridImport({
      rows,
      monthIso: "2026-11",
      rules: [
        {
          id: "luz-1",
          kind: "despesa_fixa",
          descricao: "Luz",
          categoria: "Casa",
          valor: 180,
          diaMes: 13,
          inicio: "2026-01-01",
          fim: null,
          ativo: true,
          criadoEm: "2026-01-01T00:00:00.000Z",
          accountId: "cash-1",
        },
      ],
      existing: [],
    });
    expect(result.rules).toHaveLength(0);
    expect(result.edits[0]?.rawId).toBe("manual:luz-1:2026-11");
    expect(result.edits[0]?.patch.valorOriginal).toBe(200);
  });
});
