"use client"

import { Account } from "@/lib/types"
import { ACCOUNT_KIND_LABELS } from "@/lib/accounts"
import { formatBRL, formatDateBR } from "@/lib/format"
import { Num } from "@/components/ui/Num"

type Props = {
  accounts: Account[]
}

const gradients: Record<Account["kind"], string> = {
  cc: "var(--grad-account-cc)",
  poupanca: "var(--grad-account-poupanca)",
  carteira: "var(--grad-account-carteira)",
  cartao: "var(--grad-account-cartao)",
}

export function AccountStack({ accounts }: Props) {
  const active = accounts.filter((acc) => acc.ativa)
  if (active.length === 0) return null

  return (
    <section className="space-y-2">
      <p className="text-caption uppercase tracking-wider text-muted">Contas</p>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {active.map((account) => (
          <article
            key={account.id}
            className="rounded-2xl p-4 ring-1 ring-black/5 shadow-[var(--shadow-card)]"
            style={{ background: gradients[account.kind] }}
          >
            <p className="text-sm font-medium">{account.nome}</p>
            <p className="text-xs text-muted mt-0.5">{ACCOUNT_KIND_LABELS[account.kind]}</p>
            <Num className="mt-3 block text-2xl font-semibold num-display">
              {formatBRL(account.saldoInicial)}
            </Num>
            <p className="mt-2 text-xs text-muted">Referência {formatDateBR(account.dataReferencia)}</p>
          </article>
        ))}
      </div>
    </section>
  )
}
