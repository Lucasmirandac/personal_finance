import { z } from "zod";
import {
  loadAccounts,
  loadBudgets,
  loadSubscriptionDismissals,
  loadAliases,
  loadStructuralCategories,
  loadDataset,
  loadEdits,
  loadManualTransactions,
  loadRecurring,
  loadRules,
  loadSettings,
  saveLastBackupAt,
} from "./storage";
import {
  Account,
  CategoryBudget,
  Dataset,
  DEFAULT_RULES,
  DEFAULT_SETTINGS,
  EditsState,
  EMPTY_DATASET,
  EstablishmentAlias,
  ManualTransaction,
  RecurringRule,
  Rules,
  Settings,
} from "./types";

export const BACKUP_VERSION = 5 as const;
export const BACKUP_VERSION_V4 = 4 as const;
export const BACKUP_VERSION_V3 = 3 as const;
export const BACKUP_VERSION_V2 = 2 as const;
export const BACKUP_VERSION_LEGACY = 1 as const;
export const BACKUP_APP = "personal-finance" as const;

export type BackupImportMode = "replace" | "merge";

export type BackupPayload = {
  dataset: Dataset;
  rules: Rules;
  recurring: RecurringRule[];
  settings: Settings;
  edits: EditsState;
  accounts: Account[];
  manualTransactions: ManualTransaction[];
  budgets: CategoryBudget[];
  subscriptionDismissals: string[];
  establishmentAliases: EstablishmentAlias[];
  structuralCategories: string[];
};

/** @deprecated use BackupFile */
export type BackupV1 = {
  version: typeof BACKUP_VERSION_LEGACY;
  app: typeof BACKUP_APP;
  exportedAt: string;
  data: Omit<BackupPayload, "budgets">;
};

export type BackupFile = {
  version:
    | typeof BACKUP_VERSION
    | typeof BACKUP_VERSION_V4
    | typeof BACKUP_VERSION_V3
    | typeof BACKUP_VERSION_V2
    | typeof BACKUP_VERSION_LEGACY;
  app: typeof BACKUP_APP;
  exportedAt: string;
  data: BackupPayload;
};

export type MergePreview = {
  sourcesToAdd: number;
  transactionsToAdd: number;
  accountsToAdd: number;
  recurringToAdd: number;
  manualToAdd: number;
  budgetsToAdd: number;
  dismissalsToAdd: number;
  aliasesToAdd: number;
};

const transactionRawSchema = z.object({
  id: z.string(),
  data: z.string(),
  lancamento: z.string(),
  categoria: z.string(),
  tipo: z.string(),
  valorOriginal: z.number(),
  fonte: z.enum(["inter", "nubank", "manual"]),
  sourceId: z.string(),
  accountId: z.string().optional(),
});

const sourceSchema = z.object({
  id: z.string(),
  fileName: z.string(),
  fonte: z.enum(["inter", "nubank", "manual"]),
  importedAt: z.string(),
  rowsRaw: z.number(),
  raw: z.array(transactionRawSchema),
});

const budgetSchema = z.object({
  id: z.string(),
  categoria: z.string(),
  valorMensal: z.number(),
  ativa: z.boolean(),
  criadaEm: z.string(),
  atualizadaEm: z.string(),
});

const backupDataBaseSchema = z.object({
  dataset: z.object({ sources: z.array(sourceSchema) }),
  rules: z.object({
    pagamentoPatterns: z.array(z.string()),
    estornoPatterns: z.array(z.string()),
    genericCategorias: z.array(z.string()).optional(),
  }),
  recurring: z.array(z.record(z.string(), z.unknown())),
  settings: z.object({
    cards: z.array(
      z.object({
        fonte: z.enum(["inter", "nubank", "manual"]),
        diaFechamento: z.number(),
        diaPagamento: z.number(),
      }),
    ),
    balanceAnchor: z
      .object({ data: z.string(), valor: z.number() })
      .nullable(),
    projectionHorizonDays: z.number(),
  }),
  edits: z.record(z.string(), z.record(z.string(), z.unknown())),
  accounts: z.array(z.record(z.string(), z.unknown())),
  manualTransactions: z.array(transactionRawSchema),
});

const backupDataV2Schema = backupDataBaseSchema.extend({
  budgets: z.array(budgetSchema).optional(),
});

const backupDataV3Schema = backupDataV2Schema.extend({
  subscriptionDismissals: z.array(z.string()).optional(),
});

