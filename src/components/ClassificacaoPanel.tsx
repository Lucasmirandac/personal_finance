"use client"

import { useMemo, useState } from "react"
import { useAppStore } from "@/lib/store"
import { DEFAULT_RULES, Rules } from "@/lib/types"
import { NatureBadge } from "@/components/NatureBadge"
import { StatTile } from "@/components/ui/StatTile"
import { formatBRL, formatInt } from "@/lib/format"
import { g } from "@/lib/glossary"
import { Button } from "@/components/ui/Button"
import { Chip } from "@/components/ui/Chip"
import {
  DataTable,
  DataTableCell,
  DataTableHead,
  DataTableRow,
} from "@/components/ui/DataTable"
import { Input } from "@/components/ui/Input"
import { Plus, RotateCcw, Save, Undo2, X } from "lucide-react"
import { normalizeTransactions } from "@/lib/normalize"

export function ClassificacaoPanel() {
  const { dataset, rules, updateRules, resetRules } = useAppStore()
  const [draft, setDraft] = useState<Rules>(rules)
  const [dirty, setDirty] = useState(false)
  const [storedRules, setStoredRules] = useState<Rules>(rules)
  if (storedRules !== rules) {
    setStoredRules(rules)
    setDraft(rules)
    setDirty(false)
  }

  const allRaw = useMemo(
    () => dataset.sources.flatMap((s) => s.raw),
    [dataset.sources],
  )

  const preview = useMemo(() => {
    if (allRaw.length === 0) return null
    const norm = normalizeTransactions(allRaw, draft)
    const gasto = norm.filter((t) => t.natureza === "Gasto")
    const pag = norm.filter((t) => t.natureza === "Pagamento de fatura")
    const est = norm.filter((t) => t.natureza === "Estorno / crédito")
    const total = gasto.reduce((acc, t) => acc + t.valorAnalise, 0)
    return {
      total,
      countGasto: gasto.length,
      countPag: pag.length,
      countEst: est.length,
      excludedSamples: [...pag, ...est].slice(0, 12),
    }
  }, [allRaw, draft])

  function setPag(list: string[]) {
    setDraft({ ...draft, pagamentoPatterns: list })
    setDirty(true)
  }
  function setEst(list: string[]) {
    setDraft({ ...draft, estornoPatterns: list })
    setDirty(true)
  }
  function setGeneric(list: string[]) {
    setDraft({ ...draft, genericCategorias: list })
    setDirty(true)
  }

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <p className="text-xs text-muted mt-0.5 max-w-xl">
            Padrões de classificação. Salvar recalcula todo o dataset.
          </p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button
            variant="danger"
            size="sm"
            className="rounded-full"
            onClick={async () => {
              if (confirm("Restaurar padrões originais?")) {
                await resetRules()
              }
            }}
          >
            <RotateCcw size={13} />
            Restaurar padrões
          </Button>
          <Button
            size="sm"
            className="rounded-full"
            onClick={() => {
              setDraft(rules)
              setDirty(false)
            }}
            disabled={!dirty}
          >
            <Undo2 size={13} />
            Descartar
          </Button>
          <Button
            variant="primary"
            size="sm"
            className="rounded-full"
            onClick={async () => {
              await updateRules({
                pagamentoPatterns: draft.pagamentoPatterns.filter((p) => p.trim()),
                estornoPatterns: draft.estornoPatterns.filter((p) => p.trim()),
                genericCategorias: draft.genericCategorias
                  .map((p) => p.trim())
                  .filter(Boolean),
              })
              setDirty(false)
            }}
            disabled={!dirty}
          >
            <Save size={13} />
            Salvar e recalcular
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <PatternEditor
          title="Pagamento de fatura"
          description="Lançamentos contendo qualquer um destes padrões viram Pagamento de fatura (Valor análise = 0)."
          values={draft.pagamentoPatterns}
          onChange={setPag}
          placeholderItem="PAGAMENTO ON LINE"
          defaults={DEFAULT_RULES.pagamentoPatterns}
        />
        <PatternEditor
          title="Estorno / crédito"
          description="Lançamentos com valor negativo OU contendo qualquer um destes padrões viram Estorno/crédito (Valor análise = 0)."
          values={draft.estornoPatterns}
          onChange={setEst}
          placeholderItem="ESTORNO"
          defaults={DEFAULT_RULES.estornoPatterns}
        />
        <PatternEditor
          title="Categorias genéricas"
          description='Categorias tratadas como "vazias" pela Auto-categorização (além de "(sem categoria)").'
          values={draft.genericCategorias}
          onChange={setGeneric}
          placeholderItem="Outros"
          defaults={DEFAULT_RULES.genericCategorias}
        />
      </div>

      {preview && (
        <div className="rounded-2xl bg-surface ring-1 ring-border/60 shadow-[var(--shadow-card)] p-4 space-y-3">
          <div className="flex items-center justify-between gap-2">
            <p className="text-[11px] uppercase tracking-wider text-muted">Pré-visualização</p>
            <span className="text-[11px] text-muted">Salve para aplicar</span>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <StatTile label="Gasto" value={formatBRL(preview.total)} info={g("gasto")} />
            <StatTile label="Consumo" value={formatInt(preview.countGasto)} info={g("gasto")} />
            <StatTile label="Pagamentos" value={formatInt(preview.countPag)} info={g("pagamentoFatura")} />
            <StatTile label="Estornos" value={formatInt(preview.countEst)} info={g("estorno")} />
          </div>
          {preview.excludedSamples.length > 0 && (
            <div className="rounded-2xl ring-1 ring-border/60 overflow-x-auto">
              <DataTable>
                <thead>
                  <tr>
                    <DataTableHead>Data</DataTableHead>
                    <DataTableHead>Lançamento</DataTableHead>
                    <DataTableHead>Natureza</DataTableHead>
                    <DataTableHead align="right">Valor</DataTableHead>
                  </tr>
                </thead>
                <tbody>
                  {preview.excludedSamples.map((t) => (
                    <DataTableRow key={t.id}>
                      <DataTableCell>{t.data}</DataTableCell>
                      <DataTableCell className="max-w-[280px] truncate">
                        {t.lancamento}
                      </DataTableCell>
                      <DataTableCell>
                        <NatureBadge natureza={t.natureza} />
                      </DataTableCell>
                      <DataTableCell align="right" className="font-mono tabular-nums">
                        {formatBRL(t.valorOriginal)}
                      </DataTableCell>
                    </DataTableRow>
                  ))}
                </tbody>
              </DataTable>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

type PatternEditorProps = {
  title: string
  description: string
  values: string[]
  onChange: (next: string[]) => void
  placeholderItem: string
  defaults: string[]
}

function PatternEditor({
  title,
  description,
  values,
  onChange,
  placeholderItem,
  defaults,
}: Readonly<PatternEditorProps>) {
  const [input, setInput] = useState("")

  function add() {
    const v = input.trim()
    if (!v) return
    if (values.some((x) => x.toUpperCase() === v.toUpperCase())) {
      setInput("")
      return
    }
    onChange([...values, v])
    setInput("")
  }

  function remove(idx: number) {
    const next = [...values]
    next.splice(idx, 1)
    onChange(next)
  }

  function setIdx(idx: number, v: string) {
    const next = [...values]
    next[idx] = v
    onChange(next)
  }

  return (
    <div className="flex flex-col overflow-hidden rounded-2xl bg-surface ring-1 ring-border/60 shadow-[var(--shadow-card)]">
      <div className="px-4 py-3 border-b border-border/60">
        <p className="text-[11px] uppercase tracking-wider text-muted">{title}</p>
        <p className="text-xs text-muted mt-0.5">{description}</p>
      </div>
      <ul className="divide-y divide-border/60">
        {values.map((v, i) => (
          <li key={i} className="flex items-center gap-2 px-4 py-2">
            <Input value={v} onChange={(e) => setIdx(i, e.target.value)} />
            <Button
              variant="ghost"
              size="sm"
              className="shrink-0 rounded-full"
              onClick={() => remove(i)}
              aria-label="Remover padrão"
            >
              <X size={13} />
            </Button>
          </li>
        ))}
      </ul>
      <div className="flex gap-2 p-4 border-t border-border/60">
        <Input
          placeholder={placeholderItem}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault()
              add()
            }
          }}
        />
        <Button
          variant="primary"
          size="sm"
          className="shrink-0 rounded-full"
          onClick={add}
          aria-label="Adicionar padrão"
        >
          <Plus size={13} />
        </Button>
      </div>
      <div className="text-xs text-muted px-4 pb-4 flex flex-wrap gap-1.5">
        <span className="w-full text-[11px]">Padrões originais:</span>
        {defaults.map((d) => (
          <Chip key={d}>{d}</Chip>
        ))}
      </div>
    </div>
  )
}
