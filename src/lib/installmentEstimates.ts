import { Dataset, TransactionRaw } from "./types";

export function installmentSlotKey(groupKey: string, current: number): string {
  return `${groupKey}|${current}`;
}

export function collectInstallmentSlotKeys(raw: TransactionRaw[]): Set<string> {
  const keys = new Set<string>();
  for (const row of raw) {
    if (!row.installment) continue;
    keys.add(
      installmentSlotKey(row.installment.groupKey, row.installment.current),
    );
  }
  return keys;
}

export function removeStaleEstimatedInstallments(
  dataset: Dataset,
  incomingRaw: TransactionRaw[],
): { dataset: Dataset; removedRawIds: string[] } {
  const incomingKeys = collectInstallmentSlotKeys(incomingRaw);
  if (incomingKeys.size === 0) {
    return { dataset, removedRawIds: [] };
  }

  const removedRawIds: string[] = [];
  const sources = dataset.sources.map((source) => {
    const filtered = source.raw.filter((row) => {
      if (!row.installment?.estimated) return true;
      const key = installmentSlotKey(
        row.installment.groupKey,
        row.installment.current,
      );
      if (!incomingKeys.has(key)) return true;
      removedRawIds.push(row.id);
      return false;
    });
    if (filtered.length === source.raw.length) return source;
    return { ...source, raw: filtered, rowsRaw: filtered.length };
  });

  return { dataset: { sources }, removedRawIds };
}
