"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import clsx from "clsx";
import { isoToBr } from "@/lib/csv";
import { useFocusTrap } from "@/lib/hooks/useFocusTrap";
import { useAppStore } from "@/lib/store";
import { Account, TransactionNormalized } from "@/lib/types";
import { formatBRL } from "@/lib/format";
import { Button } from "@/components/ui/Button";
import { DrawerBackdrop } from "@/components/ui/Drawer";
import { Input } from "@/components/ui/Input";
import { Num } from "@/components/ui/Num";
import { X } from "lucide-react";

type Props = {
  open: boolean;
  onClose: () => void;
};

type AdjustMode = "ajuste" | "saldo_inicial";

function projectedBalanceForAccount(
  account: Account,
  normalized: TransactionNormalized[],
): number {
  let balance = account.saldoInicial;
  const ref = account.dataReferencia;
  for (const tx of normalized) {
    if (tx.accountId && tx.accountId !== account.id) continue;
    if (!tx.accountId && account.kind !== "cartao") {
      // CSV rows without accountId affect aggregate only — skip per-account
      continue;
    }
    if (tx.dataISO < ref) continue;
    if (tx.tipoFluxo === "saida") balance -= tx.valorFluxo;
    else if (tx.tipoFluxo === "entrada") balance += tx.valorFluxo;
  }
  return Math.round(balance * 100) / 100;
}

export function AdjustBalanceModal({ open, onClose }: Props) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const {
    accounts,
    normalized,
    addManualTransaction,
    updateAccount,
  } = useAppStore();

  const cashAccounts = useMemo(
    () => accounts.filter((a) => a.ativa && a.kind !== "cartao"),
    [accounts],
  );

  const [values, setValues] = useState<Record<string, string>>({});
  const [mode, setMode] = useState<AdjustMode>("ajuste");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const previews = useMemo(() => {
    const out: Record<string, { projected: number; actual: number | null; delta: number | null }> = {};
    for (const a of cashAccounts) {
      const projected = projectedBalanceForAccount(a, normalized);
      const raw = values[a.id]?.trim();
      const actual =
        raw !== undefined && raw !== ""
          ? parseFloat(raw.replace(",", "."))
          : null;
      out[a.id] = {
        projected,
        actual: actual !== null && !Number.isNaN(actual) ? actual : null,
        delta:
          actual !== null && !Number.isNaN(actual)
            ? Math.round((actual - projected) * 100) / 100
            : null,
      };
    }
    return out;
  }, [cashAccounts, normalized, values]);

  useEffect(() => {
    if (!open) return;
    setValues({});
    setMode("ajuste");
    setError(null);
  }, [open]);

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

  async function handleSave() {
    setError(null);
    const today = new Date().toISOString().slice(0, 10);
    const toAdjust = cashAccounts.filter((a) => {
      const p = previews[a.id];
      return p?.actual !== null && p.delta !== null && p.delta !== 0;
    });

    if (toAdjust.length === 0) {
      setError("Preencha pelo menos uma conta com valor diferente do projetado.");
      return;
    }

    setSaving(true);
    try {
      for (const a of toAdjust) {
        const { actual, delta } = previews[a.id];
        if (actual === null || delta === null) continue;

        if (mode === "saldo_inicial") {
          await updateAccount({
            ...a,
            saldoInicial: actual,
            dataReferencia: today,
          });
        } else if (delta > 0) {
          await addManualTransaction({
            data: isoToBr(today),
            lancamento: `Ajuste de saldo — ${a.nome}`,
            categoria: "Ajuste de saldo",
            tipo: "Receita",
            valorOriginal: -delta,
            accountId: a.id,
          });
        } else {
          await addManualTransaction({
            data: isoToBr(today),
            lancamento: `Ajuste de saldo — ${a.nome}`,
            categoria: "Ajuste de saldo",
            tipo: "Ajuste",
            valorOriginal: Math.abs(delta),
            accountId: a.id,
          });
        }
      }
      onClose();
    } catch {
      setError("Erro ao salvar ajustes.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <DrawerBackdrop
      className="flex items-center justify-center"
      role="presentation"
      onClick={onClose}
    >
      <div
        ref={dialogRef}
        className="bg-surface border border-border rounded-lg w-full max-w-lg mx-4 p-4 space-y-4 max-h-[90dvh] overflow-auto"
        role="dialog"
        aria-modal="true"
        aria-labelledby="adjust-balance-title"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-2">
          <div>
            <h2
              id="adjust-balance-title"
              className="text-[11px] font-semibold tracking-wider uppercase text-muted"
            >
              Ajustar saldo
            </h2>
            <p className="text-xs text-muted mt-0.5">
              Informe quanto você tem hoje em cada conta.
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

        <fieldset className="space-y-2">
          <legend className="text-xs text-muted">Como aplicar a diferença</legend>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="radio"
              name="adjust-mode"
              checked={mode === "ajuste"}
              onChange={() => setMode("ajuste")}
            />
            Criar transação de ajuste
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="radio"
              name="adjust-mode"
              checked={mode === "saldo_inicial"}
              onChange={() => setMode("saldo_inicial")}
            />
            Atualizar saldo inicial para hoje
          </label>
        </fieldset>

        {cashAccounts.length === 0 ? (
          <p className="text-sm text-muted">
            Cadastre uma conta corrente, poupança ou carteira em Configurações.
          </p>
        ) : (
          <div className="space-y-3">
            {cashAccounts.map((a) => {
              const p = previews[a.id];
              return (
                <div
                  key={a.id}
                  className="border border-border rounded-md p-3 space-y-2"
                >
                  <div className="font-medium text-sm">{a.nome}</div>
                  <p className="text-xs text-muted">
                    Projetado hoje:{" "}
                    <Num>{formatBRL(p?.projected ?? 0)}</Num>
                  </p>
                  <label className="block space-y-1">
                    <span className="text-xs text-muted">Tenho hoje (R$)</span>
                    <Input
                      className="font-mono tabular-nums"
                      inputMode="decimal"
                      placeholder={String(p?.projected ?? 0)}
                      value={values[a.id] ?? ""}
                      onChange={(e) =>
                        setValues((v) => ({ ...v, [a.id]: e.target.value }))
                      }
                    />
                  </label>
                  {p?.delta !== null && p?.delta !== 0 && (
                    <Num
                      className={clsx(
                        "block text-xs",
                        (p.delta ?? 0) >= 0 ? "text-success" : "text-danger",
                      )}
                    >
                      Diferença: {formatBRL(p.delta ?? 0)}
                    </Num>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {error && <p className="text-xs text-danger">{error}</p>}

        <div className="flex gap-2">
          <Button
            variant="primary"
            size="sm"
            disabled={saving}
            onClick={handleSave}
          >
            Confirmar
          </Button>
          <Button size="sm" onClick={onClose}>
            Cancelar
          </Button>
        </div>
      </div>
    </DrawerBackdrop>
  );
}
