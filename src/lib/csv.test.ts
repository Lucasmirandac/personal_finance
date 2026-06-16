import { describe, expect, it } from "vitest";
import {
  findCardAccountByFonte,
  upsertCardAccountCycle,
} from "./accounts";
import {
  filterDuplicateIncomingRows,
  removeStaleEstimatedInstallments,
} from "./installmentEstimates";
import {
  inferInvoiceAnoMes,
  isInterInstallmentTipo,
  parseCsvText,
  parseInterInstallmentTipo,
  reapplyInterCycleToSource,
  rewriteInstallmentRow,
} from "./csv";
import type { Account, Dataset, Source, TransactionRaw } from "./types";

const interCard: Account = {
  id: "inter-card",
  nome: "Inter",
  kind: "cartao",
  saldoInicial: 0,
  dataReferencia: "2026-06-01",
  ativa: true,
  criadaEm: "2026-06-01T00:00:00.000Z",
  fonteCsv: "inter",
  diaFechamento: 30,
  diaPagamento: 7,
  cicloConfirmado: true,
};

describe("parseInterInstallmentTipo", () => {
  it("parses valid installment tipo strings", () => {
    expect(parseInterInstallmentTipo("Parcela 2/6")).toEqual({
      current: 2,
      total: 6,
    });
    expect(parseInterInstallmentTipo("PARCELA 5 / 12")).toEqual({
      current: 5,
      total: 12,
    });
  });

  it("rejects non-installment tipo strings", () => {
    expect(parseInterInstallmentTipo("Compra à vista")).toBeNull();
    expect(parseInterInstallmentTipo("Pagamento")).toBeNull();
    expect(parseInterInstallmentTipo("")).toBeNull();
  });
});

describe("inferInvoiceAnoMes", () => {
  it("returns null when there are no dates", () => {
    expect(inferInvoiceAnoMes([])).toBeNull();
  });

  it("uses next month when diaFechamento is undefined", () => {
    expect(inferInvoiceAnoMes(["2026-06-02"])).toBe("2026-07");
  });

  it("uses next month when purchase day is on or before closing day", () => {
    expect(inferInvoiceAnoMes(["2026-06-02"], 10)).toBe("2026-07");
  });

  it("uses month after next when purchase day is after closing day", () => {
    expect(inferInvoiceAnoMes(["2026-06-15"], 10)).toBe("2026-08");
  });

  it("handles year rollover", () => {
    expect(inferInvoiceAnoMes(["2025-12-31"])).toBe("2026-01");
  });
});

describe("rewriteInstallmentRow", () => {
  const baseRow: TransactionRaw = {
    id: "tx-1",
    data: "26/05/2026",
    lancamento: "PG ATLETICO MINEIRO",
    categoria: "ENTRETENIMENTO",
    tipo: "Parcela 2/3",
    valorOriginal: 283.33,
    fonte: "inter",
    sourceId: "src-1",
  };

  it("moves installment date to invoice month and preserves purchase date in lancamento", () => {
    const rewritten = rewriteInstallmentRow(baseRow, "2026-07", 20);
    expect(rewritten.data).toBe("20/07/2026");
    expect(rewritten.lancamento).toBe(
      "PG ATLETICO MINEIRO (compra 26/05/2026)",
    );
  });

  it("does not duplicate purchase suffix when rewritten twice", () => {
    const once = rewriteInstallmentRow(baseRow, "2026-07", 20);
    const twice = rewriteInstallmentRow(once, "2026-07", 20);
    expect(twice.lancamento).toBe(
      "PG ATLETICO MINEIRO (compra 26/05/2026)",
    );
  });
});

