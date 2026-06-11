"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { isoToBr, parseBrDate, parseIsoDate } from "@/lib/csv";
import { useFocusTrap } from "@/lib/hooks/useFocusTrap";
import {
  isRecurringExpenseRaw,
  isRecurringIncomeRaw,
  TransactionEditPatch,
} from "@/lib/edits";
import { formatMonthLabel } from "@/lib/format";
import { g } from "@/lib/glossary";
import { derivePaymentState, isPayablePlanned } from "@/lib/paymentStatus";
import { PaymentStatusState, TransactionNormalized, TransactionRaw } from "@/lib/types";
import { PaymentStatusToggle } from "@/components/transaction/PaymentStatusControls";
import { Button } from "@/components/ui/Button";
import { DrawerBackdrop } from "@/components/ui/Drawer";
import { Input } from "@/components/ui/Input";
import { LabelWithInfo } from "@/components/ui/LabelWithInfo";
import { MoneyInput } from "@/components/ui/MoneyInput";
import { X } from "lucide-react";

type Props = {
  open: boolean;
  original: TransactionRaw;
  current: TransactionRaw;
  tx?: TransactionNormalized;
  paymentStatus?: PaymentStatusState;
  canRevert: boolean;
  onSave: (patch: TransactionEditPatch) => void;
  onRevert: () => void;
  onHideMonth?: () => void;
  onPaymentToggle?: (rawId: string, status: "pago" | "a_pagar") => void;
  onClose: () => void;
};

function toDateInputValue(data: string): string {
  const iso = parseBrDate(data) ?? parseIsoDate(data);
  return iso ?? "";
}

function fromDateInputValue(iso: string): string {
  if (!iso) return "";
  return isoToBr(iso);
}

function monthLabelFromRaw(raw: TransactionRaw): string {
  const iso = parseBrDate(raw.data) ?? parseIsoDate(raw.data);
  if (!iso) return "";
  return formatMonthLabel(iso.slice(0, 7));
}

export function RecurringMonthSheet({
  open,
  original,
  current,
  tx,
  paymentStatus = {},
  canRevert,
  onSave,
  onRevert,
  onHideMonth,
  onPaymentToggle,
  onClose,
}: Props) {
  const isIncome = isRecurringIncomeRaw(original);
  const dialogRef = useRef<HTMLDivElement>(null);
  const [dataIso, setDataIso] = useState("");
  const [valorStr, setValorStr] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setDataIso(toDateInputValue(current.data));
    setValorStr(String(Math.abs(current.valorOriginal)));
    setError(null);
  }, [open, current]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  useFocusTrap(open, dialogRef);

  if (!open) return null;

  const monthLabel = monthLabelFromRaw(current);
  const showPayment = tx && isPayablePlanned(tx) && onPaymentToggle;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!dataIso) {
      setError("Informe uma data válida.");
      return;
    }
    const data = fromDateInputValue(dataIso);
    if (!parseBrDate(data)) {
      setError("Data inválida.");
      return;
    }
    const valor = Number(valorStr.replace(",", "."));
    if (Number.isNaN(valor) || valor <= 0) {
      setError("Valor inválido.");
      return;
    }
    const storedValor = isIncome ? -Math.abs(valor) : Math.abs(valor);
    const originalValor = isIncome
      ? -Math.abs(original.valorOriginal)
      : Math.abs(original.valorOriginal);

    const patch: TransactionEditPatch = {};
    if (data !== original.data) patch.data = data;
    if (storedValor !== originalValor) patch.valorOriginal = storedValor;

    if (Object.keys(patch).length === 0) {
      onClose();
      return;
    }
    onSave(patch);
    onClose();
  };

  return (
    <DrawerBackdrop
      className="flex items-end sm:items-center justify-center"
      role="presentation"
      onClick={onClose}
    >
      <div
        ref={dialogRef}
        className="bg-surface border border-border rounded-t-3xl sm:rounded-3xl w-full max-w-md mx-auto sm:mx-4 p-4 space-y-4 max-h-[90vh] overflow-y-auto"
        role="dialog"
        aria-modal="true"
        aria-labelledby="recurring-month-title"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-2">
          <div>
            <h2
              id="recurring-month-title"
              className="text-base font-semibold tracking-tight"
            >
              {current.lancamento}
              {monthLabel ? ` · ${monthLabel}` : ""}
            </h2>
            <p className="text-xs text-muted mt-1">{g("ajusteMensalRecorrente")}</p>
          </div>
          <Button variant="ghost" size="sm" onClick={onClose} aria-label="Fechar">
            <X size={14} />
          </Button>
        </div>

        <div className="rounded-2xl bg-surface-2/70 px-3 py-2 text-xs text-muted space-y-0.5">
          <p>{current.categoria || "Sem categoria"} · {current.tipo}</p>
          <Link
            href="/recorrentes"
            className="inline-block text-accent hover:underline"
            onClick={onClose}
          >
            Editar regra completa
          </Link>
        </div>

        {showPayment && (
          <div className="flex items-center justify-between rounded-2xl border border-border/70 px-3 py-2">
            <LabelWithInfo
              labelClassName="text-xs text-muted"
              info={g("aConfirmar")}
              ariaTopic="Status de pagamento"
            >
              Status de pagamento
            </LabelWithInfo>
            <PaymentStatusToggle
              tx={tx}
              paymentStatus={paymentStatus}
              onToggle={onPaymentToggle}
            />
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-3">
          <label className="block space-y-1">
            <span className="text-xs text-muted">Data deste mês</span>
            <Input
              type="date"
              value={dataIso}
              onChange={(e) => setDataIso(e.target.value)}
              required
            />
          </label>
          <label className="block space-y-1">
            <span className="text-xs text-muted">Valor deste mês (R$)</span>
            <MoneyInput value={valorStr} onChange={setValorStr} required />
          </label>

          {error && <p className="text-xs text-danger">{error}</p>}

          <div className="flex flex-wrap gap-2 pt-1">
            <Button type="submit" variant="primary" size="sm">
              Salvar
            </Button>
            <Button size="sm" type="button" onClick={onClose}>
              Cancelar
            </Button>
            {canRevert && (
              <Button
                variant="ghost"
                size="sm"
                type="button"
                onClick={() => {
                  onRevert();
                  onClose();
                }}
              >
                Reverter ajustes
              </Button>
            )}
            {onHideMonth && (isRecurringExpenseRaw(original) || isIncome) && (
              <Button
                variant="ghost"
                size="sm"
                type="button"
                className="text-danger"
                onClick={() => {
                  onHideMonth();
                  onClose();
                }}
              >
                Ocultar deste mês
              </Button>
            )}
          </div>
        </form>
      </div>
    </DrawerBackdrop>
  );
}
