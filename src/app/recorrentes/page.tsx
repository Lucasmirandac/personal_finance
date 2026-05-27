"use client"

import { useState } from "react"
import clsx from "clsx"
import { useAppStore } from "@/lib/store"
import { formatBRL, formatDateBR } from "@/lib/format"
import { newRecurringId } from "@/lib/recurring"
import { RecurringForm, RecurringFormValues } from "@/components/RecurringForm"
import { SubscriptionsPanel } from "@/components/SubscriptionsPanel"
import { Badge } from "@/components/ui/Badge"
import { Button } from "@/components/ui/Button"
import { Num } from "@/components/ui/Num"
import { RecurringKind, RecurringRule } from "@/lib/types"
import { Pencil, Plus, Trash2 } from "lucide-react"

const KIND_LABELS: Record<RecurringKind, string> = {
  receita: "Receita",
  despesa_fixa: "Despesa fixa",
}

const KIND_DOT: Record<RecurringKind, string> = {
  receita: "bg-[var(--system-green)]",
  despesa_fixa: "bg-[var(--system-indigo)]",
}

export default function RecorrentesPage() {
  const {
    loaded,
    recurringRules,
    addRecurring,
    updateRecurring,
    removeRecurring,
    toggleRecurring,
  } = useAppStore()

  const [editing, setEditing] = useState<RecurringRule | null>(null)
  const [creating, setCreating] = useState<RecurringKind | null>(null)

  if (!loaded) return <div className="text-muted">Carregando…</div>

  const receitas = recurringRules.filter((r) => r.kind === "receita")
  const despesas = recurringRules.filter((r) => r.kind === "despesa_fixa")

  async function handleSubmit(values: RecurringFormValues) {
    if (editing) {
      await updateRecurring({
        ...editing,
        kind: values.kind,
        descricao: values.descricao,
        categoria: values.categoria,
        valor: values.valor,
        diaMes: values.diaMes,
        inicio: values.inicio,
        fim: values.fim?.trim() || null,
      })
      setEditing(null)
      return
    }
    await addRecurring({
      id: newRecurringId(),
      kind: values.kind,
      descricao: values.descricao,
      categoria: values.categoria,
      valor: values.valor,
      diaMes: values.diaMes,
      inicio: values.inicio,
      fim: values.fim?.trim() || null,
      ativo: true,
      criadoEm: new Date().toISOString(),
    })
    setCreating(null)
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Recorrentes</h1>
        <p className="text-sm text-muted mt-0.5 max-w-xl">
          Despesas fixas e receitas mensais geradas automaticamente no dashboard.
        </p>
      </div>

      <SubscriptionsPanel />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <RuleSection
          title="Receitas"
          subtitle="Entradas mensais como salário"
          rules={receitas}
          kind="receita"
          creating={creating === "receita"}
          editing={editing?.kind === "receita" ? editing : null}
          onAdd={() => {
            setEditing(null)
            setCreating("receita")
          }}
          onEdit={(r) => {
            setCreating(null)
            setEditing(r)
          }}
          onCancelForm={() => {
            setCreating(null)
            setEditing(null)
          }}
          onSubmit={handleSubmit}
          onToggle={toggleRecurring}
          onRemove={removeRecurring}
        />
        <RuleSection
          title="Despesas fixas"
          subtitle="Saídas mensais como aluguel e boletos"
          rules={despesas}
          kind="despesa_fixa"
          creating={creating === "despesa_fixa"}
          editing={editing?.kind === "despesa_fixa" ? editing : null}
          onAdd={() => {
            setEditing(null)
            setCreating("despesa_fixa")
          }}
          onEdit={(r) => {
            setCreating(null)
            setEditing(r)
          }}
          onCancelForm={() => {
            setCreating(null)
            setEditing(null)
          }}
          onSubmit={handleSubmit}
          onToggle={toggleRecurring}
          onRemove={removeRecurring}
        />
      </div>
    </div>
  )
}

type RuleSectionProps = {
  title: string
  subtitle: string
  rules: RecurringRule[]
  kind: RecurringKind
  creating: boolean
  editing: RecurringRule | null
  onAdd: () => void
  onEdit: (r: RecurringRule) => void
  onCancelForm: () => void
  onSubmit: (v: RecurringFormValues) => void
  onToggle: (id: string) => void
  onRemove: (id: string) => void
}

