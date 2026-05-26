import { get, set, del } from "idb-keyval";
import { Dataset, Rules, DEFAULT_RULES } from "./types";

const KEY_DATASET = "pf:dataset:v1";
const KEY_RULES = "pf:rules:v1";

export async function loadDataset(): Promise<Dataset | null> {
  try {
    const v = (await get(KEY_DATASET)) as Dataset | undefined;
    return v ?? null;
  } catch {
    return null;
  }
}

export async function saveDataset(dataset: Dataset): Promise<void> {
  await set(KEY_DATASET, dataset);
}

export async function clearDataset(): Promise<void> {
  await del(KEY_DATASET);
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
