"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  ChevronLeft,
  ChevronRight,
  ClipboardPaste,
  Plus,
  Trash2,
} from "lucide-react";
import { QuickAddModal } from "@/components/QuickAddModal";
import { MonthPastePreview } from "@/components/mes/MonthPastePreview";
import { useMonthGridPaste } from "@/components/mes/useMonthGridPaste";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Input, Select } from "@/components/ui/Input";
import { MoneyInput } from "@/components/ui/MoneyInput";
import { Num } from "@/components/ui/Num";
import { Panel } from "@/components/ui/Panel";
import { defaultAccount } from "@/lib/accounts";
import { isoToBr, parseBrlValue } from "@/lib/csv";
import { addMonthsYyyyMm, todayIso } from "@/lib/dates";
import { recurringRuleIdFromRaw } from "@/lib/edits";
import { formatBRL, formatMonthLabel } from "@/lib/format";
import { isManualQuickRaw } from "@/lib/manualTransactions";
import {
  defaultDateForMonth,
  formatInstallmentCell,
  installmentRef,
  monthCategoryRows,
  monthGridSlices,
  sumSaida,
} from "@/lib/monthGrid";
import { derivePaymentState } from "@/lib/paymentStatus";
import { newRecurringId } from "@/lib/recurring";
import { useAppStore } from "@/lib/store";
import { resolveTransactionAccount } from "@/lib/transactionViews";
import type { Account, TransactionNormalized } from "@/lib/types";
import clsx from "clsx";

const gridField =
  "bg-surface border border-border rounded-md px-2 py-1 text-sm text-foreground w-full min-w-0 focus:outline focus:outline-1 focus:outline-border-strong";

type Draft = {
  descricao: string;
  dataIso: string;
  accountId: string;
  categoria: string;
  valorStr: string;
  pago: boolean;
};

function emptyDraft(monthIso: string, accountId: string): Draft {
  return {
    descricao: "",
    dataIso: defaultDateForMonth(monthIso),
    accountId,
    categoria: "",
    valorStr: "",
    pago: false,
  };
}

