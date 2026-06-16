"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import {
  BackupFile,
  BackupImportMode,
  computeMergePreview,
  daysSince,
  parseBackup,
  summarizeBackup,
} from "@/lib/backup"
import { useAppStore } from "@/lib/store"
import { formatInt } from "@/lib/format"
import { Button } from "@/components/ui/Button"
import { LabelWithInfo } from "@/components/ui/LabelWithInfo"
import { g } from "@/lib/glossary"
import { SegmentedControl } from "@/components/ui/SegmentedControl"
import { Textarea } from "@/components/ui/Input"
import { Download, Upload, AlertTriangle, CheckCircle2, ShieldCheck, XCircle } from "lucide-react"
import {
  getStoragePersistenceStatus,
  requestStoragePersistence,
  type StoragePersistenceStatus,
} from "@/lib/storagePersistence"

export function BackupPanel() {
  const {
    dataset,
    rules,
    recurringRules,
    settings,
    edits,
    installmentGroupEdits,
    accounts,
    manualTransactions,
    budgets,
    subscriptionDismissals,
    establishmentAliases,
    structuralCategories,
    achievements,
    monthCloses,
    paymentStatus,
    lastBackupAt,
    exportBackup,
    importBackup,
  } = useAppStore()

  const [jsonText, setJsonText] = useState("")
  const [parsed, setParsed] = useState<BackupFile | null>(null)
  const [parseError, setParseError] = useState<string | null>(null)
  const [mode, setMode] = useState<BackupImportMode>("replace")
  const [busy, setBusy] = useState(false)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)
  const [importError, setImportError] = useState<string | null>(null)
  const [storageStatus, setStorageStatus] =
    useState<StoragePersistenceStatus>("unknown")
  const [storageRetrying, setStorageRetrying] = useState(false)

  useEffect(() => {
    let alive = true
    void getStoragePersistenceStatus().then((status) => {
      if (alive) setStorageStatus(status)
    })
    return () => {
      alive = false
    }
  }, [])

  const handleRequestStorageProtection = useCallback(async () => {
    setStorageRetrying(true)
    try {
      await requestStoragePersistence()
      const next = await getStoragePersistenceStatus()
      setStorageStatus(next)
    } finally {
      setStorageRetrying(false)
    }
  }, [])

  const currentSummary = useMemo(
    () =>
      summarizeBackup({
        dataset,
        rules,
        recurring: recurringRules,
        settings,
        edits,
        installmentGroupEdits,
        accounts,
        manualTransactions,
        budgets,
        subscriptionDismissals,
        establishmentAliases,
        structuralCategories,
        achievements,
        monthCloses,
        paymentStatus,
      }),
    [
      dataset,
      rules,
      recurringRules,
      settings,
      edits,
      installmentGroupEdits,
      accounts,
      manualTransactions,
      budgets,
      subscriptionDismissals,
      establishmentAliases,
      structuralCategories,
      achievements,
      monthCloses,
      paymentStatus,
    ],
  )

  const backupDays = daysSince(lastBackupAt)

  const currentPayload = useMemo(
    () => ({
      dataset,
      rules,
      recurring: recurringRules,
      settings,
      edits,
      installmentGroupEdits,
      accounts,
      manualTransactions,
      budgets,
      subscriptionDismissals,
      establishmentAliases,
      structuralCategories,
      achievements,
      monthCloses,
      paymentStatus,
    }),
    [
      dataset,
      rules,
      recurringRules,
      settings,
      edits,
      installmentGroupEdits,
      accounts,
      manualTransactions,
      budgets,
      subscriptionDismissals,
      establishmentAliases,
      structuralCategories,
      achievements,
      monthCloses,
      paymentStatus,
    ],
  )

  const mergePreview = useMemo(() => {
    if (!parsed || mode !== "merge") return null
    return computeMergePreview(currentPayload, parsed.data)
  }, [parsed, mode, currentPayload])

  const parsedSummary = parsed ? summarizeBackup(parsed) : null

  const handleParse = useCallback((text: string) => {
    setJsonText(text)
    setSuccessMsg(null)
    setImportError(null)
    if (!text.trim()) {
      setParsed(null)
      setParseError(null)
      return
    }
    const result = parseBackup(text)
    if (!result.ok) {
      setParsed(null)
      setParseError(result.error)
      return
    }
    setParsed(result.backup)
    setParseError(null)
  }, [])

  async function onFile(file: File) {
    try {
      const text = await file.text()
      handleParse(text)
    } catch {
      setParseError("Não foi possível ler o arquivo.")
    }
  }

  async function handleExport() {
    setBusy(true)
    setImportError(null)
    setSuccessMsg(null)
    try {
      await exportBackup()
      setSuccessMsg("Backup exportado com sucesso.")
    } catch {
      setImportError("Erro ao exportar backup.")
    } finally {
      setBusy(false)
    }
  }

  async function handleImport() {
    if (!parsed) return
    const msg =
      mode === "replace"
        ? "Substituir todos os dados atuais pelo backup? Esta ação não pode ser desfeita."
        : "Mesclar o backup com os dados atuais? Regras, configurações e edições do backup substituirão as atuais."
    if (!window.confirm(msg)) return

    setBusy(true)
    setImportError(null)
    setSuccessMsg(null)
    try {
      await importBackup(parsed, mode)
      setSuccessMsg(
        mode === "replace"
          ? "Backup restaurado. Todos os dados foram substituídos."
          : "Backup mesclado com sucesso.",
      )
      setJsonText("")
      setParsed(null)
      setParseError(null)
    } catch (e) {
      setImportError(
        e instanceof Error ? e.message : "Erro ao restaurar backup.",
      )
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="space-y-4">
      <StoragePersistenceCard
        status={storageStatus}
        retrying={storageRetrying}
        onRequestProtection={() => void handleRequestStorageProtection()}
      />

      <div className="rounded-2xl bg-surface ring-1 ring-border/60 shadow-[var(--shadow-card)] p-5 space-y-3">
        <div>
          <p className="text-caption uppercase tracking-wider text-muted">Exportar tudo</p>
          <p className="text-xs text-muted mt-0.5">
            Salva dataset, contas, transações manuais, recorrentes, regras,
            configurações e edições em um único arquivo JSON.
          </p>
        </div>
        <p className="text-sm tabular-nums">
          {formatInt(currentSummary.sources)} fontes ·{" "}
          {formatInt(currentSummary.transactions)} transações ·{" "}
          {formatInt(currentSummary.accounts)} contas
          {lastBackupAt && backupDays !== null && (
            <span className="text-muted">
              {" "}
              · última exportação{" "}
              {backupDays === 0
                ? "hoje"
                : backupDays === 1
                  ? "há 1 dia"
                  : `há ${backupDays} dias`}
            </span>
          )}
        </p>
        <Button variant="primary" className="rounded-full" disabled={busy} onClick={handleExport}>
          <Download size={14} />
          Exportar tudo (JSON)
        </Button>
      </div>

      <div className="rounded-2xl bg-surface ring-1 ring-border/60 shadow-[var(--shadow-card)] p-5 space-y-3">
        <div>
          <p className="text-caption uppercase tracking-wider text-muted">Restaurar backup</p>
          <p className="text-xs text-muted mt-0.5">
            Cole o JSON ou arraste um arquivo de backup exportado anteriormente.
          </p>
        </div>

        <div
          className="rounded-2xl border border-dashed border-border bg-surface-2/40 p-6 text-center"
          onDragOver={(e) => {
            e.preventDefault()
            e.stopPropagation()
          }}
          onDrop={(e) => {
            e.preventDefault()
            const file = e.dataTransfer.files[0]
            if (file) void onFile(file)
          }}
        >
          <p className="text-xs text-muted mb-2">Arraste o arquivo .json aqui</p>
          <label className="inline-flex items-center justify-center gap-1.5 font-medium rounded-full border whitespace-nowrap border-border bg-surface text-foreground hover:bg-surface-2 hover:border-border-strong text-xs px-3 py-1.5 cursor-pointer">
            <Upload size={13} />
            Escolher arquivo
            <input
              type="file"
              accept=".json,application/json"
              className="sr-only"
              onChange={(e) => {
                const file = e.target.files?.[0]
                if (file) void onFile(file)
                e.target.value = ""
              }}
            />
          </label>
        </div>

        <label className="block space-y-1">
          <span className="text-xs text-muted">Ou cole o JSON</span>
          <Textarea
            className="min-h-[120px] font-mono text-xs bg-surface-2/40 rounded-2xl border border-border/60"
            placeholder='{"version":1,"app":"personal-finance",...}'
            value={jsonText}
            onChange={(e) => handleParse(e.target.value)}
          />
        </label>

        {parseError && (
          <div
            className="flex items-center gap-2 rounded-2xl bg-[color-mix(in_oklab,var(--system-red)_12%,transparent)] px-4 py-2 text-xs text-[var(--system-red)]"
            role="alert"
          >
            <XCircle size={14} className="shrink-0" />
            {parseError}
          </div>
        )}

        {parsed && parsedSummary && (
          <div className="rounded-2xl bg-surface-2/50 ring-1 ring-border/60 p-4 space-y-3">
            <p className="text-xs flex items-center gap-1.5 text-[var(--system-green)]">
              <CheckCircle2 size={14} />
              Backup válido · exportado em{" "}
              {new Date(parsed.exportedAt).toLocaleString("pt-BR")}
            </p>
            <p className="text-sm tabular-nums">
              Conteúdo: {formatInt(parsedSummary.sources)} fontes ·{" "}
              {formatInt(parsedSummary.transactions)} transações ·{" "}
              {formatInt(parsedSummary.accounts)} contas ·{" "}
              {formatInt(parsedSummary.recurring)} recorrentes ·{" "}
              {formatInt(parsedSummary.budgets)} orçamentos ·{" "}
              {formatInt(parsedSummary.dismissals)} dispensas ·{" "}
              {formatInt(parsedSummary.aliases)} apelidos
            </p>

            <div className="space-y-2">
              <LabelWithInfo labelClassName="text-xs text-muted" info={g("mesclar")} ariaTopic="Modo de restauração">
                Modo de restauração
              </LabelWithInfo>
              <SegmentedControl<BackupImportMode>
                value={mode}
                onChange={setMode}
                options={[
                  { value: "replace", label: "Substituir tudo" },
                  { value: "merge", label: "Mesclar" },
                ]}
                size="sm"
              />
            </div>

            {mergePreview && (
              <p className="text-xs text-muted tabular-nums">
                Serão adicionados: {formatInt(mergePreview.sourcesToAdd)} fontes,{" "}
                {formatInt(mergePreview.transactionsToAdd)} transações,{" "}
                {formatInt(mergePreview.accountsToAdd)} contas,{" "}
                {formatInt(mergePreview.recurringToAdd)} recorrentes,{" "}
                {formatInt(mergePreview.budgetsToAdd)} orçamentos,{" "}
                {formatInt(mergePreview.dismissalsToAdd)} dispensas,{" "}
                {formatInt(mergePreview.aliasesToAdd)} apelidos.
              </p>
            )}

            {mode === "replace" && (
              <div
                className="flex items-center gap-2 rounded-2xl bg-[color-mix(in_oklab,var(--system-orange)_12%,transparent)] px-4 py-2 text-xs text-[var(--system-orange)]"
                role="alert"
              >
                <AlertTriangle size={14} className="shrink-0" />
                Substituir apaga todos os dados atuais antes de aplicar o backup.
              </div>
            )}

            <Button
              variant="primary"
              size="sm"
              className="rounded-full"
              disabled={busy}
              onClick={() => void handleImport()}
            >
              Confirmar restauração
            </Button>
          </div>
        )}
      </div>

      {successMsg && (
        <div
          className="flex items-center gap-2 rounded-2xl bg-[color-mix(in_oklab,var(--system-green)_12%,transparent)] px-4 py-3 text-sm text-[var(--system-green)]"
          role="status"
          aria-live="polite"
        >
          <CheckCircle2 size={16} className="shrink-0" />
          {successMsg}
        </div>
      )}
      {importError && (
        <div
          className="flex items-center gap-2 rounded-2xl bg-[color-mix(in_oklab,var(--system-red)_12%,transparent)] px-4 py-3 text-sm text-[var(--system-red)]"
          role="alert"
        >
          <XCircle size={16} className="shrink-0" />
          {importError}
        </div>
      )}
    </div>
  )
}

