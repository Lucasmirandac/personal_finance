"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { establishmentAggregation } from "@/lib/aggregations";
import { isoToBr, parseBrlValue, parseBrDate } from "@/lib/csv";
import { todayIso, yesterdayIso } from "@/lib/dates";
import { formatDateBR } from "@/lib/format";
import {
  buildInstallmentDates,
  formatInstallmentLancamento,
  MAX_PARCELAS,
  splitInstallments,
} from "@/lib/installments";
import { ACCOUNT_KIND_LABELS, defaultAccount } from "@/lib/accounts";
import { useFocusTrap } from "@/lib/hooks/useFocusTrap";
import {
  budgetUsageForMonth,
  currentMonthIso,
  findBudgetForCategory,
  projectUsageAfterExpense,
} from "@/lib/budgets";
import { useAppStore, QuickAddDraft } from "@/lib/store";
import type { TransactionNormalized } from "@/lib/types";
import clsx from "clsx";
import { Button } from "@/components/ui/Button";
import { DrawerBackdrop } from "@/components/ui/Drawer";
import { Input, Select } from "@/components/ui/Input";
import { IntegerInput } from "@/components/ui/IntegerInput";
import { MoneyInput } from "@/components/ui/MoneyInput";
import { SegmentedControl } from "@/components/ui/SegmentedControl";
import { CreditCard, Wallet, X } from "lucide-react";

type QuickAddTipo = "Avulso" | "Receita";
type AmountMode = "total" | "parcela";

const RECEITA_FALLBACK_DESCS = [
  "Salário",
  "Freela",
  "Reembolso",
  "Rendimento",
  "Outros",
];
const RECEITA_FALLBACK_CATS = [
  "Salário",
  "Freela",
  "Reembolso",
  "Rendimento",
  "Outros",
];