function moneyToInput(n: number): string {
  return n.toLocaleString("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function parseMoney(input: string): number | null {
  const parsed =
    parseBrlValue(input) ?? (Number(input.replace(",", ".")) || null);
  if (parsed == null || parsed <= 0) return null;
  return Math.abs(parsed);
}

function AccountSelect({
  accounts,
  value,
  onChange,
  id,
}: {
  accounts: Account[];
  value: string;
  onChange: (id: string) => void;
  id?: string;
}) {
  const cash = accounts.filter((a) => a.kind !== "cartao");
  const cards = accounts.filter((a) => a.kind === "cartao");
  return (
    <Select
      id={id}
      className={clsx(gridField, "max-w-[11rem]")}
      value={value}
      onChange={(e) => onChange(e.target.value)}
    >
      {cash.length > 0 && (
        <optgroup label="Contas">
          {cash.map((a) => (
            <option key={a.id} value={a.id}>
              {a.nome}
            </option>
          ))}
        </optgroup>
      )}
      {cards.length > 0 && (
        <optgroup label="Cartões">
          {cards.map((a) => (
            <option key={a.id} value={a.id}>
              {a.nome}
            </option>
          ))}
        </optgroup>
      )}
    </Select>
  );
}

export function MonthGridPageContent() {
  const {
    loaded,
    accounts,
    normalized,
    budgets,
    recurringRules,
    paymentStatus,
    addManualTransaction,
    updateManualTransaction,
    removeManualTransaction,
    addRecurring,
    updateRecurring,
    editTransaction,
    deleteTransaction,
    setPaymentStatus,
  } = useAppStore();

  const [month, setMonth] = useState(() => todayIso().slice(0, 7));
  const [quickAddOpen, setQuickAddOpen] = useState(false);
  const {
    pasteRows,
    pasteOpen,
    handlePasteEvent,
    handlePasteButton,
    closePaste,
    confirmPaste,
  } = useMonthGridPaste(month);

  const activeAccounts = useMemo(
    () => accounts.filter((a) => a.ativa),
    [accounts],
  );
  const defaultAccId = defaultAccount(activeAccounts)?.id ?? "";

  const [gastoDraft, setGastoDraft] = useState<Draft>(() =>
    emptyDraft(todayIso().slice(0, 7), defaultAccId),
  );
  const [fixoDraft, setFixoDraft] = useState<Draft>(() =>
    emptyDraft(todayIso().slice(0, 7), defaultAccId),
  );

  useEffect(() => {
    if (!month) return;
    setGastoDraft((d) => ({
      ...d,
      dataIso: d.descricao ? d.dataIso : defaultDateForMonth(month),
      accountId: d.accountId || defaultAccId,
    }));
    setFixoDraft((d) => ({
      ...d,
      dataIso: d.descricao ? d.dataIso : defaultDateForMonth(month),
      accountId: d.accountId || defaultAccId,
    }));
  }, [month, defaultAccId]);

  const slices = useMemo(
    () => monthGridSlices(normalized, month),
    [normalized, month],
  );
  const categoryRows = useMemo(
    () => monthCategoryRows(normalized, budgets, month),
    [normalized, budgets, month],
  );

  const totalFixos = sumSaida(slices.fixos);
  const totalParcelas = sumSaida(slices.parcelas);
  const totalCorrentes = sumSaida(slices.correntes);
  const totalMes = Math.round((totalFixos + totalParcelas + totalCorrentes) * 100) / 100;

  const categories = useMemo(() => {
    const counts = new Map<string, number>();
    for (const tx of normalized) {
      const cat = tx.categoria?.trim();
      if (!cat) continue;
      counts.set(cat, (counts.get(cat) ?? 0) + 1);
    }
    for (const b of budgets) {
      if (b.ativa && b.categoria.trim()) counts.set(b.categoria.trim(), 1);
    }
    return [...counts.entries()]
      .sort((a, b) => b[1] - a[1])
      .map(([c]) => c);
  }, [normalized, budgets]);

  async function saveGastoDraft() {
    const valor = parseMoney(gastoDraft.valorStr);
    if (!gastoDraft.descricao.trim() || valor == null || !gastoDraft.accountId) {
      return false;
    }
    await addManualTransaction({
      data: isoToBr(gastoDraft.dataIso),
      lancamento: gastoDraft.descricao.trim(),
      categoria: gastoDraft.categoria.trim(),
      tipo: "Avulso",
      valorOriginal: valor,
      accountId: gastoDraft.accountId,
    });
    setGastoDraft(emptyDraft(month, gastoDraft.accountId));
    return true;
  }

  async function saveFixoDraft() {
    const valor = parseMoney(fixoDraft.valorStr);
    if (!fixoDraft.descricao.trim() || valor == null || !fixoDraft.accountId) {
      return false;
    }
    const id = newRecurringId();
    const day = Number(fixoDraft.dataIso.slice(8, 10)) || 1;
    await addRecurring({
      id,
      kind: "despesa_fixa",
      descricao: fixoDraft.descricao.trim(),
      categoria: fixoDraft.categoria.trim() || "(sem categoria)",
      valor,
      diaMes: day,
      inicio: fixoDraft.dataIso,
      fim: null,
      ativo: true,
      criadoEm: new Date().toISOString(),
      accountId: fixoDraft.accountId,
    });
    if (fixoDraft.pago) {
      await setPaymentStatus(`manual:${id}:${month}`, "pago");
    }
    setFixoDraft(emptyDraft(month, fixoDraft.accountId));
    return true;
  }

  if (!loaded || !month) {
    return <div className="text-muted">Carregando…</div>;
  }

  return (
    <div className="space-y-4" onPaste={handlePasteEvent}>
      <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.22em] text-muted">Mês</p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight">
            Lançar o mês
          </h1>
          <p className="mt-1 max-w-xl text-sm text-muted">
            Grade no formato da planilha: fixos, parcelas e gastos do dia.
            Enter grava a linha. Cole um bloco copiado do Google Sheets para
            importar.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1 rounded-full border border-border bg-surface px-1 py-0.5">
            <Button
              variant="ghost"
              size="sm"
              className="rounded-full"
              aria-label="Mês anterior"
              onClick={() => setMonth(addMonthsYyyyMm(month, -1))}
            >
              <ChevronLeft size={16} />
            </Button>
            <span className="min-w-16 text-center text-sm font-medium">
              {formatMonthLabel(month)}
            </span>
            <Button
              variant="ghost"
              size="sm"
              className="rounded-full"
              aria-label="Próximo mês"
              onClick={() => setMonth(addMonthsYyyyMm(month, 1))}
            >
              <ChevronRight size={16} />
            </Button>
          </div>
          <Button size="sm" onClick={() => void handlePasteButton()}>
            <ClipboardPaste size={14} />
            Colar da planilha
          </Button>
        </div>
      </header>

      <Panel className="flex flex-wrap items-end justify-between gap-3 rounded-3xl px-4 py-3 shadow-[var(--shadow-card)]">
        <div>
          <p className="text-caption uppercase tracking-wider text-muted">
            Total de gastos
          </p>
          <Num className="mt-1 block text-2xl font-semibold tabular-nums">
            {formatBRL(totalMes)}
          </Num>
        </div>
        <div className="flex flex-wrap gap-4 text-sm text-muted">
          <span>Fixos {formatBRL(totalFixos)}</span>
          <span>Parcelas {formatBRL(totalParcelas)}</span>
          <span>Do mês {formatBRL(totalCorrentes)}</span>
        </div>
      </Panel>

      <FixosTable
        rows={slices.fixos}
        draft={fixoDraft}
        setDraft={setFixoDraft}
        accounts={activeAccounts}
        categories={categories}
        paymentStatus={paymentStatus}
        onSaveDraft={() => void saveFixoDraft()}
        onTogglePaid={(tx, paid) =>
          void setPaymentStatus(tx.id, paid ? "pago" : "a_pagar")
        }
        onPatchTx={(tx, patch) => void editTransaction(tx.id, patch)}
        onPatchRule={(tx, patch) => {
          const ruleId = recurringRuleIdFromRaw(tx);
          const rule = recurringRules.find((r) => r.id === ruleId);
          if (!rule) return;
          void updateRecurring({ ...rule, ...patch });
        }}
        onDelete={(tx) => void deleteTransaction(tx.id)}
      />

      <ParcelasTable
        rows={slices.parcelas}
        accounts={activeAccounts}
        onNew={() => setQuickAddOpen(true)}
        onDelete={(tx) => {
          if (isManualQuickRaw(tx)) void removeManualTransaction(tx.id);
        }}
      />

      <GastosTable
        rows={slices.correntes}
        draft={gastoDraft}
        setDraft={setGastoDraft}
        accounts={activeAccounts}
        categories={categories}
        onSaveDraft={() => void saveGastoDraft()}
        onUpdate={(tx, patch) => void updateManualTransaction(tx.id, patch)}
        onDelete={(tx) => void removeManualTransaction(tx.id)}
      />

      <BudgetsTable rows={categoryRows} />

      <MonthPastePreview
        open={pasteOpen && pasteRows != null}
        initialRows={pasteRows ?? []}
        accounts={accounts}
        onClose={closePaste}
        onConfirm={(rows) => void confirmPaste(rows)}
      />

      <QuickAddModal
        open={quickAddOpen}
        draft={{
          data: defaultDateForMonth(month),
          parcelas: 2,
          accountId:
            activeAccounts.find((a) => a.kind === "cartao")?.id ?? defaultAccId,
        }}
        onClose={() => setQuickAddOpen(false)}
      />
    </div>
  );
}