const aliasSchema = z.object({
  id: z.string(),
  canonical: z.string(),
  patterns: z.array(z.string()),
  criadoEm: z.string(),
  atualizadaEm: z.string(),
});

const backupDataV4Schema = backupDataV3Schema.extend({
  establishmentAliases: z.array(aliasSchema).optional(),
});

const backupDataV5Schema = backupDataV4Schema.extend({
  structuralCategories: z.array(z.string()).optional(),
});

const backupV5Schema = z.object({
  version: z.literal(BACKUP_VERSION),
  app: z.literal(BACKUP_APP),
  exportedAt: z.string(),
  data: backupDataV5Schema,
});

const backupV4Schema = z.object({
  version: z.literal(BACKUP_VERSION_V4),
  app: z.literal(BACKUP_APP),
  exportedAt: z.string(),
  data: backupDataV4Schema,
});

const backupV3Schema = z.object({
  version: z.literal(BACKUP_VERSION_V3),
  app: z.literal(BACKUP_APP),
  exportedAt: z.string(),
  data: backupDataV3Schema,
});

const backupV2Schema = z.object({
  version: z.literal(BACKUP_VERSION_V2),
  app: z.literal(BACKUP_APP),
  exportedAt: z.string(),
  data: backupDataV2Schema,
});

const backupV1Schema = z.object({
  version: z.literal(BACKUP_VERSION_LEGACY),
  app: z.literal(BACKUP_APP),
  exportedAt: z.string(),
  data: backupDataBaseSchema,
});

export type ParseBackupResult =
  | { ok: true; backup: BackupFile }
  | { ok: false; error: string };

function mergeById<T extends { id: string }>(current: T[], incoming: T[]): T[] {
  const ids = new Set(current.map((x) => x.id));
  const added = incoming.filter((x) => !ids.has(x.id));
  return [...current, ...added];
}

function mergeDataset(current: Dataset, incoming: Dataset): Dataset {
  const ids = new Set(current.sources.map((s) => s.id));
  const added = incoming.sources.filter((s) => !ids.has(s.id));
  return { sources: [...current.sources, ...added] };
}

export function resolveBackupApplication(
  current: BackupPayload,
  backup: BackupPayload,
  mode: BackupImportMode,
): BackupPayload {
  if (mode === "replace") return backup;
  return {
    dataset: mergeDataset(current.dataset, backup.dataset),
    manualTransactions: mergeById(
      current.manualTransactions,
      backup.manualTransactions,
    ),
    accounts: mergeById(current.accounts, backup.accounts),
    recurring: mergeById(current.recurring, backup.recurring),
    budgets: mergeById(current.budgets, backup.budgets),
    subscriptionDismissals: [
      ...new Set([
        ...current.subscriptionDismissals,
        ...backup.subscriptionDismissals,
      ]),
    ],
    establishmentAliases: mergeById(
      current.establishmentAliases,
      backup.establishmentAliases,
    ),
    structuralCategories: [
      ...new Set([
        ...current.structuralCategories,
        ...backup.structuralCategories,
      ]),
    ],
    rules: backup.rules,
    settings: backup.settings,
    edits: backup.edits,
  };
}

export function computeMergePreview(
  current: BackupPayload,
  backup: BackupPayload,
): MergePreview {
  const existingSourceIds = new Set(current.dataset.sources.map((s) => s.id));
  const newSources = backup.dataset.sources.filter(
    (s) => !existingSourceIds.has(s.id),
  );
  const existingManualIds = new Set(current.manualTransactions.map((t) => t.id));
  const newManual = backup.manualTransactions.filter(
    (t) => !existingManualIds.has(t.id),
  );
  const existingAccountIds = new Set(current.accounts.map((a) => a.id));
  const newAccounts = backup.accounts.filter((a) => !existingAccountIds.has(a.id));
  const existingRecurringIds = new Set(current.recurring.map((r) => r.id));
  const newRecurring = backup.recurring.filter(
    (r) => !existingRecurringIds.has(r.id),
  );
  const existingBudgetIds = new Set(current.budgets.map((b) => b.id));
  const newBudgets = backup.budgets.filter((b) => !existingBudgetIds.has(b.id));
  const existingDismissals = new Set(current.subscriptionDismissals);
  const newDismissals = backup.subscriptionDismissals.filter(
    (k) => !existingDismissals.has(k),
  );
  const existingAliasIds = new Set(current.establishmentAliases.map((a) => a.id));
  const newAliases = backup.establishmentAliases.filter(
    (a) => !existingAliasIds.has(a.id),
  );

  return {
    sourcesToAdd: newSources.length,
    transactionsToAdd:
      newSources.reduce((n, s) => n + s.raw.length, 0) + newManual.length,
    accountsToAdd: newAccounts.length,
    recurringToAdd: newRecurring.length,
    manualToAdd: newManual.length,
    budgetsToAdd: newBudgets.length,
    dismissalsToAdd: newDismissals.length,
    aliasesToAdd: newAliases.length,
  };
}

