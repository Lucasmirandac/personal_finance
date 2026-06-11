"use client";

import { TransactionEditModal } from "@/components/TransactionEditModal";
import { RecurringMonthSheet } from "@/components/transaction/RecurringMonthSheet";
import {
  allowsPerMonthRecurringEdit,
  canRevertTransaction,
  mergeRawWithAllEdits,
} from "@/lib/edits";
import { isManualQuickRaw } from "@/lib/manualTransactions";
import {
  EditsState,
  InstallmentGroupEditsState,
  PaymentStatusState,
  TransactionNormalized,
  TransactionRaw,
} from "@/lib/types";
import { TransactionEditPatch } from "@/lib/edits";

type Props = {
  editRow: TransactionNormalized | null;
  editOriginal: TransactionRaw | undefined;
  editCurrent: TransactionRaw | undefined;
  edits: EditsState;
  installmentGroupEdits: InstallmentGroupEditsState;
  paymentStatus?: PaymentStatusState;
  onSave: (rawId: string, patch: TransactionEditPatch) => void;
  onRevert: (rawId: string) => void;
  onHideMonth?: (rawId: string) => void;
  onPaymentToggle?: (rawId: string, status: "pago" | "a_pagar") => void;
  onClose: () => void;
};

export function TransactionEditHost({
  editRow,
  editOriginal,
  editCurrent,
  edits,
  installmentGroupEdits,
  paymentStatus = {},
  onSave,
  onRevert,
  onHideMonth,
  onPaymentToggle,
  onClose,
}: Readonly<Props>) {
  if (!editRow || !editOriginal || !editCurrent) return null;

  const canRevert =
    canRevertTransaction(editRow.id, edits, installmentGroupEdits, editOriginal) &&
    !isManualQuickRaw(editOriginal);

  if (allowsPerMonthRecurringEdit(editOriginal)) {
    return (
      <RecurringMonthSheet
        open
        original={editOriginal}
        current={editCurrent}
        tx={editRow}
        paymentStatus={paymentStatus}
        canRevert={canRevert}
        onSave={(patch) => onSave(editRow.id, patch)}
        onRevert={() => onRevert(editRow.id)}
        onHideMonth={onHideMonth ? () => onHideMonth(editRow.id) : undefined}
        onPaymentToggle={onPaymentToggle}
        onClose={onClose}
      />
    );
  }

  return (
    <TransactionEditModal
      open
      original={editOriginal}
      current={editCurrent}
      canRevert={canRevert}
      onSave={(patch) => onSave(editRow.id, patch)}
      onRevert={() => onRevert(editRow.id)}
      onClose={onClose}
    />
  );
}

export function resolveEditCurrent(
  editRow: TransactionNormalized | null,
  findOriginalRaw: (id: string) => TransactionRaw | undefined,
  edits: EditsState,
  installmentGroupEdits: InstallmentGroupEditsState,
): { original?: TransactionRaw; current?: TransactionRaw } {
  if (!editRow) return {};
  const original = findOriginalRaw(editRow.id);
  if (!original) return {};
  return {
    original,
    current: mergeRawWithAllEdits(original, edits, installmentGroupEdits),
  };
}

export function canEditTransaction(
  original: TransactionRaw | undefined,
): boolean {
  if (!original) return false;
  if (allowsPerMonthRecurringEdit(original)) return true;
  if (isManualQuickRaw(original)) return true;
  const recurring = original.sourceId.startsWith("manual:") &&
    original.sourceId !== "manual:quick" &&
    !original.sourceId.startsWith("manual:quick");
  return !recurring;
}
