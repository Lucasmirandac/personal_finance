import { get, set, del } from "idb-keyval";
import {
  attachAccountIdsToDataset,
  migrateAccountsFromLegacy,
} from "./accounts";
import { EMPTY_EDITS } from "./edits";
import { newSourceId, newTransactionId } from "./ids";
import {
  Account,
  Dataset,
  EditsState,
  EMPTY_DATASET,
  LegacyDataset,
  CategoryBudget,
  ManualTransaction,
  RecurringRule,
  Rules,
  DEFAULT_RULES,
  DEFAULT_SETTINGS,
  Settings,
  Source,
  TransactionEdit,
  TransactionRaw,
} from "./types";

const KEY_DATASET = "pf:dataset:v2";
const KEY_DATASET_LEGACY = "pf:dataset:v1";
const KEY_RULES = "pf:rules:v1";
const KEY_RECURRING = "pf:recurring:v1";
const KEY_SETTINGS = "pf:settings:v1";
const KEY_EDITS = "pf:edits:v1";
const KEY_ACCOUNTS = "pf:accounts:v1";
const KEY_MANUAL = "pf:manual:v1";
const KEY_LAST_BACKUP = "pf:lastBackup:v1";
const KEY_BUDGETS = "pf:budgets:v1";

function isLegacyDataset(v: unknown): v is LegacyDataset {
  if (!v || typeof v !== "object") return false;
  const o = v as Record<string, unknown>;
  return (
    typeof o.fileName === "string" &&
    Array.isArray(o.raw) &&
    !Array.isArray(o.sources)
  );
}

function isDataset(v: unknown): v is Dataset {
  if (!v || typeof v !== "object") return false;
  const o = v as Record<string, unknown>;
  return Array.isArray(o.sources);
}

function ensureRawIds(raw: TransactionRaw[]): TransactionRaw[] {
  return raw.map((r) => ({
    ...r,
    id: typeof r.id === "string" && r.id.length > 0 ? r.id : newTransactionId(),
  }));
}

function migrateDatasetIds(dataset: Dataset): Dataset {
  let changed = false;
  const sources = dataset.sources.map((source) => {
    const needsId = source.raw.some(
      (r) => typeof r.id !== "string" || r.id.length === 0,
    );
    if (!needsId) return source;
    changed = true;
    return { ...source, raw: ensureRawIds(source.raw) };
  });
  return changed ? { sources } : dataset;
}

function migrateLegacy(legacy: LegacyDataset): Dataset {
  const sourceId = newSourceId();
  const raw: TransactionRaw[] = legacy.raw.map((r) => ({
    id: newTransactionId(),
    data: r.data,
    lancamento: r.lancamento,
    categoria: r.categoria,
    tipo: r.tipo,
    valorOriginal: r.valorOriginal,
    fonte: r.fonte ?? "inter",
    sourceId: r.sourceId ?? sourceId,
  }));
  const source: Source = {
    id: sourceId,
    fileName: legacy.fileName,
    fonte: "inter",
    importedAt: legacy.importedAt,
    rowsRaw: legacy.rowsRaw ?? raw.length,
    raw,
  };
  return { sources: [source] };
}

export async function loadDataset(): Promise<Dataset> {
  try {
    const current = (await get(KEY_DATASET)) as unknown;
    if (isDataset(current)) {
      const withIds = migrateDatasetIds(current);
      if (withIds !== current) {
        await set(KEY_DATASET, withIds);
      }
      return withIds;
    }

    const legacy = (await get(KEY_DATASET_LEGACY)) as unknown;
    if (isLegacyDataset(legacy)) {
      const migrated = migrateLegacy(legacy);
      await set(KEY_DATASET, migrated);
      await del(KEY_DATASET_LEGACY);
      return migrated;
    }

    if (isLegacyDataset(current)) {
      const migrated = migrateLegacy(current);
      await set(KEY_DATASET, migrated);
      return migrated;
    }

    return { ...EMPTY_DATASET };
  } catch {
    return { ...EMPTY_DATASET };
  }
}

export async function saveDataset(dataset: Dataset): Promise<void> {
  await set(KEY_DATASET, dataset);
}

export async function clearDataset(): Promise<void> {
  await del(KEY_DATASET);
  await del(KEY_DATASET_LEGACY);
}

export async function clearAllData(opts?: {
  preserveLastBackup?: boolean;
}): Promise<void> {
  await clearDataset();
  await clearRecurring();
  await clearSettings();
  await clearEdits();
  await clearAccounts();
  await clearManualTransactions();
  await clearBudgets();
  if (!opts?.preserveLastBackup) {
    await clearLastBackupAt();
  }
}

