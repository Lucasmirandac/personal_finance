"use client"

import { useMemo, useState } from "react"
import Link from "next/link"
import { ArrowRight, CalendarDays, Landmark, Plus, Route } from "lucide-react"
import { QuickAddModal } from "@/components/QuickAddModal"
import { TransactionEditModal } from "@/components/TransactionEditModal"
import { TransactionActions } from "@/components/transaction/TransactionActions"
import { Badge } from "@/components/ui/Badge"
import { Button } from "@/components/ui/Button"
import { Num } from "@/components/ui/Num"
import { Panel } from "@/components/ui/Panel"
import { todayIso } from "@/lib/dates"
import { isEdited, isRecurringRaw, mergeRawWithAllEdits, canRevertTransaction } from "@/lib/edits"
import { formatBRL, formatDateBR } from "@/lib/format"
import { isManualQuickRaw } from "@/lib/manualTransactions"
import { useAppStore } from "@/lib/store"
import {
  resolveTransactionAccount,
  signedFlow,
  sortTransactionsDesc,
} from "@/lib/transactionViews"
import { TransactionNormalized } from "@/lib/types"

export function TodayTransactionsPanel() {
  const {
    normalized,
    accounts,
    edits,
    installmentGroupEdits,
    findOriginalRaw,
    editTransaction,
    revertTransaction,
  } = useAppStore()
  const [editRow, setEditRow] = useState<TransactionNormalized | null>(null)
  const [quickAddOpen, setQuickAddOpen] = useState(false)
  const today = todayIso()

  const recent = useMemo(() => {
    const todayRows = normalized.filter((tx) => tx.dataISO === today)
    if (todayRows.length > 0) return sortTransactionsDesc(todayRows).slice(0, 5)
    const cutoff = sevenDaysBefore(today)
    return sortTransactionsDesc(normalized.filter((tx) => tx.dataISO >= cutoff && tx.dataISO <= today)).slice(0, 5)
  }, [normalized, today])

  const editOriginal = editRow ? findOriginalRaw(editRow.id) : undefined
  const editCurrent =
    editRow && editOriginal
      ? mergeRawWithAllEdits(editOriginal, edits, installmentGroupEdits)
      : undefined

  return (
    <Panel className="rounded-3xl p-4 shadow-[var(--shadow-card)]">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-[0.22em] text-muted">Lançamentos</p>
          <h2 className="mt-1 text-xl font-semibold tracking-tight">Edite sem procurar</h2>
          <p className="mt-1 text-xs text-muted">Hoje primeiro; se vazio, últimos 7 dias.</p>
        </div>
        <Button size="sm" variant="primary" className="rounded-full" onClick={() => setQuickAddOpen(true)}>
          <Plus size={13} />
          Adicionar
        </Button>
      </div>

      <div className="mt-4 space-y-2">
        {recent.map((tx) => {
          const account = resolveTransactionAccount(tx, accounts)
          const recurring = isRecurringRaw(tx)
          const original = findOriginalRaw(tx.id)
          const canRevert =
            canRevertTransaction(tx.id, edits, installmentGroupEdits, original) &&
            !!original &&
            !isManualQuickRaw(original)
          const flow = signedFlow(tx)
          const isCard = account?.kind === "cartao"
          let badgeVariant: "gasto" | "receita" | "fixa" = "fixa"
          if (isCard) badgeVariant = "gasto"
          else if (flow >= 0) badgeVariant = "receita"
          return (
            <div key={tx.id} className="rounded-2xl bg-surface-2/70 p-3">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <Badge variant={badgeVariant}>
                      {isCard ? "Cartão" : "Conta"}
                    </Badge>
                    {isEdited(tx.id, edits, installmentGroupEdits, original ?? tx) && (
                      <Badge className="text-[10px]">editado</Badge>
                    )}
                  </div>
                  <p className="mt-1 truncate text-sm font-medium">{tx.lancamento}</p>
                  <p className="text-xs text-muted">
                    {formatDateBR(tx.dataISO)} · {account?.nome ?? "Conta não definida"}
                  </p>
                </div>
                <div className="shrink-0 text-right">
                  <Num className={isCard || flow < 0 ? "text-sm text-danger" : "text-sm text-success"}>
                    {formatBRL(isCard ? tx.valorAnalise : flow)}
                  </Num>
                  <div className="mt-1">
                    <TransactionActions
                      tx={tx}
                      canEdit={!recurring && !!original}
                      canRevert={canRevert}
                      onEdit={setEditRow}
                      onRevert={(row) => revertTransaction(row.id)}
                    />
                  </div>
                </div>
              </div>
            </div>
          )
        })}

        {recent.length === 0 && (
          <div className="rounded-2xl bg-surface-2/70 p-4 text-sm text-muted">
            Nenhum lançamento recente. Cadastre um gasto, receita ou ajuste para aparecer aqui.
          </div>
        )}
      </div>

      <div className="mt-4 grid gap-2">
        <QuickLink href="/extrato" title="Ver extrato" description="Conta-corrente, carteira e poupança" />
        <QuickLink href="/faturas" title="Ver faturas" description="Compras agrupadas por cartão" />
        <div className="grid grid-cols-3 gap-2">
          <MiniLink href="/futuro" icon={<CalendarDays size={14} />} label="Futuro" />
          <MiniLink href="/divisor" icon={<Route size={14} />} label="Divisor" />
          <MiniLink href="/config?tab=contas" icon={<Landmark size={14} />} label="Contas" />
        </div>
      </div>

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

      <QuickAddModal open={quickAddOpen} onClose={() => setQuickAddOpen(false)} />
    </Panel>
  )
}

function QuickLink({
  href,
  title,
  description,
}: Readonly<{
  href: string
  title: string
  description: string
}>) {
  return (
    <Link
      href={href}
      className="group flex items-center justify-between gap-3 rounded-2xl bg-surface-2/70 p-3 transition-colors hover:bg-surface-2"
    >
      <span className="min-w-0">
        <span className="block text-sm font-medium">{title}</span>
        <span className="block truncate text-xs text-muted">{description}</span>
      </span>
      <ArrowRight size={16} className="text-muted transition-transform group-hover:translate-x-0.5" />
    </Link>
  )
}

function MiniLink({
  href,
  icon,
  label,
}: Readonly<{
  href: string
  icon: React.ReactNode
  label: string
}>) {
  return (
    <Link
      href={href}
      className="flex items-center justify-center gap-1 rounded-2xl bg-surface-2/70 px-2 py-2 text-xs text-muted transition-colors hover:bg-surface-2 hover:text-foreground"
    >
      {icon}
      {label}
    </Link>
  )
}

function sevenDaysBefore(iso: string): string {
  const [year, month, day] = iso.split("-").map(Number)
  const date = new Date(Date.UTC(year, month - 1, day - 7))
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}-${String(date.getUTCDate()).padStart(2, "0")}`
}
