"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Copy, Download, X } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { DrawerBackdrop } from "@/components/ui/Drawer";
import { useFocusTrap } from "@/lib/hooks/useFocusTrap";
import {
  AI_EXPENSE_EXPORT_INSTRUCTIONS,
  buildAiExpenseExport,
  downloadAiExpenseExport,
} from "@/lib/aiExpenseExport";
import { formatDateBR, formatInt } from "@/lib/format";
import type { Account, CategoryBudget, TransactionNormalized } from "@/lib/types";

function formatPeriodLabel(label: string): string {
  return label.replace(/\d{4}-\d{2}-\d{2}/g, (iso) => formatDateBR(iso));
}

type Props = {
  open: boolean;
  onClose: () => void;
  transactions: TransactionNormalized[];
  budgets: CategoryBudget[];
  accounts: Account[];
  filtersActive: boolean;
  dateFrom: string | null;
  dateTo: string | null;
  windowCaption: string | null;
};

export function AiExpenseExportModal({
  open,
  onClose,
  transactions,
  budgets,
  accounts,
  filtersActive,
  dateFrom,
  dateTo,
  windowCaption,
}: Readonly<Props>) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [copied, setCopied] = useState(false);
  const [copyError, setCopyError] = useState<string | null>(null);

  useFocusTrap(open, dialogRef);

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    globalThis.addEventListener("keydown", onKey);
    return () => globalThis.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  useEffect(() => {
    if (!open) {
      setCopied(false);
      setCopyError(null);
    }
  }, [open]);

  const exported = useMemo(
    () =>
      buildAiExpenseExport({
        transactions,
        budgets,
        accounts,
        filtersActive,
        dateFrom,
        dateTo,
      }),
    [transactions, budgets, accounts, filtersActive, dateFrom, dateTo],
  );

  const canDownload = exported.realizedCount > 0;
  const periodText = formatPeriodLabel(windowCaption ?? exported.periodLabel);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(AI_EXPENSE_EXPORT_INSTRUCTIONS);
      setCopied(true);
      setCopyError(null);
    } catch {
      setCopied(false);
      setCopyError("Não foi possível copiar. Selecione e copie manualmente.");
    }
  }

  function handleDownload() {
    if (!canDownload) return;
    downloadAiExpenseExport(exported.markdown, exported.filename);
  }

  if (!open) return null;

  return (
    <>
      <DrawerBackdrop onClick={onClose} aria-hidden />
      <dialog
        ref={dialogRef}
        open
        aria-labelledby="ai-expense-export-title"
        className="fixed inset-0 z-50 m-0 flex h-full w-full max-w-none items-center justify-center bg-transparent p-4 text-foreground"
      >
        <div className="w-full max-w-md rounded-2xl bg-surface p-5 shadow-xl ring-1 ring-border/60">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-caption uppercase tracking-wider text-muted">
                Análise
              </p>
              <h2
                id="ai-expense-export-title"
                className="mt-1 text-lg font-semibold tracking-tight"
              >
                Exportar gastos para IA
              </h2>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg p-1 text-muted hover:text-foreground"
              aria-label="Fechar"
            >
              <X className="size-4" />
            </button>
          </div>

          {canDownload ? (
            <>
              <p className="mt-3 text-sm text-foreground leading-relaxed">
                {formatInt(exported.realizedCount)} gasto
                {exported.realizedCount === 1 ? "" : "s"} realizado
                {exported.realizedCount === 1 ? "" : "s"}
                {periodText && periodText !== "sem lançamentos" ? (
                  <> · {periodText}</>
                ) : null}
              </p>
              <p className="mt-3 text-sm text-muted leading-relaxed">
                O arquivo nasce neste navegador. O Saldo Real não envia esses
                dados.
              </p>
              <p className="mt-2 text-sm text-muted leading-relaxed">
                Se você anexar o arquivo num chat, o provedor dessa IA passa a
                ver descrições e valores do extrato.
              </p>
              <p className="mt-3 rounded-2xl bg-surface-2/70 p-3 text-xs text-muted leading-relaxed">
                {AI_EXPENSE_EXPORT_INSTRUCTIONS}
              </p>
            </>
          ) : (
            <p className="mt-3 text-sm text-muted leading-relaxed">
              Não há gasto realizado neste recorte. Ajuste os filtros da Análise
              ou lance um gasto para gerar o arquivo.
            </p>
          )}

          {copied && (
            <p className="mt-3 text-xs text-success">
              Instruções copiadas para a área de transferência.
            </p>
          )}
          {copyError && (
            <p className="mt-3 text-xs text-danger">{copyError}</p>
          )}

          <div className="mt-5 flex flex-wrap justify-end gap-2">
            <Button variant="ghost" size="sm" onClick={onClose}>
              Fechar
            </Button>
            {canDownload && (
              <>
                <Button size="sm" className="rounded-full" onClick={handleCopy}>
                  <Copy size={13} />
                  Copiar instruções
                </Button>
                <Button
                  variant="primary"
                  size="sm"
                  className="rounded-full"
                  onClick={handleDownload}
                >
                  <Download size={13} />
                  Baixar arquivo
                </Button>
              </>
            )}
          </div>
        </div>
      </dialog>
    </>
  );
}
