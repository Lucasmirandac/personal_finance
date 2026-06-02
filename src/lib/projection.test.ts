import { describe, expect, it } from "vitest";
import {
  billPayDateForTransaction,
  buildFaturaEvents,
  cycleFor,
} from "./projection";
import type { CardConfig, TransactionNormalized } from "./types";

const interCard: CardConfig = {
  fonte: "inter",
  diaFechamento: 30,
  diaPagamento: 7,
};

function tx(partial: Partial<TransactionNormalized>): TransactionNormalized {
  const dataISO = partial.dataISO ?? "2026-06-02";
  const [y, m, d] = dataISO.split("-").map(Number);
  return {
    id: partial.id ?? dataISO,
    data: partial.data ?? `${String(d).padStart(2, "0")}/${String(m).padStart(2, "0")}/${y}`,
    lancamento: partial.lancamento ?? "Test",
    categoria: partial.categoria ?? "Outros",
    tipo: partial.tipo ?? "Compra à vista",
    valorOriginal: partial.valorOriginal ?? 100,
    fonte: partial.fonte ?? "inter",
    sourceId: partial.sourceId ?? "s1",
    estabelecimento: partial.estabelecimento ?? "Loja",
    valorAnalise: partial.valorAnalise ?? 100,
    natureza: partial.natureza ?? "Gasto",
    ajuste: partial.ajuste ?? false,
    tipoFluxo: partial.tipoFluxo ?? "saida",
    valorFluxo: partial.valorFluxo ?? 100,
    dataISO,
    mes: partial.mes ?? m,
    ano: partial.ano ?? y,
    anoMes: partial.anoMes ?? `${y}-${String(m).padStart(2, "0")}`,
    mesLabel: partial.mesLabel ?? "jun/26",
    diaSemana: partial.diaSemana ?? "seg",
    diaSemanaIndex: partial.diaSemanaIndex ?? 1,
    semana: partial.semana ?? "2026-W23",
    faixaValor: partial.faixaValor ?? "R$ 50-100",
    fimSemana: partial.fimSemana ?? false,
  };
}

describe("billPayDateForTransaction", () => {
  it("keeps normal purchases using cycleFor", () => {
    expect(cycleFor("2026-07-07", interCard)).toBe("2026-08-07");
    expect(
      billPayDateForTransaction(
        tx({ dataISO: "2026-07-07", tipo: "Compra à vista" }),
        interCard,
      ),
    ).toBe("2026-08-07");
  });

  it("does not cycle Inter installments that already use invoice payment date", () => {
    expect(
      billPayDateForTransaction(
        tx({ dataISO: "2026-07-07", tipo: "Parcela 2/3" }),
        interCard,
      ),
    ).toBe("2026-07-07");
    expect(
      billPayDateForTransaction(
        tx({
          dataISO: "2026-08-07",
          tipo: "Parcela 3/6",
          installment: {
            current: 3,
            total: 6,
            purchaseDate: "03/05/2026",
            groupKey: "group",
            estimated: true,
          },
        }),
        interCard,
      ),
    ).toBe("2026-08-07");
  });
});

describe("buildFaturaEvents", () => {
  it("groups a normal purchase and an Inter installment into the July invoice", () => {
    const events = buildFaturaEvents(
      [
        tx({
          id: "vista",
          dataISO: "2026-06-02",
          data: "02/06/2026",
          tipo: "Compra à vista",
          valorAnalise: 100,
          valorFluxo: 100,
          valorOriginal: 100,
        }),
        tx({
          id: "parcela",
          dataISO: "2026-07-07",
          data: "07/07/2026",
          tipo: "Parcela 2/3",
          valorAnalise: 50,
          valorFluxo: 50,
          valorOriginal: 50,
        }),
      ],
      [interCard],
    );

    expect(events).toHaveLength(1);
    expect(events[0]).toMatchObject({
      date: "2026-07-07",
      type: "fatura",
      fonte: "inter",
      amount: -150,
    });
  });

  it("groups estimated future installments on their direct payment date", () => {
    const events = buildFaturaEvents(
      [
        tx({
          id: "future",
          dataISO: "2026-08-07",
          data: "07/08/2026",
          tipo: "Parcela 3/6",
          valorAnalise: 245.71,
          valorFluxo: 245.71,
          valorOriginal: 245.71,
          installment: {
            current: 3,
            total: 6,
            purchaseDate: "03/05/2026",
            groupKey: "group",
            estimated: true,
          },
        }),
      ],
      [interCard],
    );

    expect(events).toHaveLength(1);
    expect(events[0]).toMatchObject({
      date: "2026-08-07",
      amount: -245.71,
    });
  });
});
