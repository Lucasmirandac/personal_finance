"use client";

import { useRouter } from "next/navigation";
import { useCallback, useState } from "react";
import {
  resolveEditCurrent,
  TransactionEditHost,
} from "@/components/transaction/TransactionEditHost";
import {
  isEditableCashEvent,
  isFaturaCashEvent,
  resolveTransactionFromCashEvent,
} from "@/lib/cashEventActions";
import { CashEvent } from "@/lib/projection";
import { TransactionNormalized } from "@/lib/types";
import { useAppStore } from "@/lib/store";

export function useCashEventEditor() {
  const router = useRouter();
  const {
    normalized,
    edits,
    installmentGroupEdits,
    paymentStatus,
    findOriginalRaw,
    editTransaction,
    revertTransaction,
    deleteTransaction,
    setPaymentStatus,
  } = useAppStore();
  const [editRow, setEditRow] = useState<TransactionNormalized | null>(null);
  const [missingMessage, setMissingMessage] = useState<string | null>(null);

  const handleEventClick = useCallback(
    (event: CashEvent) => {
      if (isFaturaCashEvent(event)) {
        router.push("/faturas");
        return;
      }
      if (!isEditableCashEvent(event)) return;
      const tx = resolveTransactionFromCashEvent(event, normalized);
      if (!tx) {
        setMissingMessage("Esta cobrança não está mais ativa.");
        return;
      }
      setMissingMessage(null);
      setEditRow(tx);
    },
    [normalized, router],
  );

  const { original: editOriginal, current: editCurrent } = resolveEditCurrent(
    editRow,
    findOriginalRaw,
    edits,
    installmentGroupEdits,
  );

  const editor = (
    <>
      {missingMessage && (
        <p className="rounded-2xl border border-border bg-surface-2/70 px-4 py-3 text-sm text-muted">
          {missingMessage}
        </p>
      )}
      {editRow && (
        <TransactionEditHost
          editRow={editRow}
          editOriginal={editOriginal}
          editCurrent={editCurrent}
          edits={edits}
          installmentGroupEdits={installmentGroupEdits}
          paymentStatus={paymentStatus}
          onSave={(id, patch) => editTransaction(id, patch)}
          onRevert={revertTransaction}
          onHideMonth={deleteTransaction}
          onPaymentToggle={(id, status) => void setPaymentStatus(id, status)}
          onClose={() => setEditRow(null)}
        />
      )}
    </>
  );

  return { handleEventClick, editor };
}
