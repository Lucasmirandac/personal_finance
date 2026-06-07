"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import clsx from "clsx"
import {
  ACCOUNT_KIND_LABELS,
  countTransactionsForAccount,
  createDefaultAccount,
  defaultAccount,
} from "@/lib/accounts"
import { useAppStore } from "@/lib/store"
import { Account, AccountKind } from "@/lib/types"
import { Badge } from "@/components/ui/Badge"
import { LabelWithInfo } from "@/components/ui/LabelWithInfo"
import { g } from "@/lib/glossary"
import { Button } from "@/components/ui/Button"
import { DrawerBackdrop } from "@/components/ui/Drawer"
import { Input, Select } from "@/components/ui/Input"
import { MoneyInput } from "@/components/ui/MoneyInput"
import { IntegerInput } from "@/components/ui/IntegerInput"
import { SegmentedControl } from "@/components/ui/SegmentedControl"
import { Num } from "@/components/ui/Num"
import { ArrowLeft, CheckCircle2, Plus, Star, Trash2, Pencil, XCircle } from "lucide-react"

const ALL_KINDS: AccountKind[] = ["cc", "poupanca", "carteira", "cartao"]
const CASH_KINDS: AccountKind[] = ["cc", "poupanca", "carteira"]

export type AccountsPanelScope = "all" | "cash" | "cards"

const HORIZONS = [30, 60, 90, 180] as const

const SCOPE_COPY: Record<
  AccountsPanelScope,
  {
    title: string
    subtitle: string
    addLabel: string
    emptyList: string
    formNew: string
    formEdit: string
    nameRequired: string
    deleteConfirm: string
  }
> = {
  all: {
    title: "Contas",
    subtitle: "Contas correntes, poupança, carteira e cartões vinculados ao CSV.",
    addLabel: "Nova conta",
    emptyList: "Nenhuma conta cadastrada. Crie a Conta Principal com seu saldo atual.",
    formNew: "Nova conta",
    formEdit: "Editar conta",
    nameRequired: "Informe o nome da conta.",
    deleteConfirm: "Excluir esta conta?",
  },
  cash: {
    title: "Contas",
    subtitle: "Conta corrente, poupança e carteira — formam o saldo de caixa.",
    addLabel: "Nova conta",
    emptyList: "Nenhuma conta de dinheiro cadastrada. Informe seu saldo atual.",
    formNew: "Nova conta",
    formEdit: "Editar conta",
    nameRequired: "Informe o nome da conta.",
    deleteConfirm: "Excluir esta conta?",
  },
  cards: {
    title: "Cartões",
    subtitle: "Cartões de crédito, fatura, datas de fechamento e teto mensal de gastos.",
    addLabel: "Novo cartão",
    emptyList: "Nenhum cartão cadastrado. Vincule ao CSV importado (Inter ou Nubank).",
    formNew: "Novo cartão",
    formEdit: "Editar cartão",
    nameRequired: "Informe o nome do cartão.",
    deleteConfirm: "Excluir este cartão?",
  },
}

function kindsForScope(scope: AccountsPanelScope): AccountKind[] {
  if (scope === "cash") return CASH_KINDS
  if (scope === "cards") return ["cartao"]
  return ALL_KINDS
}

function emptyForm(scope: AccountsPanelScope): FormState {
  return {
    nome: "",
    kind: scope === "cards" ? "cartao" : "cc",
    saldoInicial: "0",
    dataReferencia: new Date().toISOString().slice(0, 10),
    diaFechamento: "10",
    diaPagamento: "20",
    fonteCsv: "",
    limiteMensal: "",
  }
}

function accountsForScope(accounts: Account[], scope: AccountsPanelScope): Account[] {
  if (scope === "cash") return accounts.filter((a) => a.kind !== "cartao")
  if (scope === "cards") return accounts.filter((a) => a.kind === "cartao")
  return accounts
}

const KIND_DOT: Record<AccountKind, string> = {
  cc: "bg-[var(--system-blue)]",
  poupanca: "bg-[var(--system-green)]",
  carteira: "bg-[var(--system-orange)]",
  cartao: "bg-[var(--system-indigo)]",
}

type FormState = {
  nome: string
  kind: AccountKind
  saldoInicial: string
  dataReferencia: string
  diaFechamento: string
  diaPagamento: string
  fonteCsv: "inter" | "nubank" | ""
  limiteMensal: string
}

type Props = {
  onClose?: () => void
  scope?: AccountsPanelScope
}

