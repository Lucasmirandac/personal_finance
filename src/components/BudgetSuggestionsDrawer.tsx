"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import Link from "next/link"
import clsx from "clsx"
import {
  BUDGET_SUGGEST_EXTRA_N,
  BUDGET_SUGGEST_TOP_N,
  BudgetHistorySuggestion,
  canShowBudgetSuggestions,
  createBudget,
  sliceBudgetSuggestions,
  suggestBudgetsFromHistory,
} from "@/lib/budgets"
import { useAppStore } from "@/lib/store"
import { formatBRL } from "@/lib/format"
import { Button } from "@/components/ui/Button"
import { InfoTip } from "@/components/ui/InfoTip"
import { g } from "@/lib/glossary"
import { DrawerBackdrop } from "@/components/ui/Drawer"
import { MoneyInput } from "@/components/ui/MoneyInput"
import { Num } from "@/components/ui/Num"
import { CheckCircle2, Sparkles } from "lucide-react"

type RowState = {
  selected: boolean
  valorMensal: string
}

type BudgetSuggestionsDrawerProps = {
  open: boolean
  onClose: () => void
  onManualCreate?: () => void
}

export function BudgetSuggestionsDrawer({
  open,
  onClose,
  onManualCreate,
}: BudgetSuggestionsDrawerProps) {
  const { normalized, budgets, addBudget } = useAppStore()
  const [showExtra, setShowExtra] = useState(false)
  const [rows, setRows] = useState<Record<string, RowState>>({})
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [toast, setToast] = useState<{ created: number; attempted: number } | null>(
    null,
  )
  const dialogRef = useRef<HTMLDivElement>(null)

  const canSuggest = useMemo(
    () => canShowBudgetSuggestions(normalized, budgets),
    [normalized, budgets],
  )

  const allSuggestions = useMemo(
    () => suggestBudgetsFromHistory(normalized, budgets),
    [normalized, budgets],
  )

  const visibleSuggestions = useMemo(
    () => sliceBudgetSuggestions(allSuggestions, showExtra),
    [allSuggestions, showExtra],
  )

  const hasMoreBeyondTop =
    allSuggestions.length > BUDGET_SUGGEST_TOP_N &&
    !showExtra

  useEffect(() => {
    if (open) {
      setShowExtra(false)
      setError(null)
      setToast(null)
    }
  }, [open])

  useEffect(() => {
    if (!open) return
    setRows((prev) => {
      const next: Record<string, RowState> = {}
      for (const s of visibleSuggestions) {
        const existing = prev[s.categoria]
        next[s.categoria] = existing ?? {
          selected: true,
          valorMensal: String(s.valorSugerido),
        }
      }
      return next
    })
  }, [open, visibleSuggestions])

  useEffect(() => {
    if (!open) return
    const el = dialogRef.current
    if (!el) return
    const focusable = el.querySelectorAll<HTMLElement>(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
    )
    const first = focusable[0]
    first?.focus()
  }, [open, canSuggest])

  useEffect(() => {
    if (!toast) return
    const t = window.setTimeout(() => setToast(null), 8000)
    return () => window.clearTimeout(t)
  }, [toast])

  if (!open) return null

  async function handleCreate() {
    setError(null)
    const selected = visibleSuggestions.filter((s) => rows[s.categoria]?.selected)
    if (selected.length === 0) {
      setError("Selecione ao menos uma categoria.")
      return
    }

    const parsed: { categoria: string; valor: number }[] = []
    for (const s of selected) {
      const row = rows[s.categoria]
      const valor = parseFloat(row.valorMensal.replace(",", "."))
      if (Number.isNaN(valor) || valor <= 0) {
        setError(`Valor inválido para ${s.categoria}.`)
        return
      }
      parsed.push({ categoria: s.categoria, valor })
    }

    setBusy(true)
    let created = 0
    for (const item of parsed) {
      try {
        await addBudget(createBudget(item.categoria, item.valor))
        created += 1
      } catch {
        // falha parcial: continua com as demais
      }
    }
    setBusy(false)

    if (created === 0) {
      setError("Não foi possível criar orçamentos. Verifique duplicatas ou tente de novo.")
      return
    }

    setToast({ created, attempted: parsed.length })
    if (created === parsed.length) {
      onClose()
    }
  }

  return (
    <DrawerBackdrop role="presentation" onClick={onClose}>
      <div
        ref={dialogRef}
        className="bg-surface rounded-2xl ring-1 ring-border/60 shadow-[var(--shadow-card)] w-full max-w-lg mx-4 p-5 space-y-4 max-h-[min(90vh,640px)] overflow-y-auto"
        role="dialog"
        aria-modal="true"
        aria-labelledby="budget-suggestions-title"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start gap-2">
          <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-[var(--system-yellow)] bg-[color-mix(in_oklab,var(--system-yellow)_12%,transparent)]">
            <Sparkles size={16} aria-hidden />
          </span>
          <div>
            <p
              id="budget-suggestions-title"
              className="text-sm font-semibold"
            >
              Orçamentos sugeridos para você
            </p>
            <p className="text-xs text-muted mt-0.5">
              Com base nos últimos 3 meses completos de gastos (mês atual
              excluído). Valores calculados só no seu dispositivo.
            </p>
          </div>
        </div>

        {toast && (
          <div
            className="flex flex-col gap-1 rounded-2xl bg-[color-mix(in_oklab,var(--system-green)_12%,transparent)] px-4 py-2 text-xs text-[var(--system-green)]"
            role="status"
            aria-live="polite"
          >
            <div className="flex items-center gap-2">
              <CheckCircle2 size={14} className="shrink-0" />
              <span>
                {toast.created === toast.attempted
                  ? `${toast.created} orçamento${toast.created === 1 ? "" : "s"} criado${toast.created === 1 ? "" : "s"}.`
                  : `${toast.created} de ${toast.attempted} orçamentos criados.`}
              </span>
            </div>
            <Link
              href="/dashboard?tab=orcamentos"
              className="underline font-medium pl-6"
            >
              Ver no Dashboard
            </Link>
          </div>
        )}

        {!canSuggest ? (
          <div className="space-y-3">
            <p className="text-sm text-muted">
              Ainda não tenho dados suficientes para sugerir. Importe mais
              extrato ou crie manualmente — precisamos de pelo menos 30 dias de
              saídas e 3 categorias com histórico estável.
            </p>
            <div className="flex gap-2 flex-wrap">
              {onManualCreate && (
                <Button
                  variant="primary"
                  size="sm"
                  className="rounded-full"
                  onClick={() => {
                    onClose()
                    onManualCreate()
                  }}
                >
                  Criar manualmente
                </Button>
              )}
              <Button size="sm" className="rounded-full" onClick={onClose}>
                Fechar
              </Button>
            </div>
          </div>
        ) : (
          <>
            <ul className="space-y-2" aria-label="Sugestões de orçamento">
              {visibleSuggestions.map((s) => (
                <SuggestionRow
                  key={s.categoria}
                  suggestion={s}
                  row={rows[s.categoria]}
                  onChange={(next) =>
                    setRows((prev) => ({
                      ...prev,
                      [s.categoria]: next,
                    }))
                  }
                />
              ))}
            </ul>

            {hasMoreBeyondTop && (
              <button
                type="button"
                className="text-xs text-muted underline"
                onClick={() => setShowExtra(true)}
              >
                Mostrar categorias com gasto menor (até mais {BUDGET_SUGGEST_EXTRA_N})
              </button>
            )}

            {showExtra && allSuggestions.length > BUDGET_SUGGEST_TOP_N && (
              <button
                type="button"
                className="text-xs text-muted underline"
                onClick={() => setShowExtra(false)}
              >
                Mostrar menos
              </button>
            )}

            {error && (
              <p className="text-xs text-[var(--system-red)]" role="alert">
                {error}
              </p>
            )}

            <div className="flex gap-2 flex-wrap">
              <Button
                variant="primary"
                size="sm"
                className="rounded-full"
                disabled={busy}
                onClick={() => void handleCreate()}
              >
                {busy
                  ? "Criando…"
                  : `Criar ${visibleSuggestions.filter((s) => rows[s.categoria]?.selected).length} orçamento${visibleSuggestions.filter((s) => rows[s.categoria]?.selected).length === 1 ? "" : "s"}`}
              </Button>
              <Button size="sm" className="rounded-full" onClick={onClose}>
                Cancelar
              </Button>
            </div>
          </>
        )}
      </div>
    </DrawerBackdrop>
  )
}

