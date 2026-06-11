import { CashEvent } from "./projection";
import { TransactionNormalized } from "./types";

export function resolveTransactionFromCashEvent(
  event: CashEvent,
  normalized: TransactionNormalized[],
): TransactionNormalized | null {
  if (!event.source) return null;
  if (event.source.kind === "recurring" || event.source.kind === "manual") {
    const rawId = event.source.rawId;
    return normalized.find((tx) => tx.id === rawId) ?? null;
  }
  return null;
}

export function isEditableCashEvent(event: CashEvent): boolean {
  return (
    event.source?.kind === "recurring" || event.source?.kind === "manual"
  );
}

export function isFaturaCashEvent(event: CashEvent): boolean {
  return event.source?.kind === "fatura";
}
