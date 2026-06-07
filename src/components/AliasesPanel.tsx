"use client"

import { useMemo, useState } from "react"
import clsx from "clsx"
import {
  buildAliasSuggestions,
  formatSuggestionCanonical,
} from "@/lib/aliasSuggestions"
import { establishmentAggregation } from "@/lib/aggregations"
import { extractEstabelecimento } from "@/lib/normalize"
import { newAliasId } from "@/lib/ids"
import { useAppStore } from "@/lib/store"
import { EstablishmentAlias, TransactionNormalized } from "@/lib/types"
import { formatBRL, formatInt } from "@/lib/format"
import { Button } from "@/components/ui/Button"
import { StatTile } from "@/components/ui/StatTile"
import { Chip } from "@/components/ui/Chip"
import { Input } from "@/components/ui/Input"
import { Link2, Pencil, Plus, Trash2, X, XCircle } from "lucide-react"

type AliasFormState = {
  canonical: string
  patterns: string[]
}

const emptyForm = (): AliasFormState => ({
  canonical: "",
  patterns: [],
})

function countUniqueBeforeAlias(normalized: TransactionNormalized[]): number {
  const set = new Set<string>()
  for (const t of normalized) {
    if (t.natureza !== "Gasto") continue
    set.add(extractEstabelecimento(t.lancamento))
  }
  return set.size
}

