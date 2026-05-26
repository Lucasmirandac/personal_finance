export type Natureza =
  | "Gasto"
  | "Pagamento de fatura"
  | "Estorno / crédito"
  | "Despesa fixa"
  | "Receita";

export type Fonte = "inter" | "nubank" | "manual";

export type TipoFluxo = "saida" | "entrada" | "neutro";

export type RecurringKind = "despesa_fixa" | "receita";

export type RecurringRule = {
  id: string;
  kind: RecurringKind;
  descricao: string;
  categoria: string;
  valor: number;
  diaMes: number;
  inicio: string;
  fim: string | null;
  ativo: boolean;
  criadoEm: string;
};

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
  valorAnalise: number;
  natureza: Natureza;
  ajuste: boolean;
  tipoFluxo: TipoFluxo;
  valorFluxo: number;
  dataISO: string;
  mes: number;
  ano: number;
  anoMes: string;
  mesLabel: string;
  diaSemana: string;
  diaSemanaIndex: number;
  semana: string;
  faixaValor: string;
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
  importedAt: string;
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
  recurringRules: RecurringRule[];
};