function FixosTable({
  rows,
  draft,
  setDraft,
  accounts,
  categories,
  paymentStatus,
  onSaveDraft,
  onTogglePaid,
  onPatchTx,
  onPatchRule,
  onDelete,
}: {
  rows: TransactionNormalized[];
  draft: Draft;
  setDraft: React.Dispatch<React.SetStateAction<Draft>>;
  accounts: Account[];
  categories: string[];
  paymentStatus: ReturnType<typeof useAppStore>["paymentStatus"];
  onSaveDraft: () => void;
  onTogglePaid: (tx: TransactionNormalized, paid: boolean) => void;
  onPatchTx: (
    tx: TransactionNormalized,
    patch: { data?: string; valorOriginal?: number },
  ) => void;
  onPatchRule: (
    tx: TransactionNormalized,
    patch: { categoria?: string; accountId?: string; descricao?: string },
  ) => void;
  onDelete: (tx: TransactionNormalized) => void;
}) {
  return (
    <Panel className="overflow-hidden rounded-3xl shadow-[var(--shadow-card)]">
      <SectionHead
        title="Gastos fixos"
        hint="Aluguel, luz, faculdade. O valor deste mês pode variar sem mudar os outros."
      />
      <div className="overflow-x-auto">
        <table className="w-full min-w-[44rem] border-collapse text-sm">
          <thead>
            <tr className="text-left text-caption uppercase tracking-wide text-muted">
              <th className="px-3 py-2 w-14">Pago</th>
              <th className="px-2 py-2">Nome</th>
              <th className="px-2 py-2 w-36">Data</th>
              <th className="px-2 py-2 w-40">Conta</th>
              <th className="px-2 py-2 w-40">Categoria</th>
              <th className="px-2 py-2 w-28 text-right">Valor</th>
              <th className="px-2 py-2 w-10" />
            </tr>
          </thead>
          <tbody>
            {rows.map((tx) => {
              const paid = derivePaymentState(tx, paymentStatus) === "pago";
              const account = resolveTransactionAccount(tx, accounts);
              return (
                <tr key={tx.id} className="border-t border-border">
                  <td className="px-3 py-1.5">
                    <input
                      type="checkbox"
                      checked={paid}
                      aria-label={`Marcar ${tx.lancamento} como pago`}
                      onChange={(e) => onTogglePaid(tx, e.target.checked)}
                    />
                  </td>
                  <td className="px-2 py-1.5">
                    <CommitInput
                      className={gridField}
                      value={tx.lancamento}
                      onCommit={(descricao) =>
                        onPatchRule(tx, { descricao: descricao.trim() })
                      }
                    />
                  </td>
                  <td className="px-2 py-1.5">
                    <input
                      type="date"
                      className={gridField}
                      value={tx.dataISO}
                      onChange={(e) =>
                        onPatchTx(tx, { data: isoToBr(e.target.value) })
                      }
                    />
                  </td>
                  <td className="px-2 py-1.5">
                    <AccountSelect
                      accounts={accounts}
                      value={account?.id ?? tx.accountId ?? ""}
                      onChange={(accountId) => onPatchRule(tx, { accountId })}
                    />
                  </td>
                  <td className="px-2 py-1.5">
                    <CommitInput
                      className={gridField}
                      list="month-grid-categories"
                      value={tx.categoria}
                      onCommit={(categoria) => onPatchRule(tx, { categoria })}
                    />
                  </td>
                  <td className="px-2 py-1.5">
                    <CommitMoney
                      value={Math.abs(tx.valorOriginal)}
                      onCommit={(valorOriginal) =>
                        onPatchTx(tx, { valorOriginal })
                      }
                    />
                  </td>
                  <td className="px-2 py-1.5">
                    <IconDelete
                      label={`Ocultar ${tx.lancamento} deste mês`}
                      onClick={() => onDelete(tx)}
                    />
                  </td>
                </tr>
              );
            })}
            <tr className="border-t border-border bg-surface-2/40">
              <td className="px-3 py-1.5">
                <input
                  type="checkbox"
                  checked={draft.pago}
                  aria-label="Novo fixo pago"
                  onChange={(e) =>
                    setDraft((d) => ({ ...d, pago: e.target.checked }))
                  }
                />
              </td>
              <td className="px-2 py-1.5">
                <Input
                  className={gridField}
                  placeholder="Aluguel"
                  value={draft.descricao}
                  onChange={(e) =>
                    setDraft((d) => ({ ...d, descricao: e.target.value }))
                  }
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      onSaveDraft();
                    }
                  }}
                />
              </td>
              <td className="px-2 py-1.5">
                <input
                  type="date"
                  className={gridField}
                  value={draft.dataIso}
                  onChange={(e) =>
                    setDraft((d) => ({ ...d, dataIso: e.target.value }))
                  }
                />
              </td>
              <td className="px-2 py-1.5">
                <AccountSelect
                  accounts={accounts}
                  value={draft.accountId}
                  onChange={(accountId) =>
                    setDraft((d) => ({ ...d, accountId }))
                  }
                />
              </td>
              <td className="px-2 py-1.5">
                <Input
                  className={gridField}
                  list="month-grid-categories"
                  placeholder="Casa"
                  value={draft.categoria}
                  onChange={(e) =>
                    setDraft((d) => ({ ...d, categoria: e.target.value }))
                  }
                />
              </td>
              <td className="px-2 py-1.5">
                <MoneyInput
                  className={clsx(gridField, "text-right")}
                  placeholder="0,00"
                  value={draft.valorStr}
                  onChange={(valorStr) =>
                    setDraft((d) => ({ ...d, valorStr }))
                  }
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      onSaveDraft();
                    }
                  }}
                />
              </td>
              <td />
            </tr>
          </tbody>
        </table>
      </div>
      <datalist id="month-grid-categories">
        {categories.map((c) => (
          <option key={c} value={c} />
        ))}
      </datalist>
    </Panel>
  );
}