function sanitizeRecurring(raw: unknown[]): RecurringRule[] {
  const out: RecurringRule[] = [];
  for (const item of raw) {
    if (!item || typeof item !== "object") continue;
    const o = item as Partial<RecurringRule>;
    if (
      typeof o.id !== "string" ||
      typeof o.descricao !== "string" ||
      typeof o.valor !== "number" ||
      typeof o.diaMes !== "number" ||
      typeof o.inicio !== "string"
    ) {
      continue;
    }
    out.push({
      id: o.id,
      kind: o.kind === "receita" ? "receita" : "despesa_fixa",
      descricao: o.descricao,
      categoria: typeof o.categoria === "string" ? o.categoria : "",
      valor: o.valor,
      diaMes: o.diaMes,
      inicio: o.inicio,
      fim: o.fim ?? null,
      ativo: o.ativo !== false,
      criadoEm:
        typeof o.criadoEm === "string"
          ? o.criadoEm
          : new Date().toISOString(),
      ...(typeof o.accountId === "string" ? { accountId: o.accountId } : {}),
    });
  }
  return out;
}

function sanitizeAccounts(raw: unknown[]): Account[] {
  const out: Account[] = [];
  for (const item of raw) {
    if (!item || typeof item !== "object") continue;
    const o = item as Partial<Account>;
    if (typeof o.id !== "string" || typeof o.nome !== "string") continue;
    const kind = o.kind;
    if (
      kind !== "cc" &&
      kind !== "poupanca" &&
      kind !== "carteira" &&
      kind !== "cartao"
    ) {
      continue;
    }
    out.push({
      id: o.id,
      nome: o.nome,
      kind,
      saldoInicial: typeof o.saldoInicial === "number" ? o.saldoInicial : 0,
      dataReferencia:
        typeof o.dataReferencia === "string"
          ? o.dataReferencia
          : new Date().toISOString().slice(0, 10),
      ativa: o.ativa !== false,
      criadaEm:
        typeof o.criadaEm === "string"
          ? o.criadaEm
          : new Date().toISOString(),
      ...(o.isDefault ? { isDefault: true } : {}),
      ...(o.fonteCsv === "inter" || o.fonteCsv === "nubank"
        ? { fonteCsv: o.fonteCsv }
        : {}),
      ...(typeof o.diaFechamento === "number"
        ? { diaFechamento: o.diaFechamento }
        : {}),
      ...(typeof o.diaPagamento === "number"
        ? { diaPagamento: o.diaPagamento }
        : {}),
    });
  }
  return out;
}

function sanitizeBudgets(raw: unknown[] | undefined): CategoryBudget[] {
  if (!raw || !Array.isArray(raw)) return [];
  const out: CategoryBudget[] = [];
  for (const item of raw) {
    if (!item || typeof item !== "object") continue;
    const o = item as Partial<CategoryBudget>;
    if (typeof o.id !== "string" || typeof o.categoria !== "string") continue;
    if (typeof o.valorMensal !== "number") continue;
    const now = new Date().toISOString();
    out.push({
      id: o.id,
      categoria: o.categoria.trim(),
      valorMensal: o.valorMensal,
      ativa: o.ativa !== false,
      criadaEm: typeof o.criadaEm === "string" ? o.criadaEm : now,
      atualizadaEm: typeof o.atualizadaEm === "string" ? o.atualizadaEm : now,
    });
  }
  return out;
}

