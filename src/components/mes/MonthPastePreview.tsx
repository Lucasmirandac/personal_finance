"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { X } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { DrawerBackdrop } from "@/components/ui/Drawer";
import { Select } from "@/components/ui/Input";
import { Num } from "@/components/ui/Num";
import { useFocusTrap } from "@/lib/hooks/useFocusTrap";
import { ACCOUNT_KIND_LABELS } from "@/lib/accounts";
import { formatBRL, formatDateBR } from "@/lib/format";
import {
  formatInstallmentCell,
  isSheetRowReady,
  type ParsedSheetRow,
  type SheetKind,
} from "@/lib/monthGrid";
import type { Account } from "@/lib/types";

const KIND_LABEL: Record<SheetKind, string> = {
  fixo: "Fixo",
  parcela: "Parcela",
  corrente: "Gasto",
};

type Props = {
  open: boolean;
  initialRows: ParsedSheetRow[];
  accounts: Account[];
  onConfirm: (rows: ParsedSheetRow[]) => void;
  onClose: () => void;
};

export function MonthPastePreview({
  open,
  initialRows,
  accounts,
  onConfirm,
  onClose,
}: Props) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const [rows, setRows] = useState<ParsedSheetRow[]>(initialRows);

  useFocusTrap(open, dialogRef);

  useEffect(() => {
    if (open) setRows(initialRows);
  }, [open, initialRows]);

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  const activeAccounts = useMemo(
    () => accounts.filter((a) => a.ativa),
    [accounts],
  );
  const cardAccounts = useMemo(
    () => activeAccounts.filter((a) => a.kind === "cartao"),
    [activeAccounts],
  );
  const readyCount = rows.filter(isSheetRowReady).length;
  const missingAccount = rows.filter((r) =>
    r.issues.includes("unmapped_account"),
  ).length;

  if (!open) return null;

  function withAccount(
    row: ParsedSheetRow,
    accountId: string,
  ): ParsedSheetRow {
    const issues = row.issues.filter((i) => i !== "unmapped_account");
    return {
      ...row,
      accountId: accountId || null,
      issues: accountId ? issues : [...issues, "unmapped_account"],
    };
  }

  function setAccount(index: number, accountId: string) {
    setRows((prev) => {
      const next = [...prev];
      const row = next[index];
      if (!row) return prev;
      next[index] = withAccount(row, accountId);
      return next;
    });
  }

  function setAllToAccount(accountId: string) {
    setRows((prev) => prev.map((row) => withAccount(row, accountId)));
  }

  return (
    <>
      <DrawerBackdrop onClick={onClose} aria-hidden />
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="month-paste-title"
        className="fixed inset-0 z-50 flex items-center justify-center p-4"
      >
        <div className="flex max-h-[min(90dvh,40rem)] w-full max-w-3xl flex-col rounded-2xl bg-surface p-5 shadow-xl ring-1 ring-border/60">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2
                id="month-paste-title"
                className="text-sm font-semibold tracking-tight"
              >
                Conferir colagem
              </h2>
              <p className="mt-1 text-xs text-muted">
                {readyCount} lançamento{readyCount === 1 ? "" : "s"} pronto
                {readyCount === 1 ? "" : "s"}
                {missingAccount > 0
                  ? ` · ${missingAccount} sem conta`
                  : ""}
                . Totais e orçado × realizado ficam de fora.
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg p-1 text-muted hover:text-foreground"
              aria-label="Fechar"
            >
              <X size={16} />
            </button>
          </div>

          <p className="mt-3 rounded-lg bg-[var(--bg-warning-soft)] px-3 py-2 text-xs text-warning">
            Se o mesmo gasto também vier no CSV do Inter ou Nubank, entra duas
            vezes. Linhas iguais às que já estão neste mês são ignoradas.
            Parcelas seguintes entram nos meses à frente.
          </p>

          <div className="mt-3 min-h-0 flex-1 overflow-auto">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="text-left text-caption uppercase tracking-wide text-muted">
                  <th className="sticky top-0 bg-surface py-2 pr-2">Tipo</th>
                  <th className="sticky top-0 bg-surface py-2 pr-2">Descrição</th>
                  <th className="sticky top-0 bg-surface py-2 pr-2">Data</th>
                  <th className="sticky top-0 bg-surface py-2 pr-2">Conta</th>
                  <th className="sticky top-0 bg-surface py-2 pr-2 text-right">
                    Valor
                  </th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row, index) => (
                  <tr key={`${row.kind}-${row.descricao}-${index}`} className="border-t border-border">
                    <td className="py-2 pr-2 text-xs text-muted">
                      {KIND_LABEL[row.kind]}
                      {row.parcela
                        ? ` ${formatInstallmentCell(row.parcela)}`
                        : ""}
                    </td>
                    <td className="py-2 pr-2">
                      {row.descricao || (
                        <span className="text-muted">sem descrição</span>
                      )}
                    </td>
                    <td className="py-2 pr-2 tabular-nums">
                      {formatDateBR(row.dataIso)}
                      {row.dataUsedDefault ? (
                        <span className="ml-1 text-[10px] text-muted">hoje</span>
                      ) : null}
                    </td>
                    <td className="py-2 pr-2">
                      <Select
                        className="text-xs"
                        value={row.accountId ?? ""}
                        onChange={(e) => setAccount(index, e.target.value)}
                      >
                        <option value="">Escolher conta…</option>
                        {activeAccounts.map((a) => (
                          <option key={a.id} value={a.id}>
                            {a.nome} · {ACCOUNT_KIND_LABELS[a.kind]}
                          </option>
                        ))}
                      </Select>
                    </td>
                    <td className="py-2 text-right">
                      <Num>
                        {row.valor != null ? formatBRL(row.valor) : "—"}
                      </Num>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
            {cardAccounts.length > 0 ? (
              <div className="flex flex-wrap gap-1.5">
                {cardAccounts.map((card) => (
                  <Button
                    key={card.id}
                    size="sm"
                    onClick={() => setAllToAccount(card.id)}
                  >
                    Todos para{" "}
                    {cardAccounts.length === 1 ? "cartão" : card.nome}
                  </Button>
                ))}
              </div>
            ) : (
              <span />
            )}
            <div className="flex justify-end gap-2">
              <Button onClick={onClose}>Cancelar</Button>
              <Button
                variant="primary"
                disabled={readyCount === 0}
                onClick={() => onConfirm(rows)}
              >
                Lançar {readyCount}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
