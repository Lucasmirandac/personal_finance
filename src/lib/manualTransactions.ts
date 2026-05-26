import { newTransactionId } from "./ids";
import { ManualTransaction } from "./types";

export const MANUAL_SOURCE_ID = "manual:quick";

export function newManualTransaction(
  partial: Omit<ManualTransaction, "id" | "fonte" | "sourceId"> &
    Partial<Pick<ManualTransaction, "id">>,
): ManualTransaction {
  return {
    id: partial.id ?? newTransactionId(),
    fonte: "manual",
    sourceId: MANUAL_SOURCE_ID,
    data: partial.data,
    lancamento: partial.lancamento,
    categoria: partial.categoria,
    tipo: partial.tipo,
    valorOriginal: partial.valorOriginal,
    ...(partial.accountId ? { accountId: partial.accountId } : {}),
  };
}

export function isManualQuickRaw(raw: { sourceId: string; id: string }): boolean {
  return (
    raw.sourceId === MANUAL_SOURCE_ID ||
    raw.sourceId.startsWith("manual:quick")
  );
}
