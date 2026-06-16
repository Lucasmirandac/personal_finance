import { Dataset, TransactionRaw } from "./types";

export function installmentSlotKey(groupKey: string, current: number): string {
  return `${groupKey}|${current}`;
}

/** Tolerant slot key: ignores merchant text drift and cent-level value differences. */
export function buildLooseInstallmentSlotKey(
  raw: Pick<TransactionRaw, "fonte" | "categoria">,
  purchaseDate: string,
  current: number,
  total: number,
): string {
  const categoria = raw.categoria.trim().toLowerCase();
  return `${raw.fonte}|${purchaseDate.trim()}|${categoria}|${total}|${current}`;
}

export function looseInstallmentSlotKeyFromRow(
  row: TransactionRaw,
): string | null {
  if (!row.installment) return null;
  return buildLooseInstallmentSlotKey(
    row,
    row.installment.purchaseDate,
    row.installment.current,
    row.installment.total,
  );
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

export function collectLooseInstallmentSlotKeys(
  raw: TransactionRaw[],
): Set<string> {
  const keys = new Set<string>();
  for (const row of raw) {
    const key = looseInstallmentSlotKeyFromRow(row);
    if (key) keys.add(key);
  }
  return keys;
}

function plainRowFingerprint(row: TransactionRaw): string {
  return [
    row.fonte,
    row.data.trim(),
    row.lancamento.trim().toLowerCase(),
    row.categoria.trim().toLowerCase(),
    row.tipo.trim().toLowerCase(),
    row.valorOriginal,
  ].join("|");
}

export function filterDuplicateIncomingRows(
  dataset: Dataset,
  incomingRaw: TransactionRaw[],
): { raw: TransactionRaw[]; skippedRawIds: string[] } {
  const existingLooseSlots = new Set<string>();
  const existingRealLooseSlots = new Set<string>();
  const existingPlain = new Set<string>();

  for (const source of dataset.sources) {
    for (const row of source.raw) {
      const loose = looseInstallmentSlotKeyFromRow(row);
      if (loose) {
        existingLooseSlots.add(loose);
        if (!row.installment?.estimated) {
          existingRealLooseSlots.add(loose);
        }
      } else {
        existingPlain.add(plainRowFingerprint(row));
      }
    }
  }

  const seenLoose = new Set<string>();
  const seenRealLoose = new Set<string>();
  const seenPlain = new Set<string>();
  const skippedRawIds: string[] = [];
  const raw: TransactionRaw[] = [];

  for (const row of incomingRaw) {
    const loose = looseInstallmentSlotKeyFromRow(row);
    if (loose) {
      if (row.installment?.estimated) {
        if (existingLooseSlots.has(loose) || seenLoose.has(loose)) {
          skippedRawIds.push(row.id);
          continue;
        }
        seenLoose.add(loose);
        raw.push(row);
        continue;
      }

      if (existingRealLooseSlots.has(loose) || seenRealLoose.has(loose)) {
        skippedRawIds.push(row.id);
        continue;
      }
      seenRealLoose.add(loose);
      seenLoose.add(loose);
      raw.push(row);
      continue;
    }

    const fingerprint = plainRowFingerprint(row);
    if (existingPlain.has(fingerprint) || seenPlain.has(fingerprint)) {
      skippedRawIds.push(row.id);
      continue;
    }
    seenPlain.add(fingerprint);
    raw.push(row);
  }

  return { raw, skippedRawIds };
}

export function removeStaleEstimatedInstallments(
  dataset: Dataset,
  incomingRaw: TransactionRaw[],
): { dataset: Dataset; removedRawIds: string[] } {
  const incomingStrictKeys = collectInstallmentSlotKeys(incomingRaw);
  const incomingLooseKeys = collectLooseInstallmentSlotKeys(incomingRaw);
  if (incomingStrictKeys.size === 0 && incomingLooseKeys.size === 0) {
    return { dataset, removedRawIds: [] };
  }

  const removedRawIds: string[] = [];
  const sources = dataset.sources.map((source) => {
    const filtered = source.raw.filter((row) => {
      if (!row.installment?.estimated) return true;
      const strictKey = installmentSlotKey(
        row.installment.groupKey,
        row.installment.current,
      );
      const looseKey = looseInstallmentSlotKeyFromRow(row);
      const replaced =
        incomingStrictKeys.has(strictKey) ||
        (looseKey != null && incomingLooseKeys.has(looseKey));
      if (!replaced) return true;
      removedRawIds.push(row.id);
      return false;
    });
    if (filtered.length === source.raw.length) return source;
    return { ...source, raw: filtered, rowsRaw: filtered.length };
  });

  return { dataset: { sources }, removedRawIds };
}
