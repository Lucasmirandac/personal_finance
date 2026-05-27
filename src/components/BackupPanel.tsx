"use client";

import { useCallback, useMemo, useState } from "react";
import {
  BackupFile,
  BackupImportMode,
  computeMergePreview,
  daysSince,
  parseBackup,
  summarizeBackup,
} from "@/lib/backup";
import { useAppStore } from "@/lib/store";
import { formatInt } from "@/lib/format";
import { Button } from "@/components/ui/Button";
import { Textarea } from "@/components/ui/Input";
import { Panel } from "@/components/ui/Panel";
import { SectionTitle } from "@/components/ui/SectionTitle";
import { Download, Upload, AlertTriangle, CheckCircle2 } from "lucide-react";

export function BackupPanel() {
  const {
    dataset,
    rules,
    recurringRules,
    settings,
    edits,
    accounts,
    manualTransactions,
    budgets,
    subscriptionDismissals,
    establishmentAliases,
    lastBackupAt,
    exportBackup,
    importBackup,
  } = useAppStore();

  const [jsonText, setJsonText] = useState("");
  const [parsed, setParsed] = useState<BackupFile | null>(null);
  const [parseError, setParseError] = useState<string | null>(null);
  const [mode, setMode] = useState<BackupImportMode>("replace");
  const [busy, setBusy] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [importError, setImportError] = useState<string | null>(null);

  const currentSummary = useMemo(
    () =>
      summarizeBackup({
        dataset,
        rules,
        recurring: recurringRules,
        settings,
        edits,
        accounts,
        manualTransactions,
        budgets,
        subscriptionDismissals,
        establishmentAliases,
      }),
    [
      dataset,
      rules,
      recurringRules,
      settings,
      edits,
      accounts,
      manualTransactions,
      budgets,
      subscriptionDismissals,
      establishmentAliases,
    ],
  );

  const backupDays = daysSince(lastBackupAt);

  const currentPayload = useMemo(
    () => ({
      dataset,
      rules,
      recurring: recurringRules,
      settings,
      edits,
      accounts,
      manualTransactions,
      budgets,
      subscriptionDismissals,
      establishmentAliases,
    }),
    [
      dataset,
      rules,
      recurringRules,
      settings,
      edits,
      accounts,
      manualTransactions,
      budgets,
      subscriptionDismissals,
      establishmentAliases,
    ],
  );

  const mergePreview = useMemo(() => {
    if (!parsed || mode !== "merge") return null;
    return computeMergePreview(currentPayload, parsed.data);
  }, [parsed, mode, currentPayload]);

  const parsedSummary = parsed ? summarizeBackup(parsed) : null;

  const handleParse = useCallback((text: string) => {
    setJsonText(text);
    setSuccessMsg(null);
    setImportError(null);
    if (!text.trim()) {
      setParsed(null);
      setParseError(null);
      return;
    }
    const result = parseBackup(text);
    if (!result.ok) {
      setParsed(null);
      setParseError(result.error);
      return;
    }
    setParsed(result.backup);
    setParseError(null);
  }, []);

  async function onFile(file: File) {
    try {
      const text = await file.text();
      handleParse(text);
    } catch {
      setParseError("Não foi possível ler o arquivo.");
    }
  }

  async function handleExport() {
    setBusy(true);
    setImportError(null);
    setSuccessMsg(null);
    try {
      await exportBackup();
      setSuccessMsg("Backup exportado com sucesso.");
    } catch {
      setImportError("Erro ao exportar backup.");
    } finally {
      setBusy(false);
    }
  }

  async function handleImport() {
    if (!parsed) return;
    const msg =
      mode === "replace"
        ? "Substituir todos os dados atuais pelo backup? Esta ação não pode ser desfeita."
        : "Mesclar o backup com os dados atuais? Regras, configurações e edições do backup substituirão as atuais.";
    if (!window.confirm(msg)) return;

    setBusy(true);
    setImportError(null);
    setSuccessMsg(null);
    try {
      await importBackup(parsed, mode);
      setSuccessMsg(
        mode === "replace"
          ? "Backup restaurado. Todos os dados foram substituídos."
          : "Backup mesclado com sucesso.",
      );
      setJsonText("");
      setParsed(null);
      setParseError(null);
    } catch (e) {
      setImportError(
        e instanceof Error ? e.message : "Erro ao restaurar backup.",
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-6">
      <Panel className="p-4 space-y-3">
        <div>
          <SectionTitle>Exportar tudo</SectionTitle>
          <p className="text-[11px] text-muted mt-0.5">
            Salva dataset, contas, transações manuais, recorrentes, regras,
            configurações e edições em um único arquivo JSON.
          </p>
        </div>
        <p className="text-sm">
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
        <Button variant="primary" disabled={busy} onClick={handleExport}>
          <Download size={14} />
          Exportar tudo (JSON)
        </Button>
      </Panel>

      <Panel className="p-4 space-y-3">
        <div>
          <SectionTitle>Restaurar backup</SectionTitle>
          <p className="text-[11px] text-muted mt-0.5">
            Cole o JSON ou arraste um arquivo de backup exportado anteriormente.
          </p>
        </div>

        <div
          className="border border-dashed border-border rounded-md p-4 text-center"
          onDragOver={(e) => {
            e.preventDefault();
            e.stopPropagation();
          }}
          onDrop={(e) => {
            e.preventDefault();
            const file = e.dataTransfer.files[0];
            if (file) void onFile(file);
          }}
        >
          <p className="text-xs text-muted mb-2">Arraste o arquivo .json aqui</p>
          <label className="inline-flex items-center justify-center gap-1.5 font-medium rounded-md border whitespace-nowrap border-border bg-surface text-foreground hover:bg-surface-2 hover:border-border-strong text-xs px-2 py-1 cursor-pointer">
            <Upload size={13} />
            Escolher arquivo
            <input
              type="file"
              accept=".json,application/json"
              className="sr-only"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) void onFile(file);
                e.target.value = "";
              }}
            />
          </label>
        </div>

        <label className="block space-y-1">
          <span className="text-xs text-muted">Ou cole o JSON</span>
          <Textarea
            className="min-h-[120px] font-mono text-xs"
            placeholder='{"version":1,"app":"personal-finance",...}'
            value={jsonText}
            onChange={(e) => handleParse(e.target.value)}
          />
        </label>

        {parseError && (
          <p className="text-xs text-danger flex items-start gap-1.5">
            <AlertTriangle size={14} className="shrink-0 mt-0.5" />
            {parseError}
          </p>
        )}

        {parsed && parsedSummary && (
          <div className="border border-border rounded-md p-3 space-y-3 bg-surface-2/50">
            <p className="text-xs flex items-center gap-1.5 text-success">
              <CheckCircle2 size={14} />
              Backup válido · exportado em{" "}
              {new Date(parsed.exportedAt).toLocaleString("pt-BR")}
            </p>
            <p className="text-sm">
              Conteúdo: {formatInt(parsedSummary.sources)} fontes ·{" "}
              {formatInt(parsedSummary.transactions)} transações ·{" "}
              {formatInt(parsedSummary.accounts)} contas ·{" "}
              {formatInt(parsedSummary.recurring)} recorrentes ·{" "}
              {formatInt(parsedSummary.budgets)} orçamentos ·{" "}
              {formatInt(parsedSummary.dismissals)} dispensas ·{" "}
              {formatInt(parsedSummary.aliases)} apelidos
            </p>

            <fieldset className="space-y-2">
              <legend className="text-xs text-muted">Modo de restauração</legend>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="radio"
                  name="backup-mode"
                  checked={mode === "replace"}
                  onChange={() => setMode("replace")}
                />
                Substituir tudo
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="radio"
                  name="backup-mode"
                  checked={mode === "merge"}
                  onChange={() => setMode("merge")}
                />
                Mesclar com dados atuais
              </label>
            </fieldset>

            {mergePreview && (
              <p className="text-xs text-muted">
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
              <p className="text-xs text-warning">
                Substituir apaga todos os dados atuais antes de aplicar o backup.
              </p>
            )}

            <Button
              variant="primary"
              size="sm"
              disabled={busy}
              onClick={() => void handleImport()}
            >
              Confirmar restauração
            </Button>
          </div>
        )}
      </Panel>

      {successMsg && (
        <Panel className="p-3 border-success/30">
          <p className="text-sm text-success">{successMsg}</p>
        </Panel>
      )}
      {importError && (
        <Panel className="p-3">
          <p className="text-sm text-danger">{importError}</p>
        </Panel>
      )}
    </div>
  );
}
