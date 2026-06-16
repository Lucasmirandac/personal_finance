"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Dropzone } from "@/components/Dropzone"
import { StatTile } from "@/components/ui/StatTile"
import {
  CsvRowError,
  detectFormatFromText,
  parseCsvText,
} from "@/lib/csv"
import { findCardAccountByFonte, hasCardCycleConfigured } from "@/lib/accounts"
import { useAppStore } from "@/lib/store"
import { isProjectionReady } from "@/lib/setupStatus"
import { formatBRL, formatInt } from "@/lib/format"
import { Fonte } from "@/lib/types"
import { Badge } from "@/components/ui/Badge"
import { Button } from "@/components/ui/Button"
import { IntegerInput } from "@/components/ui/IntegerInput"
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
import type { Account } from "@/lib/types"

const FONTE_LABELS: Record<Fonte, string> = {
  inter: "Inter",
  nubank: "Nubank",
  manual: "Manual",
}

type PendingImport = {
  fileName: string
  text: string
  format: "inter" | "nubank"
}

type Props = {
  /** Após import bem-sucedido, para onde ir */
  redirectAfterImport?: string
  compact?: boolean
}

function parseCycleDay(value: string): number | null {
  const n = Number(value)
  if (!Number.isInteger(n) || n < 1 || n > 31) return null
  return n
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
    confirmCardAccountCycle,
    removeSource,
    clearAllSources,
  } = useAppStore()
  const router = useRouter()
  const [busy, setBusy] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [rowErrors, setRowErrors] = useState<CsvRowError[]>([])
  const [lastDetected, setLastDetected] = useState<Fonte | null>(null)
  const [pendingImport, setPendingImport] = useState<PendingImport | null>(null)
  const [diaFechamento, setDiaFechamento] = useState("10")
  const [diaPagamento, setDiaPagamento] = useState("20")

  const fechamentoValid = parseCycleDay(diaFechamento) != null
  const pagamentoValid = parseCycleDay(diaPagamento) != null
  const cycleFormValid = fechamentoValid && pagamentoValid

  async function commitImport(
    fileName: string,
    text: string,
    accountsForParse: Account[],
  ) {
    const result = parseCsvText(text, fileName, accountsForParse)
    if (result.missingColumns.length > 0) {
      setErrorMsg(result.missingColumns.join(" "))
      return false
    }
    if (!result.source || result.source.raw.length === 0) {
      setErrorMsg("Nenhuma linha válida encontrada no CSV.")
      setRowErrors(result.errors)
      return false
    }
    if (result.errors.length > 0) {
      setRowErrors(result.errors)
    } else {
      setRowErrors([])
    }
    setLastDetected(result.detectedFormat)
    await addSource(result.source, { accounts: accountsForParse })
    const target =
      redirectAfterImport ??
      (isProjectionReady(
        { sources: [...dataset.sources, result.source] },
        settings,
        accountsForParse,
      )
        ? "/saldo"
        : "/dashboard")
    router.push(target)
    return true
  }

  async function onFile(file: File) {
    setBusy(true)
    setErrorMsg(null)
    setRowErrors([])
    setLastDetected(null)
    setPendingImport(null)
    try {
      const text = await file.text()
      const format = detectFormatFromText(text)
      if (!format) {
        setErrorMsg(
          "Formato não reconhecido. Use Inter (Data, Lançamento, Categoria, Tipo, Valor) ou Nubank (date, title, amount).",
        )
        return
      }
      if (format === "inter" || format === "nubank") {
        const cardAccount = findCardAccountByFonte(accounts, format)
        if (!hasCardCycleConfigured(cardAccount)) {
          setPendingImport({ fileName: file.name, text, format })
          setDiaFechamento(
            cardAccount?.diaFechamento != null
              ? String(cardAccount.diaFechamento)
              : "10",
          )
          setDiaPagamento(
            cardAccount?.diaPagamento != null
              ? String(cardAccount.diaPagamento)
              : "20",
          )
          return
        }
      }
      await commitImport(file.name, text, accounts)
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Falha ao ler o arquivo"
      setErrorMsg(msg)
    } finally {
      setBusy(false)
    }
  }

  async function onConfirmCycleImport() {
    if (!pendingImport || !cycleFormValid) return
    setBusy(true)
    setErrorMsg(null)
    setRowErrors([])
    try {
      const { accounts: nextAccounts } = await confirmCardAccountCycle(
        pendingImport.format,
        {
          diaFechamento: parseCycleDay(diaFechamento)!,
          diaPagamento: parseCycleDay(diaPagamento)!,
        },
      )
      const ok = await commitImport(
        pendingImport.fileName,
        pendingImport.text,
        nextAccounts,
      )
      if (ok) {
        setPendingImport(null)
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Falha ao importar o arquivo"
      setErrorMsg(msg)
    } finally {
      setBusy(false)
    }
  }

  function cancelPendingImport() {
    setPendingImport(null)
    setErrorMsg(null)
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
            <p className="text-caption uppercase tracking-wider text-muted">Importar fatura</p>
            <p className="text-xs text-muted mt-0.5 max-w-xl">
              CSV Inter ou Nubank. Processamento 100% local.
            </p>
          </>
        )}

        {pendingImport ? (
          <div
            className={
              compact
                ? "mt-0 space-y-4 rounded-2xl border border-border bg-surface p-4"
                : "mt-3 space-y-4 rounded-2xl ring-1 ring-border/60 bg-surface p-6"
            }
          >
            <div>
              <p className="text-sm font-semibold">Ciclo da fatura</p>
              <p className="mt-1 text-xs text-muted leading-relaxed">
                Informe o dia de fechamento e de pagamento do cartão{" "}
                {FONTE_LABELS[pendingImport.format]}. Esses dias definem em qual
                mês cada compra entra — especialmente parcelas Inter. Sem isso,
                a fatura pode cair no mês errado.
              </p>
              <p className="mt-2 text-caption text-muted">
                Arquivo: {pendingImport.fileName}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <label className="block space-y-1">
                <span className="text-xs text-muted">Dia de fechamento</span>
                <IntegerInput
                  min={1}
                  max={31}
                  value={diaFechamento}
                  onChange={setDiaFechamento}
                />
              </label>
              <label className="block space-y-1">
                <span className="text-xs text-muted">Dia de pagamento</span>
                <IntegerInput
                  min={1}
                  max={31}
                  value={diaPagamento}
                  onChange={setDiaPagamento}
                />
              </label>
            </div>

            <div className="flex flex-wrap gap-2">
              <Button
                variant="primary"
                className="rounded-xl"
                disabled={!cycleFormValid || busy}
                onClick={onConfirmCycleImport}
              >
                Confirmar e importar
              </Button>
              <Button
                className="rounded-xl"
                disabled={busy}
                onClick={cancelPendingImport}
              >
                Cancelar
              </Button>
            </div>
          </div>
        ) : (
          <div className={compact ? "mt-0" : "mt-3 rounded-2xl ring-1 ring-border/60 bg-surface p-6"}>
            <Dropzone onFile={onFile} disabled={busy} />
          </div>
        )}

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
              <p className="text-caption uppercase tracking-wider text-muted">Base consolidada</p>
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
                    <DataTableCell className="text-caption text-muted">
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
