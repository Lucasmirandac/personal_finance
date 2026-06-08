"use client";

import { useEffect, useRef, useState } from "react";
import { isoToBr, parseBrDate, parseIsoDate } from "@/lib/csv";
import { useFocusTrap } from "@/lib/hooks/useFocusTrap";
import { TransactionEditPatch } from "@/lib/edits";
import { TransactionRaw } from "@/lib/types";
import { Button } from "@/components/ui/Button";
import { DrawerBackdrop } from "@/components/ui/Drawer";
import { Input } from "@/components/ui/Input";
import { MoneyInput } from "@/components/ui/MoneyInput";
import { X } from "lucide-react";

type Props = {
  open: boolean;
  original: TransactionRaw;
  current: TransactionRaw;
  canRevert: boolean;
  mode?: "default" | "recurring_income";
  onSave: (patch: TransactionEditPatch) => void;
  onRevert: () => void;
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

export function TransactionEditModal({
  open,
  original,
  current,
  canRevert,
  mode = "default",
  onSave,
  onRevert,
  onClose,
}: Props) {
  const isRecurringIncome = mode === "recurring_income";
  const dialogRef = useRef<HTMLDivElement>(null);
  const [dataIso, setDataIso] = useState("");
  const [lancamento, setLancamento] = useState("");
  const [categoria, setCategoria] = useState("");
  const [tipo, setTipo] = useState("");
  const [valorStr, setValorStr] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setDataIso(toDateInputValue(current.data));
    setLancamento(current.lancamento);
    setCategoria(current.categoria);
    setTipo(current.tipo);
    setValorStr(
      mode === "recurring_income"
        ? String(Math.abs(current.valorOriginal))
        : String(current.valorOriginal),
    );
    setError(null);
  }, [open, current, mode]);

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
    if (!isRecurringIncome && !lancamento.trim()) {
      setError("Informe o lançamento.");
      return;
    }
    const valor = Number(valorStr.replace(",", "."));
    if (Number.isNaN(valor)) {
      setError("Valor inválido.");
      return;
    }
    const storedValor = isRecurringIncome ? -Math.abs(valor) : valor;
    const originalValor = isRecurringIncome
      ? -Math.abs(original.valorOriginal)
      : original.valorOriginal;

    const patch: TransactionEditPatch = {};
    if (data !== original.data) patch.data = data;
    if (!isRecurringIncome && lancamento.trim() !== original.lancamento) {
      patch.lancamento = lancamento.trim();
    }
    if (!isRecurringIncome && categoria.trim() !== original.categoria) {
      patch.categoria = categoria.trim();
    }
    if (!isRecurringIncome && tipo.trim() !== original.tipo) patch.tipo = tipo.trim();
    if (storedValor !== originalValor) patch.valorOriginal = storedValor;

    if (isRecurringIncome) {
      const recurringPatch: TransactionEditPatch = {};
      if (patch.data !== undefined) recurringPatch.data = patch.data;
      if (patch.valorOriginal !== undefined) {
        recurringPatch.valorOriginal = patch.valorOriginal;
      }
      if (Object.keys(recurringPatch).length === 0) {
        onClose();
        return;
      }
      onSave(recurringPatch);
      onClose();
      return;
    }

    if (Object.keys(patch).length === 0) {
      onClose();
      return;
    }

    onSave(patch);
    onClose();
  };

  return (
    <DrawerBackdrop
      className="flex items-center justify-center"
      role="presentation"
      onClick={onClose}
    >
      <div
        ref={dialogRef}
        className="bg-surface border border-border rounded-lg w-full max-w-md mx-4 p-4 space-y-4"
        role="dialog"
        aria-modal="true"
        aria-labelledby="edit-tx-title"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-2">
          <div>
            <h2
              id="edit-tx-title"
              className="text-caption font-semibold tracking-wider uppercase text-muted"
            >
              {isRecurringIncome ? "Ajustar receita do mês" : "Editar transação"}
            </h2>
            <p className="text-xs text-muted mt-0.5">
              {isRecurringIncome
                ? "Ajuste vale só para este mês. A regra em Recorrentes continua como padrão."
                : "Alterações não modificam o CSV original."}
            </p>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            aria-label="Fechar"
          >
            <X size={14} />
          </Button>
        </div>

        {current.installment && (
          <div className="rounded-md border border-border bg-surface-2 px-3 py-2 text-xs text-muted">
            Esta é uma compra parcelada ({current.installment.current}/
            {current.installment.total}). As alterações em Lançamento, Categoria,
            Tipo e Valor serão aplicadas a todas as {current.installment.total}{" "}
            parcelas. A Data continua individual desta parcela.
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-3">
          <label className="block space-y-1">
            <span className="text-xs text-muted">Data</span>
            <Input
              type="date"
              value={dataIso}
              onChange={(e) => setDataIso(e.target.value)}
              required
            />
          </label>
          {!isRecurringIncome && (
            <>
          <label className="block space-y-1">
            <span className="text-xs text-muted">Lançamento</span>
            <Input
              type="text"
              value={lancamento}
              onChange={(e) => setLancamento(e.target.value)}
              required
            />
          </label>
          <label className="block space-y-1">
            <span className="text-xs text-muted">Categoria</span>
            <Input
              type="text"
              value={categoria}
              onChange={(e) => setCategoria(e.target.value)}
            />
          </label>
          <label className="block space-y-1">
            <span className="text-xs text-muted">Tipo</span>
            <Input
              type="text"
              value={tipo}
              onChange={(e) => setTipo(e.target.value)}
            />
          </label>
            </>
          )}
          <label className="block space-y-1">
            <span className="text-xs text-muted">
              {isRecurringIncome ? "Valor deste mês (R$)" : "Valor original (R$)"}
            </span>
            <MoneyInput
              value={valorStr}
              onChange={setValorStr}
              required
            />
          </label>

          {error && <p className="text-xs text-danger">{error}</p>}

          <div className="flex flex-wrap gap-2 pt-1">
            <Button type="submit" variant="primary" size="sm">
              Salvar
            </Button>
            <Button size="sm" onClick={onClose}>
              Cancelar
            </Button>
            {canRevert && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  onRevert();
                  onClose();
                }}
              >
                Reverter para original
              </Button>
            )}
          </div>
        </form>
      </div>
    </DrawerBackdrop>
  );
}
