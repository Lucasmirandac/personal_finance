"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { establishmentAggregation } from "@/lib/aggregations";
import { isoToBr, parseBrlValue, parseBrDate } from "@/lib/csv";
import { todayIso, yesterdayIso } from "@/lib/dates";
import { defaultAccount } from "@/lib/accounts";
import { useFocusTrap } from "@/lib/hooks/useFocusTrap";
import {
  budgetUsageForMonth,
  currentMonthIso,
  findBudgetForCategory,
  projectUsageAfterExpense,
} from "@/lib/budgets";
import { useAppStore, QuickAddDraft } from "@/lib/store";
import clsx from "clsx";
import { Button } from "@/components/ui/Button";
import { DrawerBackdrop } from "@/components/ui/Drawer";
import { Input, Select } from "@/components/ui/Input";
import { X } from "lucide-react";

type Props = {
  open: boolean;
  draft?: QuickAddDraft | null;
  onClose: () => void;
};

export function QuickAddModal({ open, draft, onClose }: Props) {
  const dialogRef = useRef<HTMLDivElement>(null);
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

  useFocusTrap(open, dialogRef);

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
        aria-labelledby="quick-add-title"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-2">
          <div>
            <h2
              id="quick-add-title"
              className="text-[11px] font-semibold tracking-wider uppercase text-muted"
            >
              Adicionar gasto
            </h2>
            <p className="text-xs text-muted mt-0.5">
              Pix, dinheiro, débito — aparece na análise na hora.
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

        <div className="space-y-3">
          <label className="block space-y-1">
            <span className="text-xs text-muted">Valor (R$)</span>
            <Input
              ref={valorRef}
              className="font-mono tabular-nums text-lg"
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
            <span className="text-xs text-muted">Descrição</span>
            <Input
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
            <span className="text-xs text-muted">Conta</span>
            <Select
              value={accountId}
              onChange={(e) => setAccountId(e.target.value)}
            >
              {activeAccounts.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.nome}
                </option>
              ))}
            </Select>
          </label>

          <div className="space-y-1">
            <label className="text-xs text-muted" htmlFor="quick-add-date">
              Data
            </label>
            <div className="flex gap-2 flex-wrap items-center">
              <Button size="sm" onClick={() => setDataIso(todayIso())}>
                Hoje
              </Button>
              <Button size="sm" onClick={() => setDataIso(yesterdayIso())}>
                Ontem
              </Button>
              <Input
                id="quick-add-date"
                type="date"
                className="flex-1 min-w-[140px]"
                value={dataIso}
                onChange={(e) => setDataIso(e.target.value)}
              />
            </div>
          </div>

          {budgetNotice?.kind === "need-category" && (
            <p className="text-xs text-warning border border-warning/30 rounded-md px-2 py-1.5">
              Adicione categoria para acompanhar orçamento.
            </p>
          )}

          {!showMore ? (
            <button
              type="button"
              className="text-xs text-muted underline"
              onClick={() => setShowMore(true)}
            >
              Mais campos…
            </button>
          ) : (
            <div className="space-y-2 border-t border-border pt-2">
              <label className="block space-y-1">
                <span className="text-xs text-muted">Categoria</span>
                <Input
                  value={categoria}
                  onChange={(e) => setCategoria(e.target.value)}
                />
              </label>
              <label className="block space-y-1">
                <span className="text-xs text-muted">Tipo</span>
                <Select
                  value={tipo}
                  onChange={(e) =>
                    setTipo(e.target.value as "Avulso" | "Receita")
                  }
                >
                  <option value="Avulso">Gasto avulso</option>
                  <option value="Receita">Receita</option>
                </Select>
              </label>
            </div>
          )}

          {budgetNotice && budgetNotice.kind !== "need-category" && (
            <p
              className={clsx(
                "text-xs rounded-md px-2 py-1.5 border",
                budgetNoticeTone === "danger"
                  ? "text-danger border-danger/30"
                  : budgetNoticeTone === "warning"
                    ? "text-warning border-warning/30"
                    : "text-muted border-border",
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

          {error && <p className="text-xs text-danger">{error}</p>}

          <div className="flex flex-wrap gap-2 pt-1">
            <Button
              variant="primary"
              size="sm"
              disabled={saving}
              onClick={() => save(false)}
            >
              Salvar
            </Button>
            <Button
              size="sm"
              disabled={saving}
              onClick={() => save(true)}
            >
              Salvar e adicionar outra
            </Button>
            <Button variant="ghost" size="sm" onClick={onClose}>
              Cancelar
            </Button>
          </div>
        </div>
      </div>
    </DrawerBackdrop>
  );
}