function sanitizeEdits(raw: Record<string, unknown>): EditsState {
  const out: EditsState = {};
  for (const [key, val] of Object.entries(raw)) {
    if (!val || typeof val !== "object") continue;
    const e = val as Record<string, unknown>;
    if (typeof e.rawId !== "string" || typeof e.editedAt !== "string") continue;
    out[key] = {
      rawId: e.rawId,
      editedAt: e.editedAt,
      ...(typeof e.data === "string" ? { data: e.data } : {}),
      ...(typeof e.lancamento === "string" ? { lancamento: e.lancamento } : {}),
      ...(typeof e.categoria === "string" ? { categoria: e.categoria } : {}),
      ...(typeof e.tipo === "string" ? { tipo: e.tipo } : {}),
      ...(typeof e.valorOriginal === "number"
        ? { valorOriginal: e.valorOriginal }
        : {}),
      ...(e.deleted === true ? { deleted: true } : {}),
    };
  }
  return out;
}

function sanitizeDismissals(raw: unknown[] | undefined): string[] {
  if (!raw || !Array.isArray(raw)) return [];
  return [...new Set(raw.filter((x): x is string => typeof x === "string" && x.length > 0))];
}

function sanitizeAliases(raw: unknown[] | undefined): EstablishmentAlias[] {
  if (!raw || !Array.isArray(raw)) return [];
  const out: EstablishmentAlias[] = [];
  for (const item of raw) {
    if (!item || typeof item !== "object") continue;
    const o = item as Partial<EstablishmentAlias>;
    if (typeof o.id !== "string" || typeof o.canonical !== "string") continue;
    const patterns = Array.isArray(o.patterns)
      ? o.patterns.filter((p): p is string => typeof p === "string" && p.trim().length > 0)
      : [];
    if (patterns.length === 0) continue;
    const now = new Date().toISOString();
    out.push({
      id: o.id,
      canonical: o.canonical.trim(),
      patterns: patterns.map((p) => p.trim()),
      criadoEm: typeof o.criadoEm === "string" ? o.criadoEm : now,
      atualizadaEm: typeof o.atualizadaEm === "string" ? o.atualizadaEm : now,
    });
  }
  return out;
}

function sanitizeRules(raw: z.infer<typeof backupDataBaseSchema>["rules"]): Rules {
  return {
    pagamentoPatterns: Array.isArray(raw.pagamentoPatterns)
      ? raw.pagamentoPatterns
      : DEFAULT_RULES.pagamentoPatterns,
    estornoPatterns: Array.isArray(raw.estornoPatterns)
      ? raw.estornoPatterns
      : DEFAULT_RULES.estornoPatterns,
    genericCategorias: Array.isArray(raw.genericCategorias)
      ? raw.genericCategorias
      : DEFAULT_RULES.genericCategorias,
  };
}

function sanitizeStructuralCategories(raw: unknown[] | undefined): string[] {
  if (!raw || !Array.isArray(raw)) return [];
  return [
    ...new Set(
      raw.filter((x): x is string => typeof x === "string" && x.trim().length > 0),
    ),
  ];
}

function toBackupPayload(
  parsed: z.infer<typeof backupDataV5Schema>,
  version: number,
): BackupPayload {
  return {
    dataset: parsed.dataset as Dataset,
    rules: sanitizeRules(parsed.rules),
    recurring: sanitizeRecurring(parsed.recurring),
    settings: parsed.settings as Settings,
    edits: sanitizeEdits(parsed.edits as Record<string, unknown>),
    accounts: sanitizeAccounts(parsed.accounts),
    manualTransactions: parsed.manualTransactions as ManualTransaction[],
    budgets:
      version >= BACKUP_VERSION_V2
        ? sanitizeBudgets(parsed.budgets)
        : [],
    subscriptionDismissals:
      version >= BACKUP_VERSION_V3
        ? sanitizeDismissals(parsed.subscriptionDismissals)
        : [],
    establishmentAliases:
      version >= BACKUP_VERSION_V4
        ? sanitizeAliases(parsed.establishmentAliases)
        : [],
    structuralCategories:
      version >= BACKUP_VERSION
        ? sanitizeStructuralCategories(parsed.structuralCategories)
        : [],
  };
}

export async function exportAllData(): Promise<BackupFile> {
  const [
    dataset,
    rules,
    recurring,
    settings,
    edits,
    accounts,
    manualTransactions,
    budgets,
    subscriptionDismissals,
    establishmentAliases,
    structuralCategories,
  ] = await Promise.all([
    loadDataset(),
    loadRules(),
    loadRecurring(),
    loadSettings(),
    loadEdits(),
    loadAccounts(),
    loadManualTransactions(),
    loadBudgets(),
    loadSubscriptionDismissals(),
    loadAliases(),
    loadStructuralCategories(),
  ]);

  return {
    version: BACKUP_VERSION,
    app: BACKUP_APP,
    exportedAt: new Date().toISOString(),
    data: {
      dataset,
      rules,
      recurring,
      settings,
      edits,
      accounts,
      manualTransactions,
      budgets,
      subscriptionDismissals,
      establishmentAliases,
      structuralCategories,
    },
  };
}

