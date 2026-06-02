import { describe, expect, it } from "vitest";
import {
  inferInvoiceAnoMes,
  isInterInstallmentTipo,
  parseCsvText,
  rewriteInstallmentRow,
} from "./csv";
import type { TransactionRaw } from "./types";

describe("isInterInstallmentTipo", () => {
  it("accepts Inter installment tipo strings", () => {
    expect(isInterInstallmentTipo("Parcela 2/3")).toBe(true);
    expect(isInterInstallmentTipo("PARCELA 5 / 12")).toBe(true);
  });

  it("rejects non-installment tipo strings", () => {
    expect(isInterInstallmentTipo("Compra à vista")).toBe(false);
    expect(isInterInstallmentTipo("Pagamento")).toBe(false);
    expect(isInterInstallmentTipo("")).toBe(false);
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
    const result = parseCsvText(interCsv, "fatura-inter-2026-07.csv");
    expect(result.ok).toBe(true);
    expect(result.source?.raw).toHaveLength(3);

    const vista = result.source?.raw.find((row) => row.tipo === "Compra à vista");
    expect(vista?.data).toBe("02/06/2026");
    expect(vista?.lancamento).toBe("DL*UberRides");

    const parcelas = result.source?.raw.filter((row) =>
      isInterInstallmentTipo(row.tipo),
    );
    expect(parcelas).toHaveLength(2);
    for (const row of parcelas ?? []) {
      expect(row.data).toBe("20/07/2026");
    }
    expect(parcelas?.[0].lancamento).toContain("(compra 26/05/2026)");
    expect(parcelas?.[1].lancamento).toContain("(compra 01/12/2025)");
  });
});
