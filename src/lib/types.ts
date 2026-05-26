export type Natureza = "Gasto" | "Pagamento de fatura" | "Estorno / crédito";

export type TransactionRaw = {
  data: string; // dd/mm/yyyy original
  lancamento: string;
  categoria: string;
  tipo: string;
  valorOriginal: number; // signed, in BRL
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

export type Dataset = {
  fileName: string;
  importedAt: string; // ISO
  rowsRaw: number;
  rawCsv?: string; // optional snapshot
  raw: TransactionRaw[];
};

export type AppState = {
  dataset: Dataset | null;
  rules: Rules;
};
