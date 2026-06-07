import { describe, expect, it } from "vitest";
import {
  inferInvoiceAnoMes,
  isInterInstallmentTipo,
  parseCsvText,
  parseInterInstallmentTipo,
  rewriteInstallmentRow,
} from "./csv";
import type { Account, TransactionRaw } from "./types";

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
});