function SuggestionRow({
  suggestion,
  row,
  onChange,
}: {
  suggestion: BudgetHistorySuggestion
  row: RowState | undefined
  onChange: (next: RowState) => void
}) {
  const selected = row?.selected ?? true
  const valorMensal = row?.valorMensal ?? String(suggestion.valorSugerido)

  return (
    <li
      className={clsx(
        "rounded-xl ring-1 ring-border/60 px-3 py-2.5 space-y-2",
        !selected && "opacity-60",
      )}
    >
      <label className="flex items-start gap-2 cursor-pointer">
        <input
          type="checkbox"
          className="mt-1"
          checked={selected}
          onChange={(e) =>
            onChange({ selected: e.target.checked, valorMensal })
          }
        />
        <span className="flex-1 min-w-0">
          <span className="font-medium text-sm block">{suggestion.categoria}</span>
          <span className="text-xs text-muted block mt-0.5">
            <span className="inline-flex items-center gap-0.5">
              Mediana
              <InfoTip content={g("mediana")} label="Mais informações: Mediana" />
            </span>{" "}
            de{" "}
            <Num className="num-display font-mono">
              {formatBRL(suggestion.baseMedianaMensal)}
            </Num>{" "}
            em {suggestion.mesesConsiderados}{" "}
            {suggestion.mesesConsiderados === 1 ? "mês" : "meses"}
            {suggestion.mesesIgnoradosOutlier > 0 &&
              ` · ${suggestion.mesesIgnoradosOutlier} mês atípico ignorado`}
          </span>
        </span>
      </label>
      {selected && (
        <label className="block space-y-1 pl-6">
          <span className="text-xs text-muted">Limite mensal (R$)</span>
          <MoneyInput
            value={valorMensal}
            onChange={(next) =>
              onChange({ selected: true, valorMensal: next })
            }
            aria-label={`Limite mensal para ${suggestion.categoria}`}
          />
        </label>
      )}
    </li>
  )
}