describe("parseCsvText inter installments", () => {
  const interCsv = `"Data","Lançamento","Categoria","Tipo","Valor"
"02/06/2026","DL*UberRides","TRANSPORTE","Compra à vista","R$ 13,12"
"26/05/2026","PG ATLETICO MINEIRO","ENTRETENIMENTO","Parcela 2/3","R$ 283,33"
"01/12/2025","PG INFRACOMMERCE","SERVICOS","Parcela 7/7","R$ 102,72"
`;

  it("rewrites installment rows to the inferred invoice month", () => {
    const result = parseCsvText(interCsv, "fatura-inter-2026-07.csv", [
      interCard,
    ]);
    expect(result.ok).toBe(true);
    expect(result.source?.raw).toHaveLength(4);

    const vista = result.source?.raw.find((row) => row.tipo === "Compra à vista");
    expect(vista?.data).toBe("02/06/2026");
    expect(vista?.lancamento).toBe("DL*UberRides");

    const parcelas = result.source?.raw.filter((row) =>
      isInterInstallmentTipo(row.tipo),
    );
    expect(parcelas).toHaveLength(3);
    const real = parcelas?.find((row) => row.tipo === "Parcela 2/3");
    const future = parcelas?.find((row) => row.tipo === "Parcela 3/3");
    expect(real?.data).toBe("07/07/2026");
    expect(real?.installment?.estimated).toBe(false);
    expect(future?.data).toBe("07/08/2026");
    expect(future?.installment?.estimated).toBe(true);
    expect(real?.installment?.groupKey).toBe(future?.installment?.groupKey);
    expect(parcelas?.find((row) => row.tipo === "Parcela 7/7")?.data).toBe(
      "07/07/2026",
    );
  });

  const futureInstallmentsCsv = `"Data","Lançamento","Categoria","Tipo","Valor"
"02/06/2026","DL*UberRides","TRANSPORTE","Compra à vista","R$ 13,12"
"03/05/2026","DECOLAR","VIAGEM","Parcela 2/6","R$ 245,71"
`;

  it("generates future estimated installments through the remaining plan", () => {
    const result = parseCsvText(
      futureInstallmentsCsv,
      "fatura-inter-2026-07.csv",
      [interCard],
    );
    const installments = result.source?.raw.filter((row) => row.installment);
    expect(installments).toHaveLength(5);
    expect(installments?.map((row) => row.tipo)).toEqual([
      "Parcela 2/6",
      "Parcela 3/6",
      "Parcela 4/6",
      "Parcela 5/6",
      "Parcela 6/6",
    ]);
    expect(installments?.map((row) => row.data)).toEqual([
      "07/07/2026",
      "07/08/2026",
      "07/09/2026",
      "07/10/2026",
      "07/11/2026",
    ]);
    expect(installments?.filter((row) => row.installment?.estimated)).toHaveLength(
      4,
    );
  });

  it("uses confirmed closing day when inferring invoice month for installments", () => {
    const earlyCloseCard: Account = {
      ...interCard,
      diaFechamento: 1,
      diaPagamento: 10,
    };
    const lateCloseCard: Account = {
      ...interCard,
      diaFechamento: 25,
      diaPagamento: 10,
    };
    const csv = `"Data","Lançamento","Categoria","Tipo","Valor"
"02/06/2026","LOJA AVISTA","COMPRAS","Compra à vista","R$ 10,00"
"02/06/2026","LOJA","COMPRAS","Parcela 1/2","R$ 100,00"
`;
    const early = parseCsvText(csv, "inter-early.csv", [earlyCloseCard]);
    const late = parseCsvText(csv, "inter-late.csv", [lateCloseCard]);
    const earlyInstallment = early.source?.raw.find((row) =>
      isInterInstallmentTipo(row.tipo),
    );
    const lateInstallment = late.source?.raw.find((row) =>
      isInterInstallmentTipo(row.tipo),
    );
    expect(earlyInstallment?.data).toBe("10/08/2026");
    expect(lateInstallment?.data).toBe("10/07/2026");
  });

  it("skips installment rewrites when card cycle is not confirmed", () => {
    const unconfirmed: Account = {
      ...interCard,
      cicloConfirmado: false,
    };
    const result = parseCsvText(interCsv, "fatura-inter.csv", [unconfirmed]);
    const installment = result.source?.raw.find(
      (row) => row.tipo === "Parcela 2/3",
    );
    expect(installment?.data).toBe("26/05/2026");
    expect(installment?.installment).toBeUndefined();
  });

  const multiRealInstallmentsCsv = `"Data","Lançamento","Categoria","Tipo","Valor"
"02/06/2026","LOJA AVISTA","COMPRAS","Compra à vista","R$ 10,00"
"08/04/2026","AIRBNB HMQ9F9EXK9","VIAGEM","Parcela 6/6","R$ 365,33"
"08/04/2026","AIRBNB HMQ9F9EXK9","VIAGEM","Parcela 3/6","R$ 365,33"
"08/04/2026","AIRBNB HMQ9F9EXK9","VIAGEM","Parcela 2/6","R$ 365,33"
"08/04/2026","AIRBNB HMQ9F9EXK9","VIAGEM","Parcela 5/6","R$ 365,33"
"08/04/2026","AIRBNB HMQ9F9EXK9","VIAGEM","Parcela 4/6","R$ 365,33"
"07/04/2026","AIRBNB HMQ9F9EXK9","VIAGEM","Parcela 1/6","R$ 365,35"
`;

  it("does not generate estimated installments for real slots already present in the same CSV", () => {
    const result = parseCsvText(
      multiRealInstallmentsCsv,
      "fatura-inter-2026-05.csv",
      [interCard],
    );
    expect(result.ok).toBe(true);
    const installments = result.source?.raw.filter((row) => row.installment);
    expect(installments).toHaveLength(6);
    expect(installments?.every((row) => row.installment?.estimated === false)).toBe(
      true,
    );
    expect(installments?.map((row) => row.tipo).sort()).toEqual([
      "Parcela 1/6",
      "Parcela 2/6",
      "Parcela 3/6",
      "Parcela 4/6",
      "Parcela 5/6",
      "Parcela 6/6",
    ]);
  });
});

function simulateAddSource(dataset: Dataset, source: Source): Dataset {
  const { raw: dedupedRaw } = filterDuplicateIncomingRows(dataset, source.raw);
  if (dedupedRaw.length === 0) {
    return dataset;
  }
  const { dataset: cleanedDataset } = removeStaleEstimatedInstallments(
    dataset,
    dedupedRaw,
  );
  return {
    sources: [
      ...cleanedDataset.sources,
      { ...source, raw: dedupedRaw, rowsRaw: dedupedRaw.length },
    ],
  };
}