export function AccountsPanel({ onClose, scope = "all" }: Readonly<Props>) {
  const {
    accounts,
    dataset,
    manualTransactions,
    settings,
    addAccount,
    updateAccount,
    removeAccount,
    setDefaultAccount,
    updateSettings,
  } = useAppStore()
  const [formOpen, setFormOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState<FormState>(() => emptyForm(scope))
  const [error, setError] = useState<string | null>(null)
  const [savingHorizon, setSavingHorizon] = useState(false)
  const [horizonSaved, setHorizonSaved] = useState(false)
  const horizonResetTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const horizon = settings.projectionHorizonDays
  const copy = SCOPE_COPY[scope]
  const formKinds = kindsForScope(scope)
  const visibleAccounts = useMemo(
    () => accountsForScope(accounts, scope),
    [accounts, scope],
  )
  const showHorizon = scope !== "cards"
  const showDefaultStar = scope !== "cards"
  const isCardForm = scope === "cards" || form.kind === "cartao"

  useEffect(() => {
    return () => {
      if (horizonResetTimer.current !== null) {
        clearTimeout(horizonResetTimer.current)
      }
    }
  }, [])

  const cardFontesInDataset = useMemo(() => {
    const set = new Set<"inter" | "nubank">()
    for (const s of dataset.sources) {
      if (s.fonte === "inter" || s.fonte === "nubank") set.add(s.fonte)
    }
    return set
  }, [dataset.sources])

  function openNew() {
    setEditingId(null)
    setForm(emptyForm(scope))
    setError(null)
    setFormOpen(true)
  }

  function openEdit(account: Account) {
    setEditingId(account.id)
    setForm({
      nome: account.nome,
      kind: account.kind,
      saldoInicial: String(account.saldoInicial),
      dataReferencia: account.dataReferencia,
      diaFechamento: String(account.diaFechamento ?? 10),
      diaPagamento: String(account.diaPagamento ?? 20),
      fonteCsv: account.fonteCsv ?? "",
      limiteMensal:
        account.limiteMensal != null && account.limiteMensal > 0
          ? String(account.limiteMensal)
          : "",
    })
    setError(null)
    setFormOpen(true)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    const saldo = parseFloat(form.saldoInicial.replace(",", "."))
    if (Number.isNaN(saldo)) {
      setError("Saldo inicial inválido.")
      return
    }
    if (!form.nome.trim()) {
      setError(copy.nameRequired)
      return
    }

    const kind = scope === "cards" ? "cartao" : form.kind

    const partial: Partial<Account> = {
      nome: form.nome.trim(),
      kind,
      saldoInicial: saldo,
      dataReferencia: form.dataReferencia,
    }

    if (kind === "cartao") {
      partial.diaFechamento = Math.min(
        31,
        Math.max(1, Number(form.diaFechamento) || 10),
      )
      partial.diaPagamento = Math.min(
        31,
        Math.max(1, Number(form.diaPagamento) || 20),
      )
      if (form.fonteCsv === "inter" || form.fonteCsv === "nubank") {
        partial.fonteCsv = form.fonteCsv
      }
      partial.cicloConfirmado = true
      const limiteRaw = form.limiteMensal.trim()
      if (limiteRaw.length > 0) {
        const limite = parseFloat(limiteRaw.replace(",", "."))
        if (Number.isNaN(limite) || limite <= 0) {
          setError("Teto mensal inválido.")
          return
        }
        partial.limiteMensal = limite
      } else if (editingId) {
        partial.limiteMensal = undefined
      }
    }

    try {
      if (editingId) {
        const existing = accounts.find((a) => a.id === editingId)
        if (!existing) return
        const updated: Account = { ...existing, ...partial }
        if (kind === "cartao" && form.limiteMensal.trim().length === 0) {
          delete updated.limiteMensal
        }
        await updateAccount(updated)
      } else {
        const acc = createDefaultAccount(kind, form.nome.trim(), partial)
        if (accounts.length === 0 && kind !== "cartao") acc.isDefault = true
        await addAccount(acc)
      }
      setFormOpen(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao salvar.")
    }
  }

  async function handleRemove(id: string) {
    const count = countTransactionsForAccount(dataset, manualTransactions, id)
    if (count > 0) {
      setError(`Conta com ${count} transação(ões) — desative em vez de excluir.`)
      return
    }
    if (!window.confirm(copy.deleteConfirm)) return
    try {
      await removeAccount(id)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao excluir.")
    }
  }

  async function toggleActive(account: Account) {
    await updateAccount({ ...account, ativa: !account.ativa })
  }

  async function handleHorizonChange(days: string) {
    const next = Number(days) as (typeof HORIZONS)[number]
    if (next === settings.projectionHorizonDays) return
    setSavingHorizon(true)
    try {
      await updateSettings({
        ...settings,
        projectionHorizonDays: next,
      })
      setHorizonSaved(true)
      if (horizonResetTimer.current !== null) {
        clearTimeout(horizonResetTimer.current)
      }
      horizonResetTimer.current = setTimeout(() => {
        setHorizonSaved(false)
        horizonResetTimer.current = null
      }, 2000)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao salvar horizonte.")
    } finally {
      setSavingHorizon(false)
    }
  }

  const def = defaultAccount(accounts)

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div>
          <p className="text-caption uppercase tracking-wider text-muted">{copy.title}</p>
          <p className="text-xs text-muted mt-0.5">{copy.subtitle}</p>
        </div>
        <div className="flex items-center gap-2">
          {onClose && (
            <Button size="sm" className="rounded-full" onClick={onClose}>
              <ArrowLeft size={13} />
              Voltar
            </Button>
          )}
          <Button variant="primary" size="sm" className="rounded-full" onClick={openNew}>
            <Plus size={13} />
            {copy.addLabel}
          </Button>
        </div>
      </div>

      {error && (
        <div
          className="flex items-center gap-2 rounded-2xl bg-[color-mix(in_oklab,var(--system-red)_12%,transparent)] px-4 py-2 text-xs text-[var(--system-red)]"
          role="alert"
        >
          <XCircle size={14} className="shrink-0" />
          {error}
        </div>
      )}

      {visibleAccounts.length === 0 ? (
        <div className="rounded-2xl bg-surface ring-1 ring-border/60 shadow-[var(--shadow-card)] p-4">
          <p className="text-sm text-muted">{copy.emptyList}</p>
        </div>
      ) : (
        <div className="rounded-2xl bg-surface ring-1 ring-border/60 shadow-[var(--shadow-card)] overflow-hidden divide-y divide-border/60">
          {visibleAccounts.map((a) => (
            <div
              key={a.id}
              className={clsx(
                "flex items-center justify-between gap-3 px-4 py-3 flex-wrap",
                !a.ativa && "opacity-60",
              )}
            >
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span
                    className={clsx("h-2.5 w-2.5 shrink-0 rounded-full", KIND_DOT[a.kind])}
                    aria-hidden
                  />
                  <span className="font-medium text-sm">{a.nome}</span>
                  <Badge>{ACCOUNT_KIND_LABELS[a.kind]}</Badge>
                  {a.isDefault && (
                    <Badge variant="receita">
                      <Star size={10} />
                      Padrão
                    </Badge>
                  )}
                  {!a.ativa && <Badge>Inativa</Badge>}
                </div>
                <Num className="block text-xs text-muted mt-0.5 pl-[18px] num-display font-mono">
                  Saldo {a.saldoInicial.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}{" "}
                  · ref. {a.dataReferencia.split("-").reverse().join("/")}
                  {a.kind === "cartao" && a.fonteCsv && ` · ${a.fonteCsv}`}
                  {a.kind === "cartao" &&
                    a.limiteMensal != null &&
                    a.limiteMensal > 0 &&
                    ` · Teto ${a.limiteMensal.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}`}
                </Num>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                {showDefaultStar && !a.isDefault && a.ativa && a.kind !== "cartao" && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="rounded-full"
                    title="Marcar como padrão (Quick Add)"
                    onClick={() => setDefaultAccount(a.id)}
                  >
                    <Star size={13} />
                  </Button>
                )}
                <Button variant="ghost" size="sm" className="rounded-full" onClick={() => openEdit(a)}>
                  <Pencil size={13} />
                </Button>
                <Button variant="ghost" size="sm" className="rounded-full" onClick={() => toggleActive(a)}>
                  {a.ativa ? "Desativar" : "Ativar"}
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="rounded-full text-danger"
                  onClick={() => handleRemove(a.id)}
                >
                  <Trash2 size={13} />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {formOpen && (
        <DrawerBackdrop
          role="presentation"
          onClick={() => setFormOpen(false)}
        >
          <form
            className="bg-surface rounded-2xl ring-1 ring-border/60 shadow-[var(--shadow-card)] w-full max-w-md mx-4 p-5 space-y-3"
            role="dialog"
            aria-modal="true"
            onClick={(e) => e.stopPropagation()}
            onSubmit={handleSubmit}
          >
            <div className="space-y-3">
              <p className="text-caption uppercase tracking-wider text-muted">
                {editingId ? copy.formEdit : copy.formNew}
              </p>
              <label className="block space-y-1">
                <span className="text-xs text-muted">Nome</span>
                <Input
                  value={form.nome}
                  onChange={(e) => setForm((f) => ({ ...f, nome: e.target.value }))}
                  required
                />
              </label>
              {scope !== "cards" && (
                <label className="block space-y-1">
                  <span className="text-xs text-muted">Tipo</span>
                  <Select
                    value={form.kind}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, kind: e.target.value as AccountKind }))
                    }
                  >
                    {formKinds.map((k) => (
                      <option key={k} value={k}>
                        {ACCOUNT_KIND_LABELS[k]}
                      </option>
                    ))}
                  </Select>
                </label>
              )}
              <div className="grid grid-cols-2 gap-2">
                <label className="block space-y-1">
                  <LabelWithInfo labelClassName="text-xs text-muted" info={g("saldoInicial")} ariaTopic="Saldo inicial">
                    Saldo inicial (R$)
                  </LabelWithInfo>
                  <MoneyInput
                    value={form.saldoInicial}
                    onChange={(next) =>
                      setForm((f) => ({ ...f, saldoInicial: next }))
                    }
                  />
                </label>
                <label className="block space-y-1">
                  <LabelWithInfo labelClassName="text-xs text-muted" info={g("dataReferencia")} ariaTopic="Data referência">
                    Data referência
                  </LabelWithInfo>
                  <Input
                    type="date"
                    value={form.dataReferencia}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, dataReferencia: e.target.value }))
                    }
                  />
                </label>
              </div>
              {isCardForm && (
                <>
                  <label className="block space-y-1">
                    <span className="text-xs text-muted">Vincular ao CSV</span>
                    <Select
                      value={form.fonteCsv}
                      onChange={(e) =>
                        setForm((f) => ({
                          ...f,
                          fonteCsv: e.target.value as FormState["fonteCsv"],
                        }))
                      }
                    >
                      <option value="">Nenhum</option>
                      {cardFontesInDataset.has("inter") && (
                        <option value="inter">Inter</option>
                      )}
                      {cardFontesInDataset.has("nubank") && (
                        <option value="nubank">Nubank</option>
                      )}
                      {!cardFontesInDataset.size && (
                        <>
                          <option value="inter">Inter</option>
                          <option value="nubank">Nubank</option>
                        </>
                      )}
                    </Select>
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <label className="block space-y-1">
                      <LabelWithInfo labelClassName="text-xs text-muted" info={g("fechamento")} ariaTopic="Dia fechamento">
                        Dia fechamento
                      </LabelWithInfo>
                      <IntegerInput
                        min={1}
                        max={31}
                        value={form.diaFechamento}
                        onChange={(next) =>
                          setForm((f) => ({ ...f, diaFechamento: next }))
                        }
                      />
                    </label>
                    <label className="block space-y-1">
                      <LabelWithInfo labelClassName="text-xs text-muted" info={g("pagamentoDia")} ariaTopic="Dia pagamento">
                        Dia pagamento
                      </LabelWithInfo>
                      <IntegerInput
                        min={1}
                        max={31}
                        value={form.diaPagamento}
                        onChange={(next) =>
                          setForm((f) => ({ ...f, diaPagamento: next }))
                        }
                      />
                    </label>
                  </div>
                  <label className="block space-y-1">
                    <LabelWithInfo
                      labelClassName="text-xs text-muted"
                      info={g("tetoCartaoDefinido")}
                      ariaTopic="Teto mensal de gastos"
                    >
                      Teto mensal de gastos (opcional)
                    </LabelWithInfo>
                    <MoneyInput
                      value={form.limiteMensal}
                      onChange={(next) =>
                        setForm((f) => ({ ...f, limiteMensal: next }))
                      }
                      placeholder="Sem teto"
                    />
                  </label>
                </>
              )}
              <div className="flex gap-2 pt-1">
                <Button type="submit" variant="primary" size="sm" className="rounded-full">
                  Salvar
                </Button>
                <Button size="sm" className="rounded-full" onClick={() => setFormOpen(false)}>
                  Cancelar
                </Button>
              </div>
            </div>
          </form>
        </DrawerBackdrop>
      )}

      {showHorizon && (
        <div className="rounded-2xl bg-surface ring-1 ring-border/60 shadow-[var(--shadow-card)] p-5 space-y-3">
          <LabelWithInfo
            labelClassName="text-caption uppercase tracking-wider text-muted"
            info={g("horizonteProjecao")}
            ariaTopic="Horizonte de projeção"
          >
            Horizonte de projeção
          </LabelWithInfo>
          <div className="flex items-center gap-3 flex-wrap">
            <SegmentedControl
              value={String(horizon)}
              onChange={handleHorizonChange}
              options={HORIZONS.map((h) => ({ value: String(h), label: `${h}d` }))}
              size="sm"
            />
            {savingHorizon && (
              <span className="text-xs text-muted">Salvando…</span>
            )}
            {horizonSaved && !savingHorizon && (
              <span
                className="inline-flex items-center gap-1 text-xs text-[var(--system-green)]"
                role="status"
                aria-live="polite"
              >
                <CheckCircle2 size={12} />
                Salvo
              </span>
            )}
          </div>
          {def && def.kind !== "cartao" && (
            <p className="text-xs text-muted">
              Conta padrão para Quick Add: <strong>{def.nome}</strong>
            </p>
          )}
        </div>
      )}
    </div>
  )
}