function ParcelasTable({
  rows,
  accounts,
  onNew,
  onDelete,
}: {
  rows: TransactionNormalized[];
  accounts: Account[];
  onNew: () => void;
  onDelete: (tx: TransactionNormalized) => void;
}) {
  return (
    <Panel className="overflow-hidden rounded-3xl shadow-[var(--shadow-card)]">
      <SectionHead
        title="Parcelas deste mês"
        hint="A compra entra uma vez; os meses seguintes aparecem sozinhos."
        action={
          <Button size="sm" onClick={onNew}>
            <Plus size={13} />
            Nova parcela
          </Button>
        }
      />
      {rows.length === 0 ? (
        <p className="px-4 pb-4 text-sm text-muted">
          Nenhuma parcela neste mês.
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[40rem] border-collapse text-sm">
            <thead>
              <tr className="text-left text-caption uppercase tracking-wide text-muted">
                <th className="px-4 py-2">Descrição</th>
                <th className="px-2 py-2">Parcela</th>
                <th className="px-2 py-2">Data</th>
                <th className="px-2 py-2">Conta</th>
                <th className="px-2 py-2">Categoria</th>
                <th className="px-4 py-2 text-right">Valor</th>
                <th className="px-2 py-2 w-10" />
              </tr>
            </thead>
            <tbody>
              {rows.map((tx) => {
                const ref = installmentRef(tx);
                const account = resolveTransactionAccount(tx, accounts);
                const manual = isManualQuickRaw(tx);
                return (
                  <tr key={tx.id} className="border-t border-border">
                    <td className="px-4 py-2 font-medium">{tx.lancamento}</td>
                    <td className="px-2 py-2 text-muted">
                      {ref ? formatInstallmentCell(ref) : "—"}
                    </td>
                    <td className="px-2 py-2 tabular-nums">{tx.data}</td>
                    <td className="px-2 py-2 text-muted">
                      {account?.nome ?? "—"}
                    </td>
                    <td className="px-2 py-2">{tx.categoria}</td>
                    <td className="px-4 py-2 text-right">
                      <Num>{formatBRL(Math.abs(tx.valorOriginal))}</Num>
                    </td>
                    <td className="px-2 py-2">
                      {manual ? (
                        <IconDelete
                          label={`Excluir ${tx.lancamento}`}
                          onClick={() => onDelete(tx)}
                        />
                      ) : (
                        <Badge className="text-[10px]">importado</Badge>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </Panel>
  );
}

function GastosTable({
  rows,
  draft,
  setDraft,
  accounts,
  categories,
  onSaveDraft,
  onUpdate,
  onDelete,
}: {
  rows: TransactionNormalized[];
  draft: Draft;
  setDraft: React.Dispatch<React.SetStateAction<Draft>>;
  accounts: Account[];
  categories: string[];
  onSaveDraft: () => void;
  onUpdate: (
    tx: TransactionNormalized,
    patch: {
      data?: string;
      lancamento?: string;
      categoria?: string;
      valorOriginal?: number;
      accountId?: string;
    },
  ) => void;
  onDelete: (tx: TransactionNormalized) => void;
}) {
  const descRef = useRef<HTMLInputElement>(null);

  return (
    <Panel className="overflow-hidden rounded-3xl shadow-[var(--shadow-card)]">
      <SectionHead
        title="Gastos do mês"
        hint="Mercado, Uber, assinatura. Tab anda entre células; Enter grava e abre a próxima linha."
      />
      <div className="overflow-x-auto">
        <table className="w-full min-w-[44rem] border-collapse text-sm">
          <thead>
            <tr className="text-left text-caption uppercase tracking-wide text-muted">
              <th className="px-4 py-2">Descrição</th>
              <th className="px-2 py-2 w-36">Data</th>
              <th className="px-2 py-2 w-40">Conta</th>
              <th className="px-2 py-2 w-40">Categoria</th>
              <th className="px-2 py-2 w-28 text-right">Valor</th>
              <th className="px-2 py-2 w-10" />
            </tr>
          </thead>
          <tbody>
            {rows.map((tx) => {
              const account = resolveTransactionAccount(tx, accounts);
              return (
                <tr key={tx.id} className="border-t border-border">
                  <td className="px-3 py-1.5">
                    <CommitInput
                      className={gridField}
                      value={tx.lancamento}
                      onCommit={(lancamento) =>
                        onUpdate(tx, { lancamento: lancamento.trim() })
                      }
                    />
                  </td>
                  <td className="px-2 py-1.5">
                    <input
                      type="date"
                      className={gridField}
                      value={tx.dataISO}
                      onChange={(e) =>
                        onUpdate(tx, { data: isoToBr(e.target.value) })
                      }
                    />
                  </td>
                  <td className="px-2 py-1.5">
                    <AccountSelect
                      accounts={accounts}
                      value={account?.id ?? tx.accountId ?? ""}
                      onChange={(accountId) => onUpdate(tx, { accountId })}
                    />
                  </td>
                  <td className="px-2 py-1.5">
                    <CommitInput
                      className={gridField}
                      list="month-grid-gasto-categories"
                      value={tx.categoria}
                      onCommit={(categoria) => onUpdate(tx, { categoria })}
                    />
                  </td>
                  <td className="px-2 py-1.5">
                    <CommitMoney
                      value={Math.abs(tx.valorOriginal)}
                      onCommit={(valorOriginal) =>
                        onUpdate(tx, { valorOriginal })
                      }
                    />
                  </td>
                  <td className="px-2 py-1.5">
                    <IconDelete
                      label={`Excluir ${tx.lancamento}`}
                      onClick={() => onDelete(tx)}
                    />
                  </td>
                </tr>
              );
            })}
            <tr className="border-t border-border bg-surface-2/40">
              <td className="px-3 py-1.5">
                <Input
                  ref={descRef}
                  className={gridField}
                  placeholder="Mercado, Uber…"
                  value={draft.descricao}
                  onChange={(e) =>
                    setDraft((d) => ({ ...d, descricao: e.target.value }))
                  }
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      onSaveDraft();
                    }
                  }}
                />
              </td>
              <td className="px-2 py-1.5">
                <input
                  type="date"
                  className={gridField}
                  value={draft.dataIso}
                  onChange={(e) =>
                    setDraft((d) => ({ ...d, dataIso: e.target.value }))
                  }
                />
              </td>
              <td className="px-2 py-1.5">
                <AccountSelect
                  accounts={accounts}
                  value={draft.accountId}
                  onChange={(accountId) =>
                    setDraft((d) => ({ ...d, accountId }))
                  }
                />
              </td>
              <td className="px-2 py-1.5">
                <Input
                  className={gridField}
                  list="month-grid-gasto-categories"
                  placeholder="Alimentação"
                  value={draft.categoria}
                  onChange={(e) =>
                    setDraft((d) => ({ ...d, categoria: e.target.value }))
                  }
                />
              </td>
              <td className="px-2 py-1.5">
                <MoneyInput
                  className={clsx(gridField, "text-right")}
                  placeholder="0,00"
                  value={draft.valorStr}
                  onChange={(valorStr) =>
                    setDraft((d) => ({ ...d, valorStr }))
                  }
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      onSaveDraft();
                    }
                  }}
                />
              </td>
              <td />
            </tr>
          </tbody>
        </table>
      </div>
      <datalist id="month-grid-gasto-categories">
        {categories.map((c) => (
          <option key={c} value={c} />
        ))}
      </datalist>
    </Panel>
  );
}

function BudgetsTable({
  rows,
}: {
  rows: ReturnType<typeof monthCategoryRows>;
}) {
  const orcado = rows.reduce((s, r) => s + r.orcado, 0);
  const realizado = rows.reduce((s, r) => s + r.realizado, 0);

  return (
    <Panel className="overflow-hidden rounded-3xl shadow-[var(--shadow-card)]">
      <SectionHead
        title="Por categoria"
        hint="Orçado vem dos orçamentos em Config. Realizado soma o que já está no mês."
      />
      {rows.length === 0 ? (
        <p className="px-4 pb-4 text-sm text-muted">
          Sem gastos nem orçamentos neste mês.
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="text-left text-caption uppercase tracking-wide text-muted">
                <th className="px-4 py-2">Categoria</th>
                <th className="px-2 py-2 text-right">Orçado</th>
                <th className="px-2 py-2 text-right">Realizado</th>
                <th className="px-4 py-2 w-40"> </th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.categoria} className="border-t border-border">
                  <td className="px-4 py-2 font-medium">{row.categoria}</td>
                  <td className="px-2 py-2 text-right">
                    <Num>{row.orcado > 0 ? formatBRL(row.orcado) : "—"}</Num>
                  </td>
                  <td
                    className={clsx(
                      "px-2 py-2 text-right",
                      row.status === "danger" && "text-danger",
                      row.status === "warning" && "text-warning",
                    )}
                  >
                    <Num>{formatBRL(row.realizado)}</Num>
                  </td>
                  <td className="px-4 py-2">
                    <div className="h-1.5 overflow-hidden rounded-full bg-surface-2">
                      <div
                        className={clsx(
                          "h-full rounded-full",
                          row.status === "danger" && "bg-[var(--system-red)]",
                          row.status === "warning" &&
                            "bg-[var(--system-orange)]",
                          row.status === "ok" && "bg-[var(--system-green)]",
                        )}
                        style={{
                          width: `${Math.min(100, row.percentual)}%`,
                        }}
                      />
                    </div>
                  </td>
                </tr>
              ))}
              <tr className="border-t border-border bg-surface-2/40">
                <td className="px-4 py-2 text-xs uppercase tracking-wide text-muted">
                  Total
                </td>
                <td className="px-2 py-2 text-right font-medium">
                  <Num>{formatBRL(orcado)}</Num>
                </td>
                <td className="px-2 py-2 text-right font-medium">
                  <Num>{formatBRL(realizado)}</Num>
                </td>
                <td />
              </tr>
            </tbody>
          </table>
        </div>
      )}
    </Panel>
  );
}

