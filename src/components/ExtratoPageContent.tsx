"use client"

import { useMemo, useState } from "react"
import { ChevronLeft, ChevronRight, Plus } from "lucide-react"
import { QuickAddModal } from "@/components/QuickAddModal"
import { TransactionActions } from "@/components/transaction/TransactionActions"
import {
  canEditTransaction,
  resolveEditCurrent,
  TransactionEditHost,
} from "@/components/transaction/TransactionEditHost"
import {
  PaymentStatusBadge,
  PaymentStatusToggle,
} from "@/components/transaction/PaymentStatusControls"
import { Badge } from "@/components/ui/Badge"
import { LabelWithInfo } from "@/components/ui/LabelWithInfo"
import { g, type GlossaryKey } from "@/lib/glossary"
import { Button } from "@/components/ui/Button"
import { Input, Select } from "@/components/ui/Input"
import { Num } from "@/components/ui/Num"
import { Panel } from "@/components/ui/Panel"
import { SegmentedControl } from "@/components/ui/SegmentedControl"
import { ACCOUNT_KIND_LABELS } from "@/lib/accounts"
import { addDaysIso, addMonthsYyyyMm, todayIso } from "@/lib/dates"
import { isEdited, isRecurringRaw, canRevertTransaction, installmentDeleteConfirmMessage, allowsPerMonthRecurringEdit, recurringMonthlyDeleteConfirmMessage } from "@/lib/edits"
import { isManualQuickRaw } from "@/lib/manualTransactions"
import { formatBRL, formatDateBR, formatMonthLabel, formatInt } from "@/lib/format"
import {
  derivePaymentState,
  matchesPaymentFilter,
  summarizePaymentMonth,
  type PaymentFilter,
} from "@/lib/paymentStatus"
import { isForecastTransaction } from "@/lib/recurring"
import { useAppStore } from "@/lib/store"
import {
  groupTransactionsByDay,
  isCashTransaction,
  resolveTransactionAccount,
  signedFlow,
} from "@/lib/transactionViews"
import { TransactionNormalized } from "@/lib/types"