export function AliasesPanel() {
  const {
    hasAnalysis,
    normalized,
    establishmentAliases,
    addAlias,
    updateAlias,
    removeAlias,
  } = useAppStore()

  const [formOpen, setFormOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState<AliasFormState>(emptyForm)
  const [patternInput, setPatternInput] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [suggestionCanonicals, setSuggestionCanonicals] = useState<
    Record<string, string>
  >({})
  const [busyToken, setBusyToken] = useState<string | null>(null)

  const suggestions = useMemo(
    () =>
      hasAnalysis
        ? buildAliasSuggestions(normalized, establishmentAliases)
        : [],
    [hasAnalysis, normalized, establishmentAliases],
  )

  const preview = useMemo(() => {
    if (!hasAnalysis) return null
    const before = countUniqueBeforeAlias(normalized)
    const after = establishmentAggregation(normalized).length
    const consolidated = Math.max(0, before - after)
    return { before, after, consolidated }
  }, [hasAnalysis, normalized])

  function openNew(prefill?: Partial<AliasFormState>) {
    setEditingId(null)
    setForm({
      canonical: prefill?.canonical ?? "",
      patterns: prefill?.patterns ?? [],
    })
    setPatternInput("")
    setError(null)
    setFormOpen(true)
  }

  function openEdit(alias: EstablishmentAlias) {
    setEditingId(alias.id)
    setForm({
      canonical: alias.canonical,
      patterns: [...alias.patterns],
    })
    setPatternInput("")
    setError(null)
    setFormOpen(true)
  }

  function addPattern() {
    const v = patternInput.trim()
    if (!v) return
    setForm((prev) => {
      if (prev.patterns.some((p) => p.toUpperCase() === v.toUpperCase())) {
        return prev
      }
      return { ...prev, patterns: [...prev.patterns, v] }
    })
    setPatternInput("")
  }

  function removePattern(idx: number) {
    setForm((prev) => ({
      ...prev,
      patterns: prev.patterns.filter((_, k) => k !== idx),
    }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    const canonical = form.canonical.trim()
    const pendingPattern = patternInput.trim()
    const baseList = pendingPattern
      ? [...form.patterns, pendingPattern]
      : form.patterns
    const trimmed = baseList.map((p) => p.trim()).filter(Boolean)
    const seen = new Set<string>()
    const patterns: string[] = []
    for (const p of trimmed) {
      const norm = p.toUpperCase()
      if (seen.has(norm)) continue
      seen.add(norm)
      patterns.push(p)
    }
    if (!canonical) {
      setError("Informe o nome canônico (apelido).")
      return
    }
    if (patterns.length === 0) {
      setError("Adicione ao menos um padrão.")
      return
    }

    const now = new Date().toISOString()
    try {
      if (editingId) {
        const existing = establishmentAliases.find((a) => a.id === editingId)
        if (!existing) return
        await updateAlias({
          ...existing,
          canonical,
          patterns,
        })
      } else {
        await addAlias({
          id: newAliasId(),
          canonical,
          patterns,
          criadoEm: now,
          atualizadaEm: now,
        })
      }
      setPatternInput("")
      setFormOpen(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao salvar.")
    }
  }

  async function handleRemove(id: string) {
    if (!window.confirm("Excluir este apelido?")) return
    try {
      await removeAlias(id)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao excluir.")
    }
  }

  async function handleGroupSuggestion(token: string) {
    const suggestion = suggestions.find((s) => s.token === token)
    if (!suggestion) return
    const canonical =
      suggestionCanonicals[token]?.trim() ||
      formatSuggestionCanonical(suggestion.token)
    if (!canonical) return

    setBusyToken(token)
    setError(null)
    const now = new Date().toISOString()
    try {
      await addAlias({
        id: newAliasId(),
        canonical,
        patterns: suggestion.variantes.map((v) => v.estabelecimento),
        criadoEm: now,
        atualizadaEm: now,
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao agrupar.")
    } finally {
      setBusyToken(null)
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <p className="text-caption uppercase tracking-wider text-muted">Apelidos de estabelecimentos</p>
          <p className="text-xs text-muted mt-0.5 max-w-xl">
            Agrupe variantes do mesmo lugar (ex.: PAG*MERC IFOOD, IFD*REST →
            iFood). Padrões casam por substring, sem diferenciar maiúsculas.
          </p>
        </div>
        <Button variant="primary" size="sm" className="rounded-full" onClick={() => openNew()}>
          <Plus size={13} />
          Novo apelido
        </Button>
      </div>

      {preview && preview.consolidated > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <StatTile
            label="Antes"
            value={formatInt(preview.before)}
            hint="nomes únicos"
          />
          <StatTile
            label="Depois"
            value={formatInt(preview.after)}
            hint="no ranking"
          />
          <StatTile
            label="Consolidados"
            value={formatInt(preview.consolidated)}
            hint="variantes agrupadas"
            tone="success"
          />
        </div>
      )}

      {error && (
        <div
          className="flex items-center gap-2 rounded-2xl bg-[color-mix(in_oklab,var(--system-red)_12%,transparent)] px-4 py-2 text-xs text-[var(--system-red)]"
          role="alert"
        >
          <XCircle size={14} className="shrink-0" />
          {error}
        </div>
      )}

      {formOpen && (
        <div className="rounded-2xl bg-surface ring-1 ring-border/60 shadow-[var(--shadow-card)] p-5">
          <form
            className="space-y-3"
            onSubmit={(e) => void handleSubmit(e)}
          >
            <p className="text-caption uppercase tracking-wider text-muted">
              {editingId ? "Editar apelido" : "Novo apelido"}
            </p>
            <label className="block space-y-1">
              <span className="text-xs text-muted">Nome canônico</span>
              <Input
                placeholder="iFood"
                value={form.canonical}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, canonical: e.target.value }))
                }
                autoFocus
              />
            </label>
            <div className="space-y-2">
              <span className="text-xs text-muted">Padrões (variantes)</span>
              <ul className="space-y-1">
                {form.patterns.map((p, i) => (
                  <li key={i} className="flex items-center gap-2">
                    <Input
                      className="flex-1"
                      value={p}
                      onChange={(e) => {
                        const value = e.target.value
                        setForm((prev) => ({
                          ...prev,
                          patterns: prev.patterns.map((q, k) => (k === i ? value : q)),
                        }))
                      }}
                    />
                    <Button
                      variant="ghost"
                      size="sm"
                      className="shrink-0 rounded-full"
                      onClick={() => removePattern(i)}
                      aria-label="Remover padrão"
                    >
                      <X size={13} />
                    </Button>
                  </li>
                ))}
              </ul>
              <div className="flex gap-2">
                <Input
                  className="flex-1"
                  placeholder="IFOOD"
                  value={patternInput}
                  onChange={(e) => setPatternInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault()
                      addPattern()
                    }
                  }}
                />
                <Button size="sm" className="shrink-0 rounded-full" onClick={addPattern}>
                  <Plus size={13} />
                </Button>
              </div>
            </div>
            <div className="flex gap-2 flex-wrap">
              <Button type="submit" variant="primary" size="sm" className="rounded-full">
                Salvar
              </Button>
              <Button size="sm" className="rounded-full" onClick={() => setFormOpen(false)}>
                Cancelar
              </Button>
            </div>
          </form>
        </div>
      )}

      {establishmentAliases.length === 0 ? (
        <div className="rounded-2xl bg-surface ring-1 ring-border/60 shadow-[var(--shadow-card)] p-4">
          <p className="text-sm text-muted">
            Nenhum apelido cadastrado. Use uma sugestão abaixo ou crie manualmente.
          </p>
        </div>
      ) : (
        <div className="rounded-2xl bg-surface ring-1 ring-border/60 shadow-[var(--shadow-card)] overflow-hidden divide-y divide-border/60">
          <ul>
            {establishmentAliases.map((alias) => (
              <li
                key={alias.id}
                className="px-4 py-3 flex items-start justify-between gap-3 flex-wrap"
              >
                <div className="min-w-0 flex-1">
                  <div className="font-medium text-sm">{alias.canonical}</div>
                  <div className="flex flex-wrap gap-1.5 mt-1.5">
                    {alias.patterns.map((p, i) => (
                      <Chip key={`${alias.id}-${i}-${p}`} className="text-[10px]">
                        {p}
                      </Chip>
                    ))}
                  </div>
                </div>
                <div className="flex gap-1 shrink-0">
                  <Button
                    size="sm"
                    variant="ghost"
                    className="rounded-full"
                    onClick={() => openEdit(alias)}
                    aria-label={`Editar ${alias.canonical}`}
                  >
                    <Pencil size={13} />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="rounded-full text-danger"
                    onClick={() => void handleRemove(alias.id)}
                    aria-label={`Excluir ${alias.canonical}`}
                  >
                    <Trash2 size={13} />
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      {hasAnalysis && suggestions.length > 0 && (
        <section className="space-y-3">
          <div>
            <p className="text-caption uppercase tracking-wider text-muted flex items-center gap-2">
              <Link2 size={14} />
              Sugestões de agrupamento
            </p>
            <p className="text-xs text-muted mt-0.5">
              Variantes parecidas detectadas nos seus gastos. Agrupe com um clique.
            </p>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
            {suggestions.map((s) => {
              const canonicalDefault =
                suggestionCanonicals[s.token] ??
                formatSuggestionCanonical(s.token)
              return (
                <div
                  key={s.token}
                  className="rounded-2xl bg-surface ring-1 ring-border/60 shadow-[var(--shadow-card)] p-4 space-y-3"
                >
                  <div className="flex flex-wrap gap-1.5">
                    {s.variantes.map((v, i) => (
                      <Chip key={`${s.token}-${i}-${v.estabelecimento}`} className="text-[10px]">
                        {v.estabelecimento}
                      </Chip>
                    ))}
                  </div>
                  <div className="text-xs text-muted">
                    {formatInt(s.variantes.length)} variantes ·{" "}
                    {formatBRL(s.totalGasto)} no total
                  </div>
                  <div className="flex gap-2 items-end flex-wrap">
                    <label className="flex-1 min-w-[120px] space-y-1">
                      <span className="text-xs text-muted">Apelido</span>
                      <Input
                        value={canonicalDefault}
                        onChange={(e) =>
                          setSuggestionCanonicals((prev) => ({
                            ...prev,
                            [s.token]: e.target.value,
                          }))
                        }
                      />
                    </label>
                    <Button
                      variant="primary"
                      size="sm"
                      className={clsx(
                        "shrink-0 rounded-full",
                        busyToken === s.token && "opacity-70",
                      )}
                      disabled={busyToken === s.token}
                      onClick={() => void handleGroupSuggestion(s.token)}
                    >
                      {busyToken === s.token ? "Agrupando…" : "Agrupar"}
                    </Button>
                  </div>
                </div>
              )
            })}
          </div>
        </section>
      )}

      {hasAnalysis && suggestions.length === 0 && establishmentAliases.length > 0 && (
        <p className="text-sm text-muted">
          Nenhuma sugestão pendente — variantes restantes já estão cobertas.
        </p>
      )}
    </div>
  )
}