function SectionHead({
  title,
  hint,
  action,
}: {
  title: string;
  hint: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex items-start justify-between gap-3 px-4 py-3">
      <div>
        <h2 className="text-sm font-semibold tracking-tight">{title}</h2>
        <p className="mt-0.5 text-xs text-muted">{hint}</p>
      </div>
      {action}
    </div>
  );
}

function IconDelete({
  label,
  onClick,
}: {
  label: string;
  onClick: () => void;
}) {
  return (
    <Button variant="ghost" size="sm" aria-label={label} onClick={onClick}>
      <Trash2 size={14} />
    </Button>
  );
}

function CommitInput({
  value,
  onCommit,
  className,
  ...props
}: {
  value: string;
  onCommit: (next: string) => void;
} & Omit<React.InputHTMLAttributes<HTMLInputElement>, "value" | "onChange">) {
  const [local, setLocal] = useState(value);
  useEffect(() => setLocal(value), [value]);
  function commit() {
    if (local !== value) onCommit(local);
  }
  return (
    <input
      {...props}
      className={className}
      value={local}
      onChange={(e) => setLocal(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => {
        if (e.key === "Enter") {
          e.preventDefault();
          commit();
          (e.currentTarget as HTMLInputElement).blur();
        }
      }}
    />
  );
}

function CommitMoney({
  value,
  onCommit,
}: {
  value: number;
  onCommit: (next: number) => void;
}) {
  const [local, setLocal] = useState(moneyToInput(value));
  useEffect(() => setLocal(moneyToInput(value)), [value]);
  function commit() {
    const parsed = parseMoney(local);
    if (parsed == null) {
      setLocal(moneyToInput(value));
      return;
    }
    if (Math.abs(parsed - value) > 0.005) onCommit(parsed);
  }
  return (
    <MoneyInput
      className={clsx(gridField, "text-right")}
      value={local}
      onChange={setLocal}
      onBlur={commit}
      onKeyDown={(e) => {
        if (e.key === "Enter") {
          e.preventDefault();
          commit();
          (e.currentTarget as HTMLInputElement).blur();
        }
      }}
    />
  );
}
