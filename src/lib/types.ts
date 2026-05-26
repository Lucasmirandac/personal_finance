export type Natureza = "Gasto" | "Pagamento de fatura" | "Estorno / crédito";

export type Fonte = "inter" | "nubank";

export type TransactionRaw = {
  data: string; // dd/mm/yyyy original
  lancamento: string;
  categoria: string;
  tipo: string;
  valorOriginal: number; // signed, in BRL
  fonte: Fonte;
  sourceId: string;
};

export type TransactionNormalized = TransactionRaw & {
  id: string;
  estabelecimento: string;
  valorAnalise: number; // 0 when payment/refund, else absolute
  natureza: Natureza;
  ajuste: boolean; // true if natureza != "Gasto"
  dataISO: string; // yyyy-mm-dd
  mes: number; // 1-12
  ano: number;
  anoMes: string; // yyyy-mm
  mesLabel: string; // e.g. "Mai/26"
  diaSemana: string; // "Segunda", ...
  diaSemanaIndex: number; // 0=Domingo
  semana: string; // ISO week label "2026-W21"
  faixaValor: string; // "Até R$ 25", "R$ 25-50", ...
  fimSemana: boolean;
};

export type Rules = {
  pagamentoPatterns: string[];
  estornoPatterns: string[];
};

export const DEFAULT_RULES: Rules = {
  pagamentoPatterns: [
    "PAGAMENTO ON LINE",
    "PAGTO DEBITO AUTOMATICO",
    "PAGAMENTO DE FATURA",
    "PAG FATURA",
    "PAGAMENTO RECEBIDO",
  ],
  estornoPatterns: [
    "ESTORNO",
    "CREDITO",
    "CRÉDITO",
    "DEVOLU",
    "CANCELAMENTO",
    "REEMBOLSO",
  ],
};

export type Source = {
  id: string;
  fileName: string;
  fonte: Fonte;
  importedAt: string; // ISO
  rowsRaw: number;
  raw: TransactionRaw[];
};

export type Dataset = {
  sources: Source[];
};

export const EMPTY_DATASET: Dataset = { sources: [] };

/** @deprecated Legacy single-file dataset shape (pre multi-source). */
export type LegacyDataset = {
  fileName: string;
  importedAt: string;
  rowsRaw: number;
  rawCsv?: string;
  raw: Array<
    Omit<TransactionRaw, "fonte" | "sourceId"> & {
      fonte?: Fonte;
      sourceId?: string;
    }
  >;
};

export type AppState = {
  dataset: Dataset;
  rules: Rules;
};
