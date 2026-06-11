import { isoFromParts } from "./dates";
import { isRecurringRaw } from "./edits";
import { isManualQuickRaw } from "./manualTransactions";
import { isForecastTransaction } from "./recurring";
import {
  PaymentStatus,
  PaymentStatusState,
  TransactionNormalized,
} from "./types";

export type DerivedPaymentState =
  | "pago"
  | "a_pagar"
  | "vencida"
  | "a_confirmar"
  | "previsto"
  | "none";

export type PaymentFilter = "all" | "pending" | "paid";

function todayIsoFromDate(today: Date): string {
  return isoFromParts(
    today.getUTCFullYear(),
    today.getUTCMonth() + 1,
    today.getUTCDate(),
  );
}

export function isPayablePlanned(
  tx: Pick<
    TransactionNormalized,
    "id" | "sourceId" | "tipo" | "tipoFluxo" | "valorOriginal"
  >,
): boolean {
  if (isRecurringRaw(tx) && tx.tipo === "Despesa fixa") return true;
  if (isManualQuickRaw(tx) && tx.tipoFluxo === "saida") return true;
  return false;
}

export function derivePaymentState(
  tx: Pick<
    TransactionNormalized,
    "id" | "dataISO" | "sourceId" | "tipo" | "tipoFluxo" | "valorOriginal" | "installment"
  >,
  statusState: PaymentStatusState,
  today: Date = new Date(),
): DerivedPaymentState {
  if (!isPayablePlanned(tx)) return "none";

  const entry = statusState[tx.id];
  if (entry?.status === "pago") return "pago";

  const todayIso = todayIsoFromDate(today);
  const { dataISO } = tx;

  if (entry?.status === "a_pagar") {
    if (dataISO < todayIso) return "vencida";
    return "a_pagar";
  }

  if (isForecastTransaction(tx, today)) return "previsto";

  const currentMonth = todayIso.slice(0, 7);
  const txMonth = dataISO.slice(0, 7);
  if (txMonth === currentMonth && dataISO <= todayIso) {
    return "a_confirmar";
  }

  return "none";
}

export function isPendingPaymentState(state: DerivedPaymentState): boolean {
  return state === "a_pagar" || state === "vencida" || state === "a_confirmar";
}

export function matchesPaymentFilter(
  state: DerivedPaymentState,
  filter: PaymentFilter,
): boolean {
  if (filter === "all") return true;
  if (filter === "paid") return state === "pago";
  return isPendingPaymentState(state);
}

export function nextPaymentStatus(
  state: DerivedPaymentState,
): PaymentStatus {
  return state === "pago" ? "a_pagar" : "pago";
}

export type PaymentMonthSummary = {
  pendingCount: number;
  pendingTotal: number;
  paidCount: number;
};

export function summarizePaymentMonth(
  transactions: TransactionNormalized[],
  statusState: PaymentStatusState,
  today: Date = new Date(),
): PaymentMonthSummary {
  let pendingCount = 0;
  let pendingTotal = 0;
  let paidCount = 0;

  for (const tx of transactions) {
    if (!isPayablePlanned(tx)) continue;
    const state = derivePaymentState(tx, statusState, today);
    if (state === "pago") {
      paidCount += 1;
      continue;
    }
    if (isPendingPaymentState(state)) {
      pendingCount += 1;
      pendingTotal += Math.abs(tx.valorFluxo);
    }
  }

  return { pendingCount, pendingTotal, paidCount };
}

export function mergePaymentStatus(
  current: PaymentStatusState,
  incoming: PaymentStatusState,
): PaymentStatusState {
  const merged = { ...current };
  for (const [key, incomingEntry] of Object.entries(incoming)) {
    const existing = merged[key];
    if (!existing || incomingEntry.updatedAt > existing.updatedAt) {
      merged[key] = incomingEntry;
    }
  }
  return merged;
}