function countLooseInstallmentSlots(dataset: Dataset): Map<string, number> {
  const counts = new Map<string, number>();
  for (const source of dataset.sources) {
    for (const row of source.raw) {
      if (!row.installment) continue;
      const key = `${row.installment.purchaseDate}|${row.installment.current}/${row.installment.total}|${row.installment.estimated ? "est" : "real"}`;
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }
  }
  return counts;
}

describe("sequential Inter invoice imports", () => {
  const mayCsv = `"Data","Lançamento","Categoria","Tipo","Valor"
"02/06/2026","LOJA AVISTA","COMPRAS","Compra à vista","R$ 10,00"
"03/04/2026","DAFITI 4604482542","VESTUARIO","Parcela 1/10","R$ 58,08"
"01/12/2025","FeV GNV","SERVICOS","Parcela 5/7","R$ 102,72"
`;

  const juneCsv = `"Data","Lançamento","Categoria","Tipo","Valor"
"02/06/2026","LOJA AVISTA","COMPRAS","Compra à vista","R$ 10,00"
"03/04/2026","DAFITI 4604482542","VESTUARIO","Parcela 2/10","R$ 57,99"
"01/12/2025","FeV GNV","SERVICOS","Parcela 6/7","R$ 102,72"
`;

  const julyCsv = `"Data","Lançamento","Categoria","Tipo","Valor"
"02/06/2026","LOJA AVISTA","COMPRAS","Compra à vista","R$ 10,00"
"03/04/2026","DAFITI 4604482542","VESTUARIO","Parcela 3/10","R$ 57,99"
"01/12/2025","PG INFRACOMMERCE NEGO","SERVICOS","Parcela 7/7","R$ 102,72"
`;

  it("does not duplicate installment slots when importing consecutive invoices", () => {
    let dataset: Dataset = { sources: [] };
    for (const [text, fileName] of [
      [mayCsv, "fatura-inter-2026-05.csv"],
      [juneCsv, "fatura-inter-2026-06.csv"],
      [julyCsv, "fatura-inter-2026-07.csv"],
    ] as const) {
      const parsed = parseCsvText(text, fileName, [interCard]);
      expect(parsed.source).not.toBeNull();
      dataset = simulateAddSource(dataset, parsed.source as Source);
    }

    const slotCounts = countLooseInstallmentSlots(dataset);
    for (const [, count] of slotCounts) {
      expect(count).toBe(1);
    }

    const dafitiReal = [...slotCounts.entries()].filter(
      ([key]) => key.includes("03/04/2026") && key.includes("real"),
    );
    expect(dafitiReal.map(([key]) => key)).toEqual(
      expect.arrayContaining([
        "03/04/2026|1/10|real",
        "03/04/2026|2/10|real",
        "03/04/2026|3/10|real",
      ]),
    );
    expect(
      [...slotCounts.keys()].some(
        (key) => key.includes("01/12/2025") && key.includes("7/7|real"),
      ),
    ).toBe(true);
  });

  it("skips reimporting an invoice whose rows already exist", () => {
    const parsed = parseCsvText(mayCsv, "fatura-inter-2026-05.csv", [interCard]);
    let dataset = simulateAddSource({ sources: [] }, parsed.source as Source);
    const sourcesAfterFirst = dataset.sources.length;

    dataset = simulateAddSource(dataset, parsed.source as Source);
    expect(dataset.sources).toHaveLength(sourcesAfterFirst);
  });
});

describe("import cycle preservation", () => {
  it("accounts snapshot keeps confirmed cycle for addSource lookup", () => {
    const { accounts: confirmed } = upsertCardAccountCycle([], "inter", {
      diaFechamento: 30,
      diaPagamento: 7,
    });
    const card = findCardAccountByFonte(confirmed, "inter");
    expect(card?.diaFechamento).toBe(30);
    expect(card?.diaPagamento).toBe(7);
    expect(card?.cicloConfirmado).toBe(true);
  });
});

describe("reapplyInterCycleToSource", () => {
  const csv = `"Data","Lançamento","Categoria","Tipo","Valor"
"02/06/2026","LOJA AVISTA","COMPRAS","Compra à vista","R$ 10,00"
"02/06/2026","LOJA","COMPRAS","Parcela 1/2","R$ 100,00"
`;

  it("updates installment payment dates when closing/payment days change", () => {
    const earlyClose: Account = {
      ...interCard,
      diaFechamento: 1,
      diaPagamento: 10,
    };
    const parsed = parseCsvText(csv, "inter-test.csv", [earlyClose]);
    const source = parsed.source as Source;
    const before = source.raw.find((row) => isInterInstallmentTipo(row.tipo));
    expect(before?.data).toBe("10/08/2026");

    const lateClose: Account = {
      ...interCard,
      diaFechamento: 25,
      diaPagamento: 15,
    };
    const reapplied = reapplyInterCycleToSource(source, lateClose);
    const after = reapplied.raw.find((row) => isInterInstallmentTipo(row.tipo));
    expect(after?.data).toBe("15/07/2026");
  });
});
