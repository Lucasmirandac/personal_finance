"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Dropzone } from "@/components/Dropzone"
import { StatTile } from "@/components/ui/StatTile"
import { parseCsvFile, CsvRowError } from "@/lib/csv"
import { useAppStore } from "@/lib/store"
import { isProjectionReady } from "@/lib/setupStatus"
import { formatBRL, formatInt } from "@/lib/format"
import { Fonte } from "@/lib/types"
import { Badge } from "@/components/ui/Badge"
import { Button } from "@/components/ui/Button"
import {
  DataTable,
  DataTableCell,
  DataTableHead,
  DataTableRow,
} from "@/components/ui/DataTable"
import {
  AlertTriangle,
  ArrowRight,
  Loader2,
  Trash2,
  XCircle,
} from "lucide-react"

const FONTE_LABELS: Record<Fonte, string> = {
  inter: "Inter",
  nubank: "Nubank",
  manual: "Manual",
}

type Props = {
  /** Após import bem-sucedido, para onde ir */
  redirectAfterImport?: string
  compact?: boolean
}

export function ImportPanel({
  redirectAfterImport,
  compact = false,
}: Readonly<Props>) {
  const {
    loaded,
    dataset,
    hasData,
    normalized,
    settings,
    accounts,
    addSource,
    removeSource,
    clearAllSources,
  } = useAppStore()
  const router = useRouter()
  const [busy, setBusy] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [rowErrors, setRowErrors] = useState<CsvRowError[]>([])
  const [lastDetected, setLastDetected] = useState<Fonte | null>(null)

  async function onFile(file: File) {
    setBusy(true)
    setErrorMsg(null)
    setRowErrors([])
    setLastDetected(null)
    try {
      const result = await parseCsvFile(file, accounts)
      if (result.missingColumns.length > 0) {
        setErrorMsg(result.missingColumns.join(" "))
        setBusy(false)
        return
      }
      if (!result.source || result.source.raw.length === 0) {
        setErrorMsg("Nenhuma linha válida encontrada no CSV.")
        setRowErrors(result.errors)
        setBusy(false)
        return
      }
      if (result.errors.length > 0) {
        setRowErrors(result.errors)
      }
      setLastDetected(result.detectedFormat)
      await addSource(result.source)
      const target =
        redirectAfterImport ??
        (isProjectionReady(
          { sources: [...dataset.sources, result.source] },
          settings,
          accounts,
        )
          ? "/saldo"
          : "/dashboard")
      router.push(target)
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Falha ao ler o arquivo"
      setErrorMsg(msg)
    } finally {
      setBusy(false)
    }
  }

  const gastosOnly = normalized.filter((t) => t.natureza === "Gasto")
  const totalAnalise = gastosOnly.reduce((acc, t) => acc + t.valorAnalise, 0)
  const excluidos = normalized.length - gastosOnly.length
  const totalRows = dataset.sources.reduce((acc, s) => acc + s.rowsRaw, 0)

  return (
    <div className="space-y-4">
      <section>
        {!compact && (
          <>
            <p className="text-[11px] uppercase tracking-wider text-muted">Importar fatura</p>
            <p className="text-xs text-muted mt-0.5 max-w-xl">
              CSV Inter ou Nubank. Processamento 100% local.
            </p>
          </>
        )}

        <div className={compact ? "mt-0" : "mt-3 rounded-2xl ring-1 ring-border/60 bg-surface p-6"}>
          <Dropzone onFile={onFile} disabled={busy} />
        </div>

        {lastDetected && (
          <div className="mt-2 flex items-center gap-2 text-xs">
            <span className="text-muted">Formato:</span>
            <Badge variant="gasto" dot className="rounded-full">
              {FONTE_LABELS[lastDetected]}
            </Badge>
          </div>
        )}

        {busy && (
          <div className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-surface-2 px-3 py-1.5 text-xs text-muted">
            <Loader2 size={12} className="animate-spin" />
            Processando…
          </div>
        )}

        {errorMsg && (
          <div
            className="mt-3 flex gap-2 rounded-2xl bg-[color-mix(in_oklab,var(--system-red)_12%,transparent)] p-3 text-xs"
            role="alert"
          >
            <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-xl text-[var(--system-red)] bg-[color-mix(in_oklab,var(--system-red)_12%,transparent)]">
              <XCircle size={14} />
            </span>
            <div>
              <strong className="text-[var(--system-red)]">Falha:</strong> {errorMsg}
            </div>
          </div>
        )}

        {rowErrors.length > 0 && (
          <div
            className="mt-3 flex gap-2 rounded-2xl bg-[color-mix(in_oklab,var(--system-yellow)_12%,transparent)] p-3 text-xs"
            role="alert"
          >
            <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-xl text-[var(--system-yellow)] bg-[color-mix(in_oklab,var(--system-yellow)_12%,transparent)]">
              <AlertTriangle size={14} />
            </span>
            <div>
              <strong className="text-[var(--system-yellow)]">
                {rowErrors.length} linha(s) ignorada(s)
              </strong>
              <ul className="mt-1 list-disc pl-4 space-y-0.5 max-h-32 overflow-auto">
                {rowErrors.slice(0, 15).map((e) => (
                  <li key={`${e.row}-${e.reason}`}>
                    L.{e.row}: {e.reason}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}
      </section>

      {loaded && hasData && (
        <section className="space-y-3">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div>
              <p className="text-[11px] uppercase tracking-wider text-muted">Base consolidada</p>
              <p className="text-xs text-muted mt-0.5">
                {dataset.sources.length} fonte(s) · {formatInt(totalRows)} linhas
              </p>
            </div>
            <div className="flex gap-2">
              <Button
                variant="danger"
                size="sm"
                className="rounded-full"
                onClick={async () => {
                  if (
                    confirm("Limpar todas as fontes e voltar ao estado inicial?")
                  ) {
                    await clearAllSources()
                  }
                }}
              >
                <Trash2 size={13} />
                Limpar tudo
              </Button>
              <Button
                variant="primary"
                size="sm"
                className="rounded-full"
                onClick={() =>
                  router.push(
                    isProjectionReady(dataset, settings, accounts)
                      ? "/saldo"
                      : "/dashboard",
                  )
                }
              >
                Continuar
                <ArrowRight size={13} />
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <StatTile label="Importadas" value={formatInt(totalRows)} />
            <StatTile label="Consumo" value={formatInt(gastosOnly.length)} />
            <StatTile label="Excluídos" value={formatInt(excluidos)} />
            <StatTile label="Gasto analisado" value={formatBRL(totalAnalise)} />
          </div>

          <div className="rounded-2xl ring-1 ring-border/60 overflow-x-auto">
            <DataTable>
              <thead>
                <tr>
                  <DataTableHead>Arquivo</DataTableHead>
                  <DataTableHead>Fonte</DataTableHead>
                  <DataTableHead align="right">Linhas</DataTableHead>
                  <DataTableHead>Importado</DataTableHead>
                  <DataTableHead />
                </tr>
              </thead>
              <tbody>
                {dataset.sources.map((s) => (
                  <DataTableRow key={s.id}>
                    <DataTableCell className="max-w-[200px] truncate font-medium">
                      {s.fileName}
                    </DataTableCell>
                    <DataTableCell>
                      <Badge variant={s.fonte === "inter" ? "gasto" : "est"} dot>
                        {FONTE_LABELS[s.fonte]}
                      </Badge>
                    </DataTableCell>
                    <DataTableCell align="right" className="font-mono tabular-nums">
                      {formatInt(s.rowsRaw)}
                    </DataTableCell>
                    <DataTableCell className="text-[11px] text-muted">
                      {new Date(s.importedAt).toLocaleString("pt-BR", {
                        dateStyle: "short",
                        timeStyle: "short",
                      })}
                    </DataTableCell>
                    <DataTableCell align="right">
                      <Button
                        variant="danger"
                        size="sm"
                        className="rounded-full"
                        onClick={async () => {
                          if (confirm(`Remover "${s.fileName}" da base?`)) {
                            await removeSource(s.id)
                          }
                        }}
                        aria-label="Remover fonte"
                      >
                        <Trash2 size={13} />
                      </Button>
                    </DataTableCell>
                  </DataTableRow>
                ))}
              </tbody>
            </DataTable>
          </div>
        </section>
      )}
    </div>
  )
}
