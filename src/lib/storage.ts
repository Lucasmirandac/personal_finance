import { get, set, del } from "idb-keyval";
import {
  Dataset,
  EMPTY_DATASET,
  LegacyDataset,
  RecurringRule,
  Rules,
  DEFAULT_RULES,
  Source,
  TransactionRaw,
} from "./types";

const KEY_DATASET = "pf:dataset:v2";
const KEY_DATASET_LEGACY = "pf:dataset:v1";
const KEY_RULES = "pf:rules:v1";
const KEY_RECURRING = "pf:recurring:v1";

function newSourceId(): string {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return `src-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

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

function migrateLegacy(legacy: LegacyDataset): Dataset {
  const sourceId = newSourceId();
  const raw: TransactionRaw[] = legacy.raw.map((r) => ({
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
    if (isDataset(current)) return current;

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

export async function clearAllData(): Promise<void> {
  await clearDataset();
  await clearRecurring();
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