function incomeDescriptionSuggestions(
  normalized: TransactionNormalized[],
): string[] {
  const counts = new Map<string, number>();
  for (const t of normalized) {
    if (t.tipoFluxo !== "entrada") continue;
    const key = (t.estabelecimento || t.lancamento || "").trim();
    if (!key) continue;
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  const sorted = [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([k]) => k)
    .slice(0, 50);
  return sorted.length > 0 ? sorted : RECEITA_FALLBACK_DESCS;
}

function categorySuggestions(
  normalized: TransactionNormalized[],
  fluxo: "entrada" | "saida",
  fallback: string[],
): string[] {
  const counts = new Map<string, number>();
  for (const t of normalized) {
    if (t.tipoFluxo !== fluxo) continue;
    const cat = t.categoria?.trim();
    if (!cat) continue;
    counts.set(cat, (counts.get(cat) ?? 0) + 1);
  }
  const sorted = [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([k]) => k);
  return sorted.length > 0 ? sorted : fallback;
}

type Props = {
  open: boolean;
  draft?: QuickAddDraft | null;
  onClose: () => void;
};

export function QuickAddModal({ open, draft, onClose }: Props) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const { accounts, normalized, budgets, addManualTransaction, addManualTransactions } =
    useAppStore();
  const valorRef = useRef<HTMLInputElement>(null);

  const [valorStr, setValorStr] = useState("");
  const [lancamento, setLancamento] = useState("");
  const [accountId, setAccountId] = useState("");
  const [dataIso, setDataIso] = useState(todayIso());
  const [categoria, setCategoria] = useState("");
  const [tipo, setTipo] = useState<QuickAddTipo>("Avulso");
  const [parcelas, setParcelas] = useState("1");
  const [amountMode, setAmountMode] = useState<AmountMode>("total");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const isReceita = tipo === "Receita";

  const activeAccounts = useMemo(
    () => accounts.filter((a) => a.ativa),
    [accounts],
  );

  const contasSaldo = useMemo(
    () => activeAccounts.filter((a) => a.kind !== "cartao"),
    [activeAccounts],
  );

  const cartoes = useMemo(
    () => activeAccounts.filter((a) => a.kind === "cartao"),
    [activeAccounts],
  );

  const selectedAccount = useMemo(
    () => activeAccounts.find((a) => a.id === accountId),
    [activeAccounts, accountId],
  );

  const showParcelas =
    !isReceita && selectedAccount?.kind === "cartao";

  const parcelasN = Math.max(
    1,
    Math.min(MAX_PARCELAS, Number(parcelas) || 1),
  );

  const descriptionSuggestions = useMemo(() => {
    if (isReceita) return incomeDescriptionSuggestions(normalized);
    return establishmentAggregation(normalized)
      .slice(0, 50)
      .map((e) => e.estabelecimento);
  }, [normalized, isReceita]);

  const categoryList = useMemo(
    () =>
      categorySuggestions(
        normalized,
        isReceita ? "entrada" : "saida",
        isReceita ? RECEITA_FALLBACK_CATS : [],
      ),
    [normalized, isReceita],
  );

  const monthIso = currentMonthIso();
  const budgetUsages = useMemo(
    () => budgetUsageForMonth(normalized, budgets, monthIso),
    [normalized, budgets, monthIso],
  );

  const parsedValor = useMemo(() => {
    return (
      parseBrlValue(valorStr) ??
      (Number(valorStr.replace(",", ".")) || null)
    );
  }, [valorStr]);

  const valorTotal = useMemo(() => {
    if (parsedValor === null || parsedValor <= 0) return null;
    if (showParcelas && parcelasN > 1 && amountMode === "parcela") {
      return Math.abs(parsedValor) * parcelasN;
    }
    return Math.abs(parsedValor);
  }, [parsedValor, showParcelas, parcelasN, amountMode]);

  const expensePreview = useMemo(() => {
    if (isReceita) return null;
    if (valorTotal === null || valorTotal <= 0) return null;
    if (showParcelas && parcelasN > 1) {
      const amounts = splitInstallments(valorTotal, parcelasN);
      return amounts[0] ?? valorTotal;
    }
    return valorTotal;
  }, [valorTotal, isReceita, showParcelas, parcelasN]);

  const installmentPreview = useMemo(() => {
    if (!showParcelas || parcelasN <= 1 || valorTotal === null) return null;
    const amounts = splitInstallments(valorTotal, parcelasN);
    const dates = buildInstallmentDates(dataIso, parcelasN);
    const parcelaValue = amounts[0] ?? 0;
    return {
      parcelaValue,
      valorTotal,
      firstDate: dates[0] ?? dataIso,
      lastDate: dates[dates.length - 1] ?? dataIso,
    };
  }, [showParcelas, parcelasN, valorTotal, dataIso]);

  const budgetNotice = useMemo(() => {
    if (isReceita) return null;
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
  }, [isReceita, budgets, categoria, budgetUsages, expensePreview]);

  const incomePreview = useMemo(() => {
    if (!isReceita || parsedValor === null || parsedValor <= 0) return null;
    const account = activeAccounts.find((a) => a.id === accountId);
    if (!account) return null;
    return {
      valor: Math.abs(parsedValor),
      conta: account.nome,
      data: isoToBr(dataIso),
    };
  }, [isReceita, parsedValor, activeAccounts, accountId, dataIso]);

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

  const copy = isReceita
    ? {
        title: "Adicionar receita",
        subtitle: "Salário, freela, reembolso — entra no saldo na hora.",
        descPlaceholder: "Salário, Freela, Reembolso…",
        primary: "Adicionar receita",
        secondary: "Salvar e adicionar outra",
      }
    : {
        title: "Adicionar gasto",
        subtitle: "Pix, débito ou cartão de crédito — vai pro saldo ou pra fatura.",
        descPlaceholder: "Mercado, Uber…",
        primary: "Adicionar gasto",
        secondary: "Salvar e adicionar outro",
      };

  useEffect(() => {
    if (!open) return;
    const def = defaultAccount(accounts);
    setValorStr(
      draft?.valorOriginal != null ? String(Math.abs(draft.valorOriginal)) : "",
    );
    setLancamento(draft?.lancamento ?? "");
    setAccountId(draft?.accountId ?? def?.id ?? "");
    setDataIso(
      draft?.data ? (parseBrDate(draft.data) ?? draft.data) : todayIso(),
    );
    setCategoria(draft?.categoria ?? "");
    setTipo(draft?.tipo === "Receita" ? "Receita" : "Avulso");
    setParcelas(
      draft?.parcelas != null ? String(Math.min(MAX_PARCELAS, Math.max(1, draft.parcelas))) : "1",
    );
    setAmountMode(draft?.amountMode ?? "total");
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
      setError("Selecione onde o gasto sai.");
      return;
    }

    const total =
      showParcelas && parcelasN > 1 && amountMode === "parcela"
        ? Math.abs(parsed) * parcelasN
        : Math.abs(parsed);
    if (total <= 0) {
      setError("Informe um valor válido.");
      return;
    }

    setSaving(true);
    try {
      if (isReceita) {
        await addManualTransaction({
          data: isoToBr(dataIso),
          lancamento: lancamento.trim(),
          categoria: categoria.trim(),
          tipo,
          valorOriginal: -total,
          accountId,
        });
      } else if (showParcelas && parcelasN > 1) {
        const amounts = splitInstallments(total, parcelasN);
        const dates = buildInstallmentDates(dataIso, parcelasN);
        await addManualTransactions(
          amounts.map((amount, i) => ({
            data: isoToBr(dates[i]!),
            lancamento: formatInstallmentLancamento(
              lancamento.trim(),
              i,
              parcelasN,
            ),
            categoria: categoria.trim(),
            tipo,
            valorOriginal: Math.abs(amount),
            accountId,
          })),
        );
      } else {
        await addManualTransaction({
          data: isoToBr(dataIso),
          lancamento: lancamento.trim(),
          categoria: categoria.trim(),
          tipo,
          valorOriginal: total,
          accountId,
        });
      }
      if (keepOpen) {
        setValorStr("");
        setLancamento("");
        setCategoria("");
        setParcelas("1");
        setAmountMode("total");
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
              {copy.title}
            </h2>
            <p className="text-xs text-muted mt-0.5">{copy.subtitle}</p>
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

        <SegmentedControl<QuickAddTipo>
          className="w-full [&>button]:flex-1 [&>button]:justify-center"
          size="sm"
          options={[
            { value: "Avulso", label: "Gasto" },
            { value: "Receita", label: "Receita" },
          ]}
          value={tipo}
          onChange={(v) => {
            setTipo(v);
            if (v === "Receita") {
              setParcelas("1");
              setAmountMode("total");
            }
          }}
        />

        <div className="space-y-3">
          <label className="block space-y-1">
            <span className="text-xs text-muted">Valor (R$)</span>
            <MoneyInput
              ref={valorRef}
              className={clsx(
                "text-lg",
                isReceita &&
                  "border-l-2 border-l-success pl-2 focus-visible:ring-success/40",
              )}
              placeholder="48,50"
              value={valorStr}
              onChange={setValorStr}
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
              placeholder={copy.descPlaceholder}
            />
            <datalist id="quick-add-establishments">
              {descriptionSuggestions.map((s) => (
                <option key={s} value={s} />
              ))}
            </datalist>
          </label>

          <label className="block space-y-1">
            <span className="text-xs text-muted">Categoria</span>
            <Input
              list="quick-add-categories"
              value={categoria}
              onChange={(e) => setCategoria(e.target.value)}
              placeholder={isReceita ? "Salário, Freela…" : "Alimentação, Transporte…"}
            />
            <datalist id="quick-add-categories">
              {categoryList.map((c) => (
                <option key={c} value={c} />
              ))}
            </datalist>
          </label>

          <label className="block space-y-1">
            <span className="text-xs text-muted">Pagar com</span>
            <Select
              value={accountId}
              onChange={(e) => {
                const nextId = e.target.value;
                setAccountId(nextId);
                const acc = activeAccounts.find((a) => a.id === nextId);
                if (acc?.kind !== "cartao") {
                  setParcelas("1");
                  setAmountMode("total");
                }
              }}
            >
              {contasSaldo.length > 0 && (
                <optgroup label="Contas (saldo)">
                  {contasSaldo.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.nome} · {ACCOUNT_KIND_LABELS[a.kind]}
                    </option>
                  ))}
                </optgroup>
              )}
              {cartoes.length > 0 && (
                <optgroup label="Cartões de crédito">
                  {cartoes.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.nome} · Cartão
                    </option>
                  ))}
                </optgroup>
              )}
            </Select>
            {selectedAccount && !isReceita && (
              <div className="flex items-center gap-1.5 text-[11px] text-muted pt-0.5">
                {selectedAccount.kind === "cartao" ? (
                  <>
                    <CreditCard size={12} className="shrink-0" />
                    <span>Vai para a fatura do cartão.</span>
                  </>
                ) : (
                  <>
                    <Wallet size={12} className="shrink-0" />
                    <span>Sai do saldo em {isoToBr(dataIso)}.</span>
                  </>
                )}
              </div>
            )}
          </label>

          {showParcelas && (
            <div className="rounded-md border border-border bg-surface-2 p-2.5 space-y-2">
              <div className="flex items-center gap-1.5 text-[11px] text-muted">
                <CreditCard size={12} className="shrink-0" />
                <span>Cartão {selectedAccount?.nome}</span>
              </div>
              <label className="block space-y-1">
                <span className="text-xs text-muted">Parcelas</span>
                <IntegerInput
                  min={1}
                  max={MAX_PARCELAS}
                  value={parcelas}
                  onChange={setParcelas}
                />
              </label>
              {parcelasN > 1 && (
                <>
                  <SegmentedControl<AmountMode>
                    className="w-full [&>button]:flex-1 [&>button]:justify-center"
                    size="sm"
                    options={[
                      { value: "total", label: "Valor total" },
                      { value: "parcela", label: "Valor da parcela" },
                    ]}
                    value={amountMode}
                    onChange={setAmountMode}
                  />
                  {installmentPreview && (
                    <p className="text-xs text-muted border border-border rounded-md px-2 py-1.5 bg-surface">
                      {parcelasN}x de {fmtBrl(installmentPreview.parcelaValue)}{" "}
                      = {fmtBrl(installmentPreview.valorTotal)}
                      <br />
                      1ª em {formatDateBR(installmentPreview.firstDate)}, última
                      em {formatDateBR(installmentPreview.lastDate)}
                    </p>
                  )}
                </>
              )}
              {parcelasN === 1 && (
                <p className="text-[11px] text-muted">
                  À vista: lança em {formatDateBR(dataIso)}, paga na próxima
                  fatura.
                </p>
              )}
            </div>
          )}

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

          {incomePreview && (
            <p className="text-xs text-muted border border-border rounded-md px-2 py-1.5">
              Saldo aumenta em {fmtBrl(incomePreview.valor)} em{" "}
              {incomePreview.conta} no dia {incomePreview.data}.
            </p>
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
              variant={isReceita ? "success" : "primary"}
              size="sm"
              disabled={saving}
              onClick={() => save(false)}
            >
              {copy.primary}
            </Button>
            <Button size="sm" disabled={saving} onClick={() => save(true)}>
              {copy.secondary}
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