function RuleSection({
  title,
  subtitle,
  rules,
  kind,
  creating,
  editing,
  onAdd,
  onEdit,
  onCancelForm,
  onSubmit,
  onToggle,
  onRemove,
}: Readonly<RuleSectionProps>) {
  const showForm = creating || editing

  return (
    <div className="rounded-2xl bg-surface ring-1 ring-border/60 shadow-[var(--shadow-card)] overflow-hidden">
      <div className="flex items-center justify-between gap-2 px-4 py-3 border-b border-border/60">
        <div>
          <p className="text-[11px] uppercase tracking-wider text-muted">{title}</p>
          <p className="text-xs text-muted mt-0.5">{subtitle}</p>
        </div>
        {!showForm && (
          <Button variant="primary" size="sm" className="rounded-full" onClick={onAdd}>
            <Plus size={13} />
            Nova
          </Button>
        )}
      </div>

      {showForm && (
        <div className="px-4 py-4 border-b border-border/60 bg-surface-2">
          <div className="text-xs font-medium mb-2">
            {editing ? "Editar" : "Nova"} {KIND_LABELS[kind].toLowerCase()}
          </div>
          <RecurringForm
            kind={kind}
            initial={editing}
            onSubmit={onSubmit}
            onCancel={onCancelForm}
          />
        </div>
      )}

      {rules.length === 0 && !showForm && (
        <p className="text-xs text-muted px-4 py-4">Nenhuma regra cadastrada.</p>
      )}

      <ul className="divide-y divide-border/60">
        {rules.map((r) => (
          <li
            key={r.id}
            className={clsx("px-4 py-3", !r.ativo && "opacity-50")}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span
                    className={clsx("h-2 w-2 shrink-0 rounded-full", KIND_DOT[r.kind])}
                    aria-hidden
                  />
                  <span className="font-medium text-sm">{r.descricao}</span>
                </div>
                <div className="text-xs text-muted mt-1 flex flex-wrap items-center gap-2 pl-4">
                  <Badge variant={r.kind === "receita" ? "receita" : "fixa"} dot>
                    {KIND_LABELS[r.kind]}
                  </Badge>
                  <span>{r.categoria}</span>
                  <Num>{formatBRL(r.valor)}</Num>
                  <span>dia {r.diaMes}</span>
                </div>
                <div className="text-xs text-muted mt-0.5 pl-4">
                  {formatDateBR(r.inicio)}
                  {r.fim ? ` – ${formatDateBR(r.fim)}` : " – indeterminado"}
                </div>
              </div>
              <ActiveSwitch
                checked={r.ativo}
                onChange={() => onToggle(r.id)}
                label={r.descricao}
              />
            </div>
            <div className="flex gap-2 mt-2 pl-4">
              <Button size="sm" variant="ghost" className="rounded-full" onClick={() => onEdit(r)}>
                <Pencil size={12} />
                Editar
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="rounded-full text-danger"
                onClick={() => {
                  if (confirm(`Excluir "${r.descricao}"?`)) onRemove(r.id)
                }}
              >
                <Trash2 size={12} />
                Excluir
              </Button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
}

type ActiveSwitchProps = {
  checked: boolean
  onChange: () => void
  label: string
}

function ActiveSwitch({ checked, onChange, label }: Readonly<ActiveSwitchProps>) {
  return (
    <div className="flex items-center gap-2 shrink-0">
      <span className="text-[11px] text-muted" id={`active-label-${label}`}>
        Ativo
      </span>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-labelledby={`active-label-${label}`}
        aria-label={`${checked ? "Desativar" : "Ativar"} ${label}`}
        className={clsx(
          "relative inline-flex h-6 w-11 shrink-0 rounded-full transition-colors duration-200 cursor-pointer",
          checked ? "bg-[var(--system-green)]" : "bg-surface-2 ring-1 ring-border/60",
        )}
        onClick={onChange}
      >
        <span
          className={clsx(
            "absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white shadow-sm transition-transform duration-200",
            checked && "translate-x-5",
          )}
        />
      </button>
    </div>
  )
}
