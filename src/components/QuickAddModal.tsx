"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { establishmentAggregation } from "@/lib/aggregations";
import { isoToBr, parseBrlValue, parseBrDate } from "@/lib/csv";
import { defaultAccount } from "@/lib/accounts";
import {
  budgetUsageForMonth,
  currentMonthIso,
  findBudgetForCategory,
  projectUsageAfterExpense,
} from "@/lib/budgets";
import { useAppStore, QuickAddDraft } from "@/lib/store";
import clsx from "clsx";
import { X } from "lucide-react";

type Props = {
  open: boolean;
  draft?: QuickAddDraft | null;
  onClose: () => void;
};

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

function yesterdayIso(): string {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - 1);
  return d.toISOString().slice(0, 10);
}

export function QuickAddModal({ open, draft, onClose }: Props) {
  const { accounts, normalized, budgets, addManualTransaction } = useAppStore();
  const valorRef = useRef<HTMLInputElement>(null);

  const [valorStr, setValorStr] = useState("");
  const [lancamento, setLancamento] = useState("");
  const [accountId, setAccountId] = useState("");
  const [dataIso, setDataIso] = useState(todayIso());
  const [categoria, setCategoria] = useState("");
  const [tipo, setTipo] = useState<"Avulso" | "Receita">("Avulso");
  const [showMore, setShowMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const activeAccounts = useMemo(
    () => accounts.filter((a) => a.ativa),
    [accounts],
  );

  const suggestions = useMemo(() => {
    const ests = establishmentAggregation(normalized);
    return ests.slice(0, 50).map((e) => e.estabelecimento);
  }, [normalized]);

  const monthIso = currentMonthIso();
  const budgetUsages = useMemo(
    () => budgetUsageForMonth(normalized, budgets, monthIso),
    [normalized, budgets, monthIso],
  );

  const expensePreview = useMemo(() => {
    if (tipo === "Receita") return null;
    const parsed =
      parseBrlValue(valorStr) ??
      (Number(valorStr.replace(",", ".")) || null);
    if (parsed === null || parsed <= 0) return null;
    return Math.abs(parsed);
  }, [valorStr, tipo]);

  const budgetNotice = useMemo(() => {
    if (tipo === "Receita") return null;
    const hasActive = budgets.some((b) => b.ativa);
    if (!hasActive) return null;

    if (!categoria.trim()) {
      return { kind: "need-category" as const };
    }

    const budget = findBudgetForCategory(budgets, categoria);
    if (!budget) return null;

    const usage = budgetUsages.find((u) => u.budgetId === budget.id);
    if (!usage) return null;

    if (expensePreview && expensePreview > 0) {
      const projected = projectUsageAfterExpense(usage, expensePreview);
      if (
        projected.percentual > usage.percentual ||
        projected.status !== usage.status
      ) {
        return {
          kind: "projected" as const,
          categoria: usage.categoria,
          fromPct: usage.percentual,
          toPct: projected.percentual,
          gasto: projected.gasto,
          limite: usage.limite,
        };
      }
    }

    return {
      kind: "current" as const,
      categoria: usage.categoria,
      gasto: usage.gasto,
      limite: usage.limite,
      status: usage.status,
    };
  }, [tipo, budgets, categoria, budgetUsages, expensePreview]);

  const fmtBrl = (n: number) =>
    n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

  const budgetNoticeTone =
    budgetNotice?.kind === "projected"
      ? budgetNotice.toPct >= 100
        ? "danger"
        : budgetNotice.toPct >= 80
          ? "warning"
          : "neutral"
      : budgetNotice?.kind === "current"
        ? budgetNotice.status
        : "neutral";

  useEffect(() => {
    if (!open) return;
    const def = defaultAccount(accounts);
    setValorStr(
      draft?.valorOriginal != null ? String(Math.abs(draft.valorOriginal)) : "",
    );
    setLancamento(draft?.lancamento ?? "");
    setAccountId(draft?.accountId ?? def?.id ?? "");
    setDataIso(
      draft?.data
        ? parseBrDate(draft.data) ?? draft.data
        : todayIso(),
    );
    setCategoria(draft?.categoria ?? "");
    setTipo(draft?.tipo === "Receita" ? "Receita" : "Avulso");
    setShowMore(Boolean(draft?.categoria || draft?.tipo === "Receita"));
    setError(null);
    setTimeout(() => valorRef.current?.focus(), 50);
  }, [open, draft, accounts]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  async function save(keepOpen: boolean) {
    setError(null);
    const parsed =
      parseBrlValue(valorStr) ??
      (Number(valorStr.replace(",", ".")) || null);
    if (parsed === null || parsed === 0) {
      setError("Informe um valor válido.");
      return;
    }
    if (!lancamento.trim()) {
      setError("Informe a descrição.");
      return;
    }
    if (!accountId) {
      setError("Selecione uma conta.");
      return;
    }

    const valorOriginal =
      tipo === "Receita" ? -Math.abs(parsed) : Math.abs(parsed);

    setSaving(true);
    try {
      await addManualTransaction({
        data: isoToBr(dataIso),
        lancamento: lancamento.trim(),
        categoria: categoria.trim(),
        tipo,
        valorOriginal,
        accountId,
      });
      if (keepOpen) {
        setValorStr("");
        setLancamento("");
        setCategoria("");
        setTipo("Avulso");
        setShowMore(false);
        valorRef.current?.focus();
      } else {
        onClose();
      }
    } catch {
      setError("Erro ao salvar.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="drawer-backdrop" role="presentation" onClick={onClose}>
      <div
        className="panel w-full max-w-md mx-4 p-4 space-y-4"
        role="dialog"
        aria-modal="true"
        aria-labelledby="quick-add-title"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-2">
          <div>
            <h2 id="quick-add-title" className="section-title">
              Adicionar gasto
            </h2>
            <p className="subtle text-xs mt-0.5">
              Pix, dinheiro, débito — aparece na análise na hora.
            </p>
          </div>
          <button
            type="button"
            className="btn btn-ghost btn-sm"
            onClick={onClose}
            aria-label="Fechar"
          >
            <X size={14} />
          </button>
        </div>

        <div className="space-y-3">
          <label className="block space-y-1">
            <span className="text-xs subtle">Valor (R$)</span>
            <input
              ref={valorRef}
              className="input w-full num text-lg"
              inputMode="decimal"
              placeholder="48,50"
              value={valorStr}
              onChange={(e) => setValorStr(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  save(false);
                }
              }}
            />
          </label>

          <label className="block space-y-1">
            <span className="text-xs subtle">Descrição</span>
            <input
              className="input w-full"
              list="quick-add-establishments"
              value={lancamento}
              onChange={(e) => setLancamento(e.target.value)}
              placeholder="Mercado, Uber…"
            />
            <datalist id="quick-add-establishments">
              {suggestions.map((s) => (
                <option key={s} value={s} />
              ))}
            </datalist>
          </label>

          <label className="block space-y-1">
            <span className="text-xs subtle">Conta</span>
            <select
              className="select w-full"
              value={accountId}
              onChange={(e) => setAccountId(e.target.value)}
            >
              {activeAccounts.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.nome}
                </option>
              ))}
            </select>
          </label>

          <div className="space-y-1">
            <span className="text-xs subtle">Data</span>
            <div className="flex gap-2 flex-wrap items-center">
              <button
                type="button"
                className="btn btn-sm"
                onClick={() => setDataIso(todayIso())}
              >
                Hoje
              </button>
              <button
                type="button"
                className="btn btn-sm"
                onClick={() => setDataIso(yesterdayIso())}
              >
                Ontem
              </button>
              <input
                type="date"
                className="input flex-1 min-w-[140px]"
                value={dataIso}
                onChange={(e) => setDataIso(e.target.value)}
              />
            </div>
          </div>

          {budgetNotice?.kind === "need-category" && (
            <p className="text-xs text-[var(--warning)] border border-[var(--warning)]/30 rounded-md px-2 py-1.5">
              Adicione categoria para acompanhar orçamento.
            </p>
          )}

          {!showMore ? (
            <button
              type="button"
              className="text-xs subtle underline"
              onClick={() => setShowMore(true)}
            >
              Mais campos…
            </button>
          ) : (
            <div className="space-y-2 border-t border-[var(--border)] pt-2">
              <label className="block space-y-1">
                <span className="text-xs subtle">Categoria</span>
                <input
                  className="input w-full"
                  value={categoria}
                  onChange={(e) => setCategoria(e.target.value)}
                />
              </label>
              <label className="block space-y-1">
                <span className="text-xs subtle">Tipo</span>
                <select
                  className="select w-full"
                  value={tipo}
                  onChange={(e) =>
                    setTipo(e.target.value as "Avulso" | "Receita")
                  }
                >
                  <option value="Avulso">Gasto avulso</option>
                  <option value="Receita">Receita</option>
                </select>
              </label>
            </div>
          )}

          {budgetNotice && budgetNotice.kind !== "need-category" && (
            <p
              className={clsx(
                "text-xs rounded-md px-2 py-1.5 border",
                budgetNoticeTone === "danger"
                  ? "text-[var(--danger)] border-[var(--danger)]/30"
                  : budgetNoticeTone === "warning"
                    ? "text-[var(--warning)] border-[var(--warning)]/30"
                    : "subtle border-[var(--border)]",
              )}
            >
              {budgetNotice.kind === "current" && (
                <>
                  Você já gastou {fmtBrl(budgetNotice.gasto)}/
                  {fmtBrl(budgetNotice.limite)} em {budgetNotice.categoria} este
                  mês.
                </>
              )}
              {budgetNotice.kind === "projected" && (
                <>
                  Com este gasto, {budgetNotice.categoria} passa de{" "}
                  {budgetNotice.fromPct.toFixed(0)}% para{" "}
                  {budgetNotice.toPct.toFixed(0)}% (
                  {fmtBrl(budgetNotice.gasto)}/{fmtBrl(budgetNotice.limite)}).
                </>
              )}
            </p>
          )}

          {error && <p className="text-xs text-[var(--danger)]">{error}</p>}

          <div className="flex flex-wrap gap-2 pt-1">
            <button
              type="button"
              className="btn btn-primary btn-sm"
              disabled={saving}
              onClick={() => save(false)}
            >
              Salvar
            </button>
            <button
              type="button"
              className="btn btn-sm"
              disabled={saving}
              onClick={() => save(true)}
            >
              Salvar e adicionar outra
            </button>
            <button type="button" className="btn btn-sm btn-ghost" onClick={onClose}>
              Cancelar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