function mergeBudget(v: unknown): CategoryBudget | null {
  if (!v || typeof v !== "object") return null;
  const o = v as Partial<CategoryBudget>;
  if (typeof o.id !== "string" || typeof o.categoria !== "string") return null;
  if (typeof o.valorMensal !== "number" || o.valorMensal < 0) return null;
  const now = new Date().toISOString();
  return {
    id: o.id,
    categoria: o.categoria.trim(),
    valorMensal: o.valorMensal,
    ativa: o.ativa !== false,
    criadaEm: typeof o.criadaEm === "string" ? o.criadaEm : now,
    atualizadaEm: typeof o.atualizadaEm === "string" ? o.atualizadaEm : now,
  };
}

function mergeBudgets(v: unknown): CategoryBudget[] {
  if (!Array.isArray(v)) return [];
  const out: CategoryBudget[] = [];
  for (const item of v) {
    const b = mergeBudget(item);
    if (b) out.push(b);
  }
  return out;
}

export async function loadBudgets(): Promise<CategoryBudget[]> {
  try {
    const v = await get(KEY_BUDGETS);
    return mergeBudgets(v);
  } catch {
    return [];
  }
}

export async function saveBudgets(budgets: CategoryBudget[]): Promise<void> {
  await set(KEY_BUDGETS, budgets);
}

export async function clearBudgets(): Promise<void> {
  await del(KEY_BUDGETS);
}

export async function loadLastBackupAt(): Promise<string | null> {
  try {
    const v = await get(KEY_LAST_BACKUP);
    return typeof v === "string" ? v : null;
  } catch {
    return null;
  }
}

export async function saveLastBackupAt(iso: string): Promise<void> {
  await set(KEY_LAST_BACKUP, iso);
}

export async function clearLastBackupAt(): Promise<void> {
  await del(KEY_LAST_BACKUP);
}

function mergeAccount(v: unknown): Account | null {
  if (!v || typeof v !== "object") return null;
  const o = v as Partial<Account>;
  if (typeof o.id !== "string" || typeof o.nome !== "string") return null;
  const kind = o.kind;
  if (
    kind !== "cc" &&
    kind !== "poupanca" &&
    kind !== "carteira" &&
    kind !== "cartao"
  ) {
    return null;
  }
  return {
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
  };
}

function mergeAccounts(v: unknown): Account[] {
  if (!Array.isArray(v)) return [];
  const out: Account[] = [];
  for (const item of v) {
    const a = mergeAccount(item);
    if (a) out.push(a);
  }
  return out;
}

export async function loadAccounts(): Promise<Account[]> {
  try {
    const v = await get(KEY_ACCOUNTS);
    return mergeAccounts(v);
  } catch {
    return [];
  }
}

export async function saveAccounts(accounts: Account[]): Promise<void> {
  await set(KEY_ACCOUNTS, accounts);
}

export async function clearAccounts(): Promise<void> {
  await del(KEY_ACCOUNTS);
}

/** Migrate legacy settings into accounts if none exist; attach accountIds to dataset. */
export async function bootstrapAccounts(
  dataset: Dataset,
  settings: Settings,
): Promise<{ accounts: Account[]; dataset: Dataset }> {
  let accounts = await loadAccounts();
  let nextDataset = dataset;

  if (accounts.length === 0) {
    accounts = migrateAccountsFromLegacy(settings, dataset);
    if (accounts.length > 0) {
      await saveAccounts(accounts);
    }
  }

  const { dataset: attached, accounts: withCards } = attachAccountIdsToDataset(
    nextDataset,
    accounts,
  );
  accounts = withCards;

  if (JSON.stringify(attached) !== JSON.stringify(nextDataset)) {
    nextDataset = attached;
    await saveDataset(nextDataset);
  }

  if (withCards.length > (await loadAccounts()).length) {
    await saveAccounts(withCards);
  }

  return { accounts: withCards, dataset: nextDataset };
}

function mergeManualTransaction(v: unknown): ManualTransaction | null {
  if (!v || typeof v !== "object") return null;
  const o = v as Partial<ManualTransaction>;
  if (
    typeof o.id !== "string" ||
    typeof o.data !== "string" ||
    typeof o.lancamento !== "string" ||
    typeof o.valorOriginal !== "number" ||
    typeof o.sourceId !== "string"
  ) {
    return null;
  }
  return {
    id: o.id,
    data: o.data,
    lancamento: o.lancamento,
    categoria: typeof o.categoria === "string" ? o.categoria : "",
    tipo: typeof o.tipo === "string" ? o.tipo : "Avulso",
    valorOriginal: o.valorOriginal,
    fonte: "manual",
    sourceId: o.sourceId,
    ...(typeof o.accountId === "string" ? { accountId: o.accountId } : {}),
  };
}

