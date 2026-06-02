export type Natureza =
  | "Gasto"
  | "Pagamento de fatura"
  | "Estorno / crédito"
  | "Despesa fixa"
  | "Receita";

export type Fonte = "inter" | "nubank" | "manual";

export type TipoFluxo = "saida" | "entrada" | "neutro";

export type RecurringKind = "despesa_fixa" | "receita";

export type AccountKind = "cc" | "poupanca" | "carteira" | "cartao";

export type Account = {
  id: string;
  nome: string;
  kind: AccountKind;
  saldoInicial: number;
  dataReferencia: string;
  ativa: boolean;
  criadaEm: string;
  isDefault?: boolean;
  fonteCsv?: "inter" | "nubank";
  diaFechamento?: number;
  diaPagamento?: number;
};

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
  accountId?: string;
};

export type InstallmentInfo = {
  current: number;
  total: number;
  purchaseDate: string;
  groupKey: string;
  estimated: boolean;
};

export type TransactionRaw = {
  id: string;
  data: string; // dd/mm/yyyy original
  lancamento: string;
  categoria: string;
  tipo: string;
  valorOriginal: number; // signed, in BRL
  fonte: Fonte;
  sourceId: string;
  accountId?: string;
  installment?: InstallmentInfo;
};

/** Avulsa manual (Quick Add) — persisted separately from CSV. */
export type ManualTransaction = TransactionRaw;

export type TransactionEdit = {
  rawId: string;
  data?: string;
  lancamento?: string;
  categoria?: string;
  tipo?: string;
  valorOriginal?: number;
  deleted?: boolean;
  editedAt: string;
};

export type EditsState = Record<string, TransactionEdit>;

export type InstallmentGroupEdit = {
  groupKey: string;
  editedAt: string;
  lancamento?: string;
  categoria?: string;
  tipo?: string;
  valorOriginal?: number;
  deleted?: boolean;
};

export type InstallmentGroupEditsState = Record<string, InstallmentGroupEdit>;

export const EMPTY_INSTALLMENT_GROUP_EDITS: InstallmentGroupEditsState = {};

export type TransactionNormalized = TransactionRaw & {
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
  genericCategorias: string[];
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
  genericCategorias: ["Outros", "Diversos", "Geral", "Sem categoria"],
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

export type CardConfig = {
  fonte: Fonte;
  diaFechamento: number;
  diaPagamento: number;
};

export type BalanceAnchor = {
  data: string;
  valor: number;
};

export type SaldoView = "overview" | "calendar";

export type Settings = {
  cards: CardConfig[];
  balanceAnchor: BalanceAnchor | null;
  projectionHorizonDays: number;
  saldoView?: SaldoView;
  /** When false, achievement UI is hidden; unlocks still persist locally. */
  showAchievements?: boolean;
};

export const DEFAULT_SETTINGS: Settings = {
  cards: [],
  balanceAnchor: null,
  projectionHorizonDays: 90,
  showAchievements: true,
};

export type AchievementId =
  | "primeiro-passo"
  | "semana-viva"
  | "mes-fiel"
  | "volta-certeira"
  | "mes-positivo"
  | "trio-positivo"
  | "cofrinho-calmo"
  | "mes-revisado";

export type MonthCloseTopCategory = {
  categoria: string;
  gasto: number;
  limite: number;
  percentual: number;
};

export type MonthCloseEntry = {
  anoMes: string;
  sobra: number;
  top3estouro: MonthCloseTopCategory[];
  closedAt: string;
};

export const EMPTY_MONTH_CLOSES: MonthCloseEntry[] = [];

export type Achievement = {
  id: AchievementId;
  unlockedAt: string;
};

export type AchievementsSnapshot = {
  unlocked: Achievement[];
  meta: {
    lastSobraTotal: number;
    lastStreak: number;
  };
};

export const EMPTY_ACHIEVEMENTS: AchievementsSnapshot = {
  unlocked: [],
  meta: { lastSobraTotal: 0, lastStreak: 0 },
};

export const EMPTY_ACCOUNTS: Account[] = [];

export type CategoryBudget = {
  id: string;
  categoria: string;
  valorMensal: number;
  ativa: boolean;
  criadaEm: string;
  atualizadaEm: string;
};

export const EMPTY_BUDGETS: CategoryBudget[] = [];

export type EstablishmentAlias = {
  id: string;
  canonical: string;
  patterns: string[];
  criadoEm: string;
  atualizadaEm: string;
};

export const EMPTY_ALIASES: EstablishmentAlias[] = [];

export type AppState = {
  dataset: Dataset;
  rules: Rules;
  recurringRules: RecurringRule[];
  settings: Settings;
  accounts: Account[];
  manualTransactions: ManualTransaction[];
  budgets: CategoryBudget[];
  subscriptionDismissals: string[];
  establishmentAliases: EstablishmentAlias[];
  structuralCategories: string[];
};