export function ExtratoPageContent() {
  const {
    normalized,
    accounts,
    settings,
    edits,
    installmentGroupEdits,
    paymentStatus,
    findOriginalRaw,
    editTransaction,
    revertTransaction,
    deleteTransaction,
    setPaymentStatus,
  } = useAppStore()
  const [month, setMonth] = useState(todayIso().slice(0, 7))
  const [accountId, setAccountId] = useState("all")
  const [paymentFilter, setPaymentFilter] = useState<PaymentFilter>("all")
  const [editRow, setEditRow] = useState<TransactionNormalized | null>(null)
  const [quickAddOpen, setQuickAddOpen] = useState(false)

  const cashAccounts = useMemo(
    () => accounts.filter((account) => account.ativa && account.kind !== "cartao"),
    [accounts],
  )

  const monthTransactions = useMemo(
    () =>
      normalized.filter((tx) => {
        if (!isCashTransaction(tx, accounts)) return false
        if (tx.anoMes !== month) return false
        if (accountId === "all") return true
        return resolveTransactionAccount(tx, accounts)?.id === accountId
      }),
    [normalized, accounts, month, accountId],
  )

  const transactions = useMemo(
    () =>
      monthTransactions.filter((tx) => {
        if (paymentFilter === "all") return true
        const state = derivePaymentState(tx, paymentStatus)
        return matchesPaymentFilter(state, paymentFilter)
      }),
    [monthTransactions, paymentFilter, paymentStatus],
  )

  const groups = useMemo(() => groupTransactionsByDay(transactions), [transactions])
  const totals = useMemo(
    () =>
      transactions.reduce(
        (acc, tx) => {
          if (tx.tipoFluxo === "entrada") acc.income += tx.valorFluxo
          if (tx.tipoFluxo === "saida") acc.outcome += tx.valorFluxo
          acc.net += signedFlow(tx)
          return acc
        },
        { income: 0, outcome: 0, net: 0 },
      ),
    [transactions],
  )
  const paymentSummary = useMemo(
    () => summarizePaymentMonth(monthTransactions, paymentStatus),
    [monthTransactions, paymentStatus],
  )

  const projectionHorizonEnd = useMemo(
    () => addDaysIso(todayIso(), settings.projectionHorizonDays),
    [settings.projectionHorizonDays],
  )
  const beyondProjectionHorizon = month > projectionHorizonEnd.slice(0, 7)

  const { original: editOriginal, current: editCurrent } = resolveEditCurrent(
    editRow,
    findOriginalRaw,
    edits,
    installmentGroupEdits,
  )

  const handleDelete = (tx: TransactionNormalized) => {
    const original = findOriginalRaw(tx.id)
    const installment = original?.installment ?? tx.installment
    const message =
      original && allowsPerMonthRecurringEdit(original)
        ? recurringMonthlyDeleteConfirmMessage(original)
        : installmentDeleteConfirmMessage(
            installment,
            "Excluir esta transação da análise? Você pode restaurá-la em Transações.",
          )
    if (globalThis.confirm(message)) {
      deleteTransaction(tx.id)
    }
  }

  const handlePaymentToggle = (rawId: string, status: "pago" | "a_pagar") => {
    void setPaymentStatus(rawId, status)
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-[0.22em] text-muted">Extrato</p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight">
            <LabelWithInfo info={g("extrato")} ariaTopic="Movimentos de conta">
              Movimentos de conta
            </LabelWithInfo>
          </h1>
          <p className="mt-1 text-sm text-muted">
            Conta-corrente, carteira e poupança em um fluxo separado dos cartões.
          </p>
        </div>
        <Button
          variant="primary"
          className="rounded-full"
          onClick={() => setQuickAddOpen(true)}
        >
          <Plus size={14} />
          Adicionar
        </Button>
      </div>

      <Panel className="rounded-3xl p-4 shadow-[var(--shadow-card)]">
        <div className="grid gap-3 md:grid-cols-[auto_1fr_auto] md:items-end">
          <div className="flex items-center gap-2">
            <Button size="sm" aria-label="Mês anterior" onClick={() => setMonth(addMonthsYyyyMm(month, -1))}>
              <ChevronLeft size={14} />
            </Button>
            <label className="block min-w-40 space-y-1">
              <span className="text-xs text-muted">Mês</span>
              <Input type="month" value={month} onChange={(event) => setMonth(event.target.value)} />
            </label>
            <Button size="sm" aria-label="Próximo mês" onClick={() => setMonth(addMonthsYyyyMm(month, 1))}>
              <ChevronRight size={14} />
            </Button>
          </div>

          <label className="block space-y-1">
            <span className="text-xs text-muted">Conta</span>
            <Select value={accountId} onChange={(event) => setAccountId(event.target.value)}>
              <option value="all">Todas as contas</option>
              {cashAccounts.map((account) => (
                <option key={account.id} value={account.id}>
                  {account.nome}
                </option>
              ))}
            </Select>
          </label>

          <div className="grid grid-cols-2 gap-2 text-sm md:min-w-[24rem] md:grid-cols-4">
            <Summary label="Entradas" value={totals.income} tone="success" infoKey="entradasExtrato" />
            <Summary label="Saídas" value={-totals.outcome} tone="danger" infoKey="saidasExtrato" />
            <Summary
              label="Saldo"
              value={totals.net}
              tone={totals.net >= 0 ? "success" : "danger"}
              infoKey="saldoExtrato"
            />
            <Summary
              label="A pagar"
              value={-paymentSummary.pendingTotal}
              tone="danger"
              infoKey="aPagarExtrato"
              detail={
                paymentSummary.pendingCount > 0
                  ? `${formatInt(paymentSummary.pendingCount)} conta${paymentSummary.pendingCount === 1 ? "" : "s"}`
                  : undefined
              }
            />
          </div>
        </div>

        <div className="mt-4 border-t border-border/70 pt-4">
          <SegmentedControl
            size="sm"
            value={paymentFilter}
            onChange={setPaymentFilter}
            options={[
              { value: "all", label: "Tudo" },
              { value: "pending", label: "A pagar" },
              { value: "paid", label: "Pagas" },
            ]}
          />
        </div>
      </Panel>

      <Panel className="overflow-hidden rounded-3xl shadow-[var(--shadow-card)]">
        <div className="border-b border-border px-4 py-3">
          <h2 className="text-sm font-semibold tracking-tight">
            {formatMonthLabel(month)} · {formatInt(transactions.length)} lançamento
            {transactions.length === 1 ? "" : "s"}
          </h2>
        </div>

        <div className="divide-y divide-border">
          {groups.map((group) => (
            <section key={group.date}>
              <div className="flex items-center justify-between bg-surface-2/60 px-4 py-2">
                <span className="text-xs font-medium text-muted">{formatDateBR(group.date)}</span>
                <Num className="text-xs text-muted">{formatBRL(group.total)}</Num>
              </div>
              <div className="divide-y divide-border/70">
                {group.transactions.map((tx) => {
                  const account = resolveTransactionAccount(tx, accounts)
                  const recurring = isRecurringRaw(tx)
                  const original = findOriginalRaw(tx.id)
                  const paymentState = derivePaymentState(tx, paymentStatus)
                  const canEditTx = canEditTransaction(original)
                  const canRevert =
                    canRevertTransaction(tx.id, edits, installmentGroupEdits, original) &&
                    !!original &&
                    !isManualQuickRaw(original)
                  const flow = signedFlow(tx)
                  return (
                    <div
                      key={tx.id}
                      className="grid gap-3 px-4 py-3 md:grid-cols-[minmax(0,1fr)_auto_auto_auto] md:items-center"
                    >
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="truncate text-sm font-medium">{tx.lancamento}</p>
                          {isEdited(tx.id, edits, installmentGroupEdits, original ?? tx) && (
                            <Badge className="text-[10px]" info={g("editado")}>editado</Badge>
                          )}
                          {recurring && (
                            <Badge className="text-[10px]" info={g("recorrente")}>recorrente</Badge>
                          )}
                          {isForecastTransaction(tx) && (
                            <Badge className="text-[10px]" info={g("previsto")}>previsto</Badge>
                          )}
                          <PaymentStatusBadge state={paymentState} />
                        </div>
                        <p className="mt-0.5 text-xs text-muted">
                          {tx.categoria || "Sem categoria"} · {account?.nome ?? "Conta não definida"} ·{" "}
                          {account ? ACCOUNT_KIND_LABELS[account.kind] : "Origem manual"}
                        </p>
                      </div>
                      <Num
                        className={
                          paymentState === "pago"
                            ? "text-sm text-muted line-through decoration-border"
                            : flow >= 0
                              ? "text-sm text-success"
                              : "text-sm text-danger"
                        }
                      >
                        {formatBRL(flow)}
                      </Num>
                      <PaymentStatusToggle
                        tx={tx}
                        paymentStatus={paymentStatus}
                        onToggle={handlePaymentToggle}
                      />
                      <TransactionActions
                        tx={tx}
                        canEdit={canEditTx}
                        canRevert={canRevert}
                        onEdit={setEditRow}
                        onDelete={handleDelete}
                        onRevert={(row) => revertTransaction(row.id)}
                      />
                    </div>
                  )
                })}
              </div>
            </section>
          ))}

          {groups.length === 0 && (
            <div className="px-4 py-10 text-center text-sm text-muted">
              {paymentFilter === "all"
                ? beyondProjectionHorizon
                  ? `Nenhum movimento previsto em ${formatMonthLabel(month)}. A projeção vai até ${formatDateBR(projectionHorizonEnd)} (horizonte em Config).`
                  : `Nenhum movimento de conta em ${formatMonthLabel(month)}.`
                : paymentFilter === "pending"
                  ? `Nenhuma conta a pagar em ${formatMonthLabel(month)}.`
                  : `Nenhuma conta marcada como paga em ${formatMonthLabel(month)}.`}
            </div>
          )}
        </div>
      </Panel>

      {editRow && (
        <TransactionEditHost
          editRow={editRow}
          editOriginal={editOriginal}
          editCurrent={editCurrent}
          edits={edits}
          installmentGroupEdits={installmentGroupEdits}
          paymentStatus={paymentStatus}
          onSave={(id, patch) => editTransaction(id, patch)}
          onRevert={revertTransaction}
          onHideMonth={deleteTransaction}
          onPaymentToggle={(id, status) => void setPaymentStatus(id, status)}
          onClose={() => setEditRow(null)}
        />
      )}

      <QuickAddModal
        open={quickAddOpen}
        draft={{ accountId: cashAccounts[0]?.id }}
        onClose={() => setQuickAddOpen(false)}
      />
    </div>
  )
}

function Summary({
  label,
  value,
  tone,
  infoKey,
  detail,
}: Readonly<{
  label: string
  value: number
  tone: "success" | "danger"
  infoKey?: GlossaryKey
  detail?: string
}>) {
  return (
    <div className="rounded-2xl bg-surface-2/70 p-3">
      <LabelWithInfo
        labelClassName="text-[10px] uppercase tracking-wider text-muted"
        info={infoKey ? g(infoKey) : undefined}
        ariaTopic={label}
      >
        {label}
      </LabelWithInfo>
      <Num className={tone === "success" ? "text-sm font-semibold text-success" : "text-sm font-semibold text-danger"}>
        {formatBRL(value)}
      </Num>
      {detail && <p className="mt-0.5 text-[10px] text-muted">{detail}</p>}
    </div>
  )
}