export function parseBackup(text: string): ParseBackupResult {
  let json: unknown;
  try {
    json = JSON.parse(text);
  } catch {
    return { ok: false, error: "JSON inválido. Verifique o conteúdo do arquivo." };
  }

  if (!json || typeof json !== "object") {
    return { ok: false, error: "Formato de backup inválido." };
  }

  const root = json as Record<string, unknown>;
  const version = root.version;

  if (typeof version === "number" && version > BACKUP_VERSION) {
    return {
      ok: false,
      error: `Versão ${version} não suportada — atualize o app.`,
    };
  }

  const v5 = backupV5Schema.safeParse(json);
  if (v5.success) {
    return {
      ok: true,
      backup: {
        ...v5.data,
        data: toBackupPayload(v5.data.data, BACKUP_VERSION),
      },
    };
  }

  const v4 = backupV4Schema.safeParse(json);
  if (v4.success) {
    return {
      ok: true,
      backup: {
        ...v4.data,
        data: toBackupPayload(v4.data.data, BACKUP_VERSION_V4),
      },
    };
  }

  const v3 = backupV3Schema.safeParse(json);
  if (v3.success) {
    return {
      ok: true,
      backup: {
        ...v3.data,
        data: toBackupPayload(v3.data.data, BACKUP_VERSION_V3),
      },
    };
  }

  const v2 = backupV2Schema.safeParse(json);
  if (v2.success) {
    return {
      ok: true,
      backup: {
        ...v2.data,
        data: toBackupPayload(v2.data.data, BACKUP_VERSION_V2),
      },
    };
  }

  const v1 = backupV1Schema.safeParse(json);
  if (v1.success) {
    return {
      ok: true,
      backup: {
        ...v1.data,
        data: toBackupPayload(
          { ...v1.data.data, budgets: [] },
          BACKUP_VERSION_LEGACY,
        ),
      },
    };
  }

  const first =
    v5.error.issues[0] ??
    v4.error.issues[0] ??
    v3.error.issues[0] ??
    v2.error.issues[0] ??
    v1.error.issues[0];
  return {
    ok: false,
    error: first
      ? `Backup inválido: ${first.path.join(".")} — ${first.message}`
      : "Backup inválido ou corrompido.",
  };
}

export function backupFilename(date = new Date()): string {
  const d = date.toISOString().slice(0, 10);
  return `backup-${d}.json`;
}

export function downloadBackup(backup: BackupFile): void {
  const json = JSON.stringify(backup, null, 2);
  const blob = new Blob([json], { type: "application/json;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = backupFilename(new Date(backup.exportedAt));
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export async function exportAndDownloadBackup(): Promise<BackupFile> {
  const backup = await exportAllData();
  downloadBackup(backup);
  await saveLastBackupAt(backup.exportedAt);
  return backup;
}

export function summarizeBackup(backup: BackupFile | BackupPayload): {
  sources: number;
  transactions: number;
  accounts: number;
  recurring: number;
  manual: number;
  budgets: number;
  dismissals: number;
  aliases: number;
} {
  const data = "data" in backup ? backup.data : backup;
  const importedTx = data.dataset.sources.reduce((n, s) => n + s.raw.length, 0);
  return {
    sources: data.dataset.sources.length,
    transactions: importedTx + data.manualTransactions.length,
    accounts: data.accounts.length,
    recurring: data.recurring.length,
    manual: data.manualTransactions.length,
    budgets: data.budgets.length,
    dismissals: data.subscriptionDismissals.length,
    aliases: data.establishmentAliases.length,
  };
}

export function emptyBackupPayload(): BackupPayload {
  return {
    dataset: { ...EMPTY_DATASET },
    rules: { ...DEFAULT_RULES },
    recurring: [],
    settings: { ...DEFAULT_SETTINGS },
    edits: {},
    accounts: [],
    manualTransactions: [],
    budgets: [],
    subscriptionDismissals: [],
    establishmentAliases: [],
    structuralCategories: [],
  };
}

export function daysSince(iso: string | null): number | null {
  if (!iso) return null;
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return null;
  const diff = Date.now() - then;
  return Math.floor(diff / 86400000);
}
