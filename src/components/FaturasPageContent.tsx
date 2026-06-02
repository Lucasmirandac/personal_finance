"use client"

import { useMemo, useState } from "react"
import clsx from "clsx"
import { ChevronDown, ChevronRight, CreditCard } from "lucide-react"
import { TransactionEditModal } from "@/components/TransactionEditModal"
import { TransactionActions } from "@/components/transaction/TransactionActions"
import { Badge } from "@/components/ui/Badge"
import { Num } from "@/components/ui/Num"
import { Panel } from "@/components/ui/Panel"
import { todayIso } from "@/lib/dates"
import { isEdited, isRecurringRaw, mergeRawWithAllEdits, canRevertTransaction, installmentDeleteConfirmMessage } from "@/lib/edits"
import { formatBRL, formatDateBR, formatInt } from "@/lib/format"
import { isManualQuickRaw } from "@/lib/manualTransactions"
import { useAppStore } from "@/lib/store"
import {
  CardCycleGroup,
  groupCardTransactionsByCycle,
  isCardTransaction,
  resolveTransactionAccount,
} from "@/lib/transactionViews"
import { TransactionNormalized } from "@/lib/types"

export function FaturasPageContent() {
  const {
    normalized,
    accounts,
    edits,
    installmentGroupEdits,
    findOriginalRaw,
    editTransaction,
    revertTransaction,
    deleteTransaction,
  } = useAppStore()
  const [selectedCardId, setSelectedCardId] = useState<string | null>(null)
  const [expanded, setExpanded] = useState<Record<string, boolean>>({})
  const [editRow, setEditRow] = useState<TransactionNormalized | null>(null)

  const cardAccounts = useMemo(
    () => accounts.filter((account) => account.ativa && account.kind === "cartao"),
    [accounts],
  )
  const activeCardId = selectedCardId ?? cardAccounts[0]?.id ?? null

  const cardTransactions = useMemo(
    () => normalized.filter((tx) => isCardTransaction(tx, accounts)),
    [normalized, accounts],
  )

  const cycles = useMemo(
    () => groupCardTransactionsByCycle(cardTransactions, accounts),
    [cardTransactions, accounts],
  )

  const selectedCycles = useMemo(() => {
    if (!activeCardId) return []
    const today = todayIso()
    const groups = cycles.filter((group) => group.account.id === activeCardId)
    const upcoming = groups
      .filter((group) => group.payDate >= today)
      .sort((a, b) => (a.payDate < b.payDate ? -1 : 1))
    const past = groups
      .filter((group) => group.payDate < today)
      .sort((a, b) => (a.payDate < b.payDate ? 1 : -1))
    return [...upcoming, ...past]
  }, [cycles, activeCardId])

  const currentCycle = selectedCycles[0] ?? null
  const editOriginal = editRow ? findOriginalRaw(editRow.id) : undefined
  const editCurrent =
    editRow && editOriginal
      ? mergeRawWithAllEdits(editOriginal, edits, installmentGroupEdits)
      : undefined

  const toggleCycle = (key: string) => {
    setExpanded((current) => ({ ...current, [key]: !current[key] }))
  }

  const handleDelete = (tx: TransactionNormalized) => {
    const original = findOriginalRaw(tx.id)
    const installment = original?.installment ?? tx.installment
    const message = installmentDeleteConfirmMessage(
      installment,
      "Excluir esta compra da análise? Você pode restaurá-la em Transações.",
    )
    if (globalThis.confirm(message)) {
      deleteTransaction(tx.id)
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-[0.22em] text-muted">Faturas</p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight">Compras por cartão</h1>
          <p className="mt-1 text-sm text-muted">
            Edite compras no contexto da fatura, separadas dos movimentos de conta.
          </p>
        </div>
      </div>

      {cardAccounts.length === 0 ? (
        <Panel className="rounded-3xl p-6 text-sm text-muted shadow-[var(--shadow-card)]">
          Nenhum cartão ativo configurado. Cadastre cartões em Configurações &gt; Contas.
        </Panel>
      ) : (
        <>
          <Panel className="rounded-3xl p-3 shadow-[var(--shadow-card)]">
            <div className="flex gap-2 overflow-x-auto no-scrollbar">
              {cardAccounts.map((account) => (
                <button
                  key={account.id}
                  type="button"
                  className={clsx(
                    "inline-flex items-center gap-2 rounded-full px-3 py-2 text-sm transition-colors whitespace-nowrap",
                    activeCardId === account.id
                      ? "bg-foreground text-surface"
                      : "bg-surface-2 text-muted hover:text-foreground",
                  )}
                  onClick={() => setSelectedCardId(account.id)}
                >
                  <CreditCard size={14} />
                  {account.nome}
                </button>
              ))}
            </div>
          </Panel>

          <div className="grid gap-3 md:grid-cols-3">
            <CycleSummary label="Fatura em foco" group={currentCycle} />
            <CycleSummary label="Compras" group={currentCycle} mode="count" />
            <CycleSummary label="Pagamento" group={currentCycle} mode="date" />
          </div>

          <div className="space-y-3">
            {selectedCycles.map((group, index) => (
              <CyclePanel
                key={group.key}
                group={group}
                open={expanded[group.key] ?? index === 0}
                onToggle={() => toggleCycle(group.key)}
                edits={edits}
                installmentGroupEdits={installmentGroupEdits}
                findOriginalRaw={findOriginalRaw}
                onEdit={setEditRow}
                onDelete={handleDelete}
                onRevert={(row) => revertTransaction(row.id)}
              />
            ))}
            {selectedCycles.length === 0 && (
              <Panel className="rounded-3xl p-6 text-center text-sm text-muted shadow-[var(--shadow-card)]">
                Nenhuma compra encontrada para este cartão.
              </Panel>
            )}
          </div>
        </>
      )}

      {editRow && editOriginal && editCurrent && (
        <TransactionEditModal
          open
          original={editOriginal}
          current={editCurrent}
          canRevert={
            canRevertTransaction(editRow.id, edits, installmentGroupEdits, editOriginal) &&
            !isManualQuickRaw(editOriginal)
          }
          onSave={(patch) => editTransaction(editRow.id, patch)}
          onRevert={() => revertTransaction(editRow.id)}
          onClose={() => setEditRow(null)}
        />
      )}
    </div>
  )
}

function CycleSummary({
  label,
  group,
  mode = "total",
}: Readonly<{
  label: string
  group: CardCycleGroup | null
  mode?: "total" | "count" | "date"
}>) {
  let value = group ? formatBRL(group.total) : "—"
  if (mode === "count") {
    const purchaseLabel =
      group?.transactions.length === 1 ? "compra" : "compras"
    value = group
      ? `${formatInt(group.transactions.length)} ${purchaseLabel}`
      : "—"
  }
  if (mode === "date") {
    value = group ? formatDateBR(group.payDate) : "—"
  }

  return (
    <Panel className="rounded-3xl p-4 shadow-[var(--shadow-card)]">
      <p className="text-[10px] uppercase tracking-wider text-muted">{label}</p>
      <p className="mt-1 text-lg font-semibold tracking-tight">{value}</p>
      {group && mode === "total" && (
        <p className="mt-1 text-xs text-muted">
          Fecha dia {group.closeDay} · paga dia {group.paymentDay}
        </p>
      )}
    </Panel>
  )
}

function CyclePanel({
  group,
  open,
  onToggle,
  edits,
  installmentGroupEdits,
  findOriginalRaw,
  onEdit,
  onDelete,
  onRevert,
}: Readonly<{
  group: CardCycleGroup
  open: boolean
  onToggle: () => void
  edits: ReturnType<typeof useAppStore>["edits"]
  installmentGroupEdits: ReturnType<typeof useAppStore>["installmentGroupEdits"]
  findOriginalRaw: ReturnType<typeof useAppStore>["findOriginalRaw"]
  onEdit: (tx: TransactionNormalized) => void
  onDelete: (tx: TransactionNormalized) => void
  onRevert: (tx: TransactionNormalized) => void
}>) {
  const today = todayIso()
  const status = group.payDate >= today ? "Aberta / próxima" : "Fechada"

  return (
    <Panel className="overflow-hidden rounded-3xl shadow-[var(--shadow-card)]">
      <button
        type="button"
        className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left hover:bg-surface-2/60"
        onClick={onToggle}
      >
        <span className="min-w-0">
          <span className="flex flex-wrap items-center gap-2">
            <span className="font-semibold tracking-tight">Fatura {formatDateBR(group.payDate)}</span>
            <Badge>{status}</Badge>
          </span>
          <span className="mt-0.5 block text-xs text-muted">
            {group.account.nome} · {formatInt(group.transactions.length)} compra
            {group.transactions.length === 1 ? "" : "s"} · pagamento dia {group.paymentDay}
          </span>
        </span>
        <span className="flex shrink-0 items-center gap-3">
          <Num className="text-sm font-semibold">{formatBRL(group.total)}</Num>
          {open ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
        </span>
      </button>

      {open && (
        <div className="divide-y divide-border border-t border-border">
          {group.transactions.map((tx) => {
            const account = resolveTransactionAccount(tx, [group.account])
            const recurring = isRecurringRaw(tx)
            const original = findOriginalRaw(tx.id)
            const canRevert =
              canRevertTransaction(tx.id, edits, installmentGroupEdits, original) &&
              !!original &&
              !isManualQuickRaw(original)
            return (
              <div
                key={tx.id}
                className="grid gap-3 px-4 py-3 md:grid-cols-[minmax(0,1fr)_auto_auto] md:items-center"
              >
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="truncate text-sm font-medium">{tx.lancamento}</p>
                    {isEdited(tx.id, edits, installmentGroupEdits, original ?? tx) && (
                      <Badge className="text-[10px]">editado</Badge>
                    )}
                  </div>
                  <p className="mt-0.5 text-xs text-muted">
                    {formatDateBR(tx.dataISO)} · {tx.categoria || "Sem categoria"} · {account?.nome ?? group.account.nome}
                  </p>
                </div>
                <Num className="text-sm text-danger">{formatBRL(tx.valorAnalise)}</Num>
                <TransactionActions
                  tx={tx}
                  canEdit={!recurring && !!original}
                  canRevert={canRevert}
                  onEdit={onEdit}
                  onDelete={onDelete}
                  onRevert={onRevert}
                />
              </div>
            )
          })}
        </div>
      )}
    </Panel>
  )
}