function StoragePersistenceCard({
  status,
  retrying,
  onRequestProtection,
}: Readonly<{
  status: StoragePersistenceStatus
  retrying: boolean
  onRequestProtection: () => void
}>) {
  const showRetry =
    status === "best_effort" || status === "unknown"

  return (
    <div className="rounded-2xl bg-surface ring-1 ring-border/60 shadow-[var(--shadow-card)] p-5 space-y-3">
      <div className="flex items-start gap-3">
        <span className="mt-0.5 text-accent">
          <ShieldCheck size={18} />
        </span>
        <div className="min-w-0 flex-1 space-y-1">
          <p className="text-caption uppercase tracking-wider text-muted">
            Proteção local
          </p>
          <p className="text-sm">{storagePersistenceMessage(status)}</p>
          {status === "unsupported" && (
            <p className="text-xs text-muted">
              Exporte backups com frequência como rede de segurança.
            </p>
          )}
        </div>
      </div>
      {showRetry && (
        <Button
          size="sm"
          className="rounded-full"
          disabled={retrying}
          onClick={onRequestProtection}
        >
          {retrying ? "Solicitando…" : "Solicitar proteção"}
        </Button>
      )}
    </div>
  )
}

function storagePersistenceMessage(status: StoragePersistenceStatus): string {
  switch (status) {
    case "persistent":
      return "Armazenamento persistente ativo neste navegador."
    case "best_effort":
      return "O navegador ainda pode apagar dados automaticamente em falta de espaço. Exporte backups com frequência."
    case "unsupported":
      return "Este navegador não suporta solicitação de armazenamento persistente."
    case "unknown":
      return "Não foi possível verificar a proteção local. Exporte backups com frequência."
  }
}
