import { accountForRaw } from "@/lib/accounts"
import { cycleFor } from "@/lib/projection"
import { Account, TransactionNormalized } from "@/lib/types"

export type TransactionDayGroup = {
  date: string
  transactions: TransactionNormalized[]
  total: number
}

export type CardCycleGroup = {
  key: string
  account: Account
  payDate: string
  closeDay: number
  paymentDay: number
  transactions: TransactionNormalized[]
  total: number
}

export function resolveTransactionAccount(
  tx: Pick<TransactionNormalized, "accountId" | "fonte">,
  accounts: Account[],
): Account | undefined {
  return accountForRaw(accounts, tx)
}

export function isCashTransaction(
  tx: Pick<TransactionNormalized, "accountId" | "fonte">,
  accounts: Account[],
): boolean {
  const account = resolveTransactionAccount(tx, accounts)
  return account?.kind !== "cartao"
}

export function isCardTransaction(
  tx: Pick<TransactionNormalized, "accountId" | "fonte">,
  accounts: Account[],
): boolean {
  return resolveTransactionAccount(tx, accounts)?.kind === "cartao"
}

export function sortTransactionsDesc<T extends Pick<TransactionNormalized, "dataISO" | "id">>(
  transactions: T[],
): T[] {
  return [...transactions].sort((a, b) => {
    if (a.dataISO !== b.dataISO) return a.dataISO < b.dataISO ? 1 : -1
    return a.id < b.id ? 1 : -1
  })
}

export function groupTransactionsByDay(
  transactions: TransactionNormalized[],
): TransactionDayGroup[] {
  const groups = new Map<string, TransactionNormalized[]>()
  for (const tx of sortTransactionsDesc(transactions)) {
    const list = groups.get(tx.dataISO) ?? []
    list.push(tx)
    groups.set(tx.dataISO, list)
  }

  return [...groups.entries()]
    .sort(([a], [b]) => (a < b ? 1 : -1))
    .map(([date, items]) => ({
      date,
      transactions: items,
      total: items.reduce((sum, tx) => sum + signedFlow(tx), 0),
    }))
}

export function groupCardTransactionsByCycle(
  transactions: TransactionNormalized[],
  accounts: Account[],
): CardCycleGroup[] {
  const groups = new Map<string, CardCycleGroup>()
  for (const tx of transactions) {
    if (!isBillPurchase(tx)) continue
    const account = resolveTransactionAccount(tx, accounts)
    if (account?.kind !== "cartao") continue
    const closeDay = account.diaFechamento ?? 10
    const paymentDay = account.diaPagamento ?? 20
    const payDate = cycleFor(tx.dataISO, {
      fonte: account.fonteCsv ?? "manual",
      diaFechamento: closeDay,
      diaPagamento: paymentDay,
    })
    const key = `${account.id}|${payDate}`
    const group = groups.get(key) ?? {
      key,
      account,
      payDate,
      closeDay,
      paymentDay,
      transactions: [],
      total: 0,
    }
    group.transactions.push(tx)
    group.total += tx.valorAnalise
    groups.set(key, group)
  }

  return [...groups.values()]
    .map((group) => ({
      ...group,
      total: round2(group.total),
      transactions: sortTransactionsDesc(group.transactions),
    }))
    .sort((a, b) => (a.payDate < b.payDate ? 1 : -1))
}

export function signedFlow(tx: TransactionNormalized): number {
  if (tx.tipoFluxo === "entrada") return tx.valorFluxo
  if (tx.tipoFluxo === "saida") return -tx.valorFluxo
  return 0
}

export function isBillPurchase(tx: TransactionNormalized): boolean {
  return tx.natureza === "Gasto"
}

function round2(n: number): number {
  return Math.round(n * 100) / 100
}
