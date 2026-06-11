import { describe, expect, it } from "vitest";
import {
  billPayDateForTransaction,
  buildFaturaEvents,
  buildRecurringEvents,
  cycleFor,
  faturaCashEventsForMonth,
  projectDailyBalance,
} from "./projection";
import { MANUAL_SOURCE_ID } from "./manualTransactions";
import type { Account, CardConfig, TransactionNormalized } from "./types";
import { DEFAULT_SETTINGS } from "./types";

const interCard: CardConfig = {
  fonte: "inter",
  diaFechamento: 30,
  diaPagamento: 7,
};

const interCardAccount: Account = {
  id: "card-inter",
  nome: "Inter",
  kind: "cartao",
  saldoInicial: 0,
  dataReferencia: "2026-01-01",
  ativa: true,
  criadaEm: "2026-01-01T00:00:00.000Z",
  fonteCsv: "inter",
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
    ...partial,
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

describe("faturaCashEventsForMonth", () => {
  const sampleTx = [
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
  ];

  it("returns fatura events for the payment month only", () => {
    const july = faturaCashEventsForMonth("2026-07", sampleTx, [interCardAccount]);
    expect(july).toHaveLength(1);
    expect(july[0]).toMatchObject({
      date: "2026-07-07",
      type: "fatura",
      amount: -150,
    });

    const june = faturaCashEventsForMonth("2026-06", sampleTx, [interCardAccount]);
    expect(june).toHaveLength(0);
  });
});

describe("buildRecurringEvents", () => {
  it("applies monthly value and date edits to recurring fixed expense", () => {
    const events = buildRecurringEvents(
      [
        {
          id: "aluguel",
          descricao: "Aluguel",
          kind: "despesa_fixa",
          categoria: "MORADIA",
          valor: 2000,
          diaMes: 5,
          inicio: "2026-01-01",
          fim: null,
          ativo: true,
          criadoEm: "2026-01-01T00:00:00.000Z",
        },
      ],
      "2026-06-01",
      "2026-06-30",
      {
        "manual:aluguel:2026-06": {
          rawId: "manual:aluguel:2026-06",
          editedAt: "2026-06-01T00:00:00.000Z",
          data: "10/06/2026",
          valorOriginal: 1500,
        },
      },
    );
    expect(events).toHaveLength(1);
    expect(events[0].date).toBe("2026-06-10");
    expect(events[0].amount).toBe(-1500);
    expect(events[0].source).toEqual({
      kind: "recurring",
      ruleId: "aluguel",
      rawId: "manual:aluguel:2026-06",
    });
  });

  it("skips deleted recurring fixed expense for the month", () => {
    const events = buildRecurringEvents(
      [
        {
          id: "aluguel",
          descricao: "Aluguel",
          kind: "despesa_fixa",
          categoria: "MORADIA",
          valor: 2000,
          diaMes: 5,
          inicio: "2026-01-01",
          fim: null,
          ativo: true,
          criadoEm: "2026-01-01T00:00:00.000Z",
        },
      ],
      "2026-06-01",
      "2026-06-30",
      {
        "manual:aluguel:2026-06": {
          rawId: "manual:aluguel:2026-06",
          editedAt: "2026-06-01T00:00:00.000Z",
          deleted: true,
        },
      },
    );
    expect(events).toHaveLength(0);
  });
});

describe("projectDailyBalance", () => {
  it("includes manual income dated before the account reference in the starting balance", () => {
    const accountId = "acc-main";
    const accounts: Account[] = [
      {
        id: accountId,
        nome: "Conta Principal",
        kind: "cc",
        saldoInicial: 1000,
        dataReferencia: "2026-06-01",
        ativa: true,
        criadaEm: "2026-06-01T00:00:00.000Z",
        isDefault: true,
      },
    ];
    const normalized: TransactionNormalized[] = [
      tx({
        id: "receita-passada",
        fonte: "manual",
        sourceId: MANUAL_SOURCE_ID,
        accountId,
        dataISO: "2026-05-15",
        data: "15/05/2026",
        lancamento: "Freela",
        tipo: "Receita",
        natureza: "Receita",
        valorOriginal: -500,
        valorAnalise: 0,
        tipoFluxo: "entrada",
        valorFluxo: 500,
      }),
    ];

    const { series, summary } = projectDailyBalance({
      normalized,
      recurringRules: [],
      settings: DEFAULT_SETTINGS,
      accounts,
      windowFrom: "2026-06-01",
      windowTo: "2026-06-30",
    });

    expect(summary?.saldoInicial).toBe(1500);
    expect(series[0]?.balance).toBe(1500);
  });
});