export async function loadManualTransactions(): Promise<ManualTransaction[]> {
  try {
    const v = await get(KEY_MANUAL);
    if (!Array.isArray(v)) return [];
    const out: ManualTransaction[] = [];
    for (const item of v) {
      const t = mergeManualTransaction(item);
      if (t) out.push(t);
    }
    return out;
  } catch {
    return [];
  }
}

export async function saveManualTransactions(
  txs: ManualTransaction[],
): Promise<void> {
  await set(KEY_MANUAL, txs);
}

export async function clearManualTransactions(): Promise<void> {
  await del(KEY_MANUAL);
}

function mergeEdits(v: unknown): EditsState {
  if (!v || typeof v !== "object") return { ...EMPTY_EDITS };
  const o = v as Record<string, unknown>;
  const out: EditsState = {};
  for (const [key, val] of Object.entries(o)) {
    if (!val || typeof val !== "object") continue;
    const e = val as Partial<TransactionEdit>;
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

export async function loadEdits(): Promise<EditsState> {
  try {
    const v = await get(KEY_EDITS);
    return mergeEdits(v);
  } catch {
    return { ...EMPTY_EDITS };
  }
}

export async function saveEdits(edits: EditsState): Promise<void> {
  await set(KEY_EDITS, edits);
}

export async function clearEdits(): Promise<void> {
  await del(KEY_EDITS);
}

function mergeSettings(v: unknown): Settings {
  if (!v || typeof v !== "object") return { ...DEFAULT_SETTINGS };
  const o = v as Partial<Settings>;
  const cards = Array.isArray(o.cards)
    ? o.cards.filter(
        (c) =>
          c &&
          typeof c === "object" &&
          (c.fonte === "inter" || c.fonte === "nubank") &&
          typeof c.diaFechamento === "number" &&
          typeof c.diaPagamento === "number",
      )
    : [];
  const balanceAnchor =
    o.balanceAnchor &&
    typeof o.balanceAnchor === "object" &&
    typeof o.balanceAnchor.data === "string" &&
    typeof o.balanceAnchor.valor === "number"
      ? { data: o.balanceAnchor.data, valor: o.balanceAnchor.valor }
      : null;
  const horizon =
    typeof o.projectionHorizonDays === "number" && o.projectionHorizonDays > 0
      ? o.projectionHorizonDays
      : DEFAULT_SETTINGS.projectionHorizonDays;
  return { cards, balanceAnchor, projectionHorizonDays: horizon };
}

export async function loadSettings(): Promise<Settings> {
  try {
    const v = await get(KEY_SETTINGS);
    return mergeSettings(v);
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}

export async function saveSettings(settings: Settings): Promise<void> {
  await set(KEY_SETTINGS, settings);
}

export async function clearSettings(): Promise<void> {
  await del(KEY_SETTINGS);
}

export async function loadRules(): Promise<Rules> {
  try {
    const v = (await get(KEY_RULES)) as Rules | undefined;
    if (!v) return { ...DEFAULT_RULES };
    return {
      pagamentoPatterns: Array.isArray(v.pagamentoPatterns)
        ? v.pagamentoPatterns
        : DEFAULT_RULES.pagamentoPatterns,
      estornoPatterns: Array.isArray(v.estornoPatterns)
        ? v.estornoPatterns
        : DEFAULT_RULES.estornoPatterns,
    };
  } catch {
    return { ...DEFAULT_RULES };
  }
}

export async function saveRules(rules: Rules): Promise<void> {
  await set(KEY_RULES, rules);
}

export async function resetRules(): Promise<Rules> {
  await set(KEY_RULES, { ...DEFAULT_RULES });
  return { ...DEFAULT_RULES };
}

export async function loadRecurring(): Promise<RecurringRule[]> {
  try {
    const v = (await get(KEY_RECURRING)) as RecurringRule[] | undefined;
    return Array.isArray(v) ? v : [];
  } catch {
    return [];
  }
}

export async function saveRecurring(rules: RecurringRule[]): Promise<void> {
  await set(KEY_RECURRING, rules);
}

export async function clearRecurring(): Promise<void> {
  await del(KEY_RECURRING);
}
