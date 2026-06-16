"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  Cloud,
  CloudOff,
  Lock,
  RefreshCw,
  Shield,
  Unlink,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { SectionTitle } from "@/components/ui/SectionTitle";
import { SegmentedControl } from "@/components/ui/SegmentedControl";
import {
  computeMergePreview,
  summarizeBackup,
  type BackupImportMode,
} from "@/lib/backup";
import { useAppStore } from "@/lib/store";
import {
  changeCloudPassphrase,
  connectCloudProvider,
  disconnectCloudProvider,
  dismissPendingRestore,
  getCloudSyncState,
  lockCloudPassphrase,
  resolveConflictMerge,
  resolveConflictUseLocal,
  resolveConflictUseRemote,
  restorePendingRemote,
  setupCloudPassphrase,
  subscribeCloudSync,
  syncNow,
  unlockCloudPassphrase,
} from "@/lib/cloud-sync/orchestrator";
import type { CloudProviderId, CloudSyncState } from "@/lib/cloud-sync/types";

const STATUS_LABELS: Record<CloudSyncState["status"], string> = {
  idle: "Sincronizado",
  locked: "Senha bloqueada",
  pending: "Alterações pendentes…",
  uploading: "Enviando…",
  downloading: "Baixando…",
  conflict: "Conflito detectado",
  offline: "Offline — sync pausado",
  error: "Erro na sincronização",
};

function formatSyncTime(iso: string | null): string {
  if (!iso) return "Nunca";
  return new Date(iso).toLocaleString("pt-BR");
}

export function CloudSyncPanel() {
  const store = useAppStore();
  const [syncState, setSyncState] = useState<CloudSyncState>(getCloudSyncState);
  const [passphrase, setPassphrase] = useState("");
  const [confirmPassphrase, setConfirmPassphrase] = useState("");
  const [unlockPassphrase, setUnlockPassphrase] = useState("");
  const [rememberDevice, setRememberDevice] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showChangePassphrase, setShowChangePassphrase] = useState(false);
  const [oldPassphrase, setOldPassphrase] = useState("");
  const [newPassphrase, setNewPassphrase] = useState("");
  const [mergeMode, setMergeMode] = useState<BackupImportMode>("replace");

  useEffect(() => subscribeCloudSync(setSyncState), []);

  const currentSummary = useMemo(
    () =>
      summarizeBackup({
        dataset: store.dataset,
        rules: store.rules,
        recurring: store.recurringRules,
        settings: store.settings,
        edits: store.edits,
        installmentGroupEdits: store.installmentGroupEdits,
        accounts: store.accounts,
        manualTransactions: store.manualTransactions,
        budgets: store.budgets,
        subscriptionDismissals: store.subscriptionDismissals,
        establishmentAliases: store.establishmentAliases,
        structuralCategories: store.structuralCategories,
        achievements: store.achievements,
        monthCloses: store.monthCloses,
        paymentStatus: store.paymentStatus,
      }),
    [store],
  );

  const remoteSummary = useMemo(
    () =>
      syncState.conflict
        ? summarizeBackup(syncState.conflict.remoteBackup.data)
        : null,
    [syncState.conflict],
  );

  const mergePreview = useMemo(() => {
    if (!syncState.conflict || mergeMode !== "merge") return null;
    return computeMergePreview(
      {
        dataset: store.dataset,
        rules: store.rules,
        recurring: store.recurringRules,
        settings: store.settings,
        edits: store.edits,
        installmentGroupEdits: store.installmentGroupEdits,
        accounts: store.accounts,
        manualTransactions: store.manualTransactions,
        budgets: store.budgets,
        subscriptionDismissals: store.subscriptionDismissals,
        establishmentAliases: store.establishmentAliases,
        structuralCategories: store.structuralCategories,
        achievements: store.achievements,
        monthCloses: store.monthCloses,
        paymentStatus: store.paymentStatus,
      },
      syncState.conflict.remoteBackup.data,
    );
  }, [syncState.conflict, mergeMode, store]);

  const run = useCallback(async (fn: () => Promise<void>) => {
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      await fn();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro inesperado.");
    } finally {
      setBusy(false);
    }
  }, []);

  async function handleSetupPassphrase() {
    if (passphrase.length < 8) {
      setError("Use pelo menos 8 caracteres na senha.");
      return;
    }
    if (passphrase !== confirmPassphrase) {
      setError("As senhas não coincidem.");
      return;
    }
    await run(async () => {
      await setupCloudPassphrase(passphrase, rememberDevice);
      setPassphrase("");
      setConfirmPassphrase("");
      setMessage("Senha de criptografia configurada.");
    });
  }

  async function handleUnlock() {
    await run(async () => {
      await unlockCloudPassphrase(unlockPassphrase);
      setUnlockPassphrase("");
      setMessage("Senha desbloqueada nesta sessão.");
    });
  }

  async function handleConnect(provider: CloudProviderId) {
    await run(async () => {
      await connectCloudProvider(provider);
      setMessage(`Conectado ao ${provider === "google" ? "Google Drive" : "Dropbox"}.`);
    });
  }

  async function handleDisconnect() {
    if (!window.confirm("Desconectar a sincronização na nuvem?")) return;
    await run(async () => {
      await disconnectCloudProvider();
      setMessage("Provedor desconectado.");
    });
  }

  async function handleChangePassphrase() {
    if (newPassphrase.length < 8) {
      setError("Use pelo menos 8 caracteres na nova senha.");
      return;
    }
    await run(async () => {
      await changeCloudPassphrase(oldPassphrase, newPassphrase);
      setOldPassphrase("");
      setNewPassphrase("");
      setShowChangePassphrase(false);
      setMessage("Senha alterada e backup reenviado.");
    });
  }

  const googleConfigured = !!process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID?.trim();
  const dropboxConfigured = !!process.env.NEXT_PUBLIC_DROPBOX_APP_KEY?.trim();

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <SectionTitle>Sincronização criptografada</SectionTitle>
        <p className="text-sm text-muted mt-1">
          Seus dados financeiros são criptografados com sua senha antes de
          sair deste dispositivo. O Saldo Real não tem acesso à senha nem ao
          conteúdo na nuvem.
        </p>
      </div>

      <div className="rounded-2xl ring-1 ring-border/60 p-4 sm:p-5 space-y-3">
        <div className="flex items-start gap-3">
          {syncState.status === "offline" ? (
            <CloudOff className="size-5 text-muted shrink-0 mt-0.5" />
          ) : syncState.status === "locked" ? (
            <Lock className="size-5 text-muted shrink-0 mt-0.5" />
          ) : syncState.status === "conflict" ? (
            <AlertTriangle className="size-5 text-warning shrink-0 mt-0.5" />
          ) : (
            <Cloud className="size-5 text-muted shrink-0 mt-0.5" />
          )}
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium">{STATUS_LABELS[syncState.status]}</p>
            <p className="text-xs text-muted mt-0.5">
              Última sync: {formatSyncTime(syncState.lastSyncAt)}
            </p>
            {syncState.lastError && (
              <p className="text-xs text-danger mt-1">{syncState.lastError}</p>
            )}
          </div>
          {syncState.connected && syncState.sessionUnlocked && (
            <Button
              variant="ghost"
              size="sm"
              disabled={busy}
              onClick={() => run(syncNow)}
            >
              <RefreshCw className="size-3.5" />
              Agora
            </Button>
          )}
        </div>
      </div>

      {message && (
        <p className="text-sm text-success">{message}</p>
      )}
      {error && (
        <p className="text-sm text-danger">{error}</p>
      )}

      {!syncState.hasPassphrase && (
        <div className="rounded-2xl ring-1 ring-border/60 p-4 sm:p-5 space-y-4">
          <div className="flex items-start gap-2">
            <Shield className="size-4 text-muted shrink-0 mt-0.5" />
            <p className="text-sm text-muted">
              Crie uma senha de criptografia. Sem ela, o backup na nuvem não
              pode ser recuperado em outro dispositivo.
            </p>
          </div>
          <label className="block space-y-1">
            <span className="text-xs text-muted">Senha</span>
            <input
              type="password"
              value={passphrase}
              onChange={(e) => setPassphrase(e.target.value)}
              className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm"
              autoComplete="new-password"
            />
          </label>
          <label className="block space-y-1">
            <span className="text-xs text-muted">Confirmar senha</span>
            <input
              type="password"
              value={confirmPassphrase}
              onChange={(e) => setConfirmPassphrase(e.target.value)}
              className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm"
              autoComplete="new-password"
            />
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={rememberDevice}
              onChange={(e) => setRememberDevice(e.target.checked)}
            />
            Lembrar neste dispositivo
          </label>
          <Button
            variant="primary"
            disabled={busy}
            onClick={handleSetupPassphrase}
          >
            Criar senha
          </Button>
        </div>
      )}

      {syncState.hasPassphrase && !syncState.sessionUnlocked && (
        <div className="rounded-2xl ring-1 ring-border/60 p-4 sm:p-5 space-y-3">
          <p className="text-sm font-medium">Desbloquear senha</p>
          <input
            type="password"
            value={unlockPassphrase}
            onChange={(e) => setUnlockPassphrase(e.target.value)}
            className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm"
            autoComplete="current-password"
          />
          <Button variant="primary" disabled={busy} onClick={handleUnlock}>
            Desbloquear
          </Button>
        </div>
      )}

      {syncState.sessionUnlocked && (
        <div className="rounded-2xl ring-1 ring-border/60 p-4 sm:p-5 space-y-4">
          <p className="text-sm font-medium">Provedor de nuvem</p>
          <div className="flex flex-wrap gap-2">
            <Button
              variant={syncState.provider === "google" ? "primary" : "default"}
              size="sm"
              disabled={busy || !googleConfigured || syncState.connected}
              onClick={() => handleConnect("google")}
            >
              Google Drive
            </Button>
            <Button
              variant={syncState.provider === "dropbox" ? "primary" : "default"}
              size="sm"
              disabled={busy || !dropboxConfigured || syncState.connected}
              onClick={() => handleConnect("dropbox")}
            >
              Dropbox
            </Button>
            {syncState.connected && (
              <Button
                variant="ghost"
                size="sm"
                disabled={busy}
                onClick={handleDisconnect}
              >
                <Unlink className="size-3.5" />
                Desconectar
              </Button>
            )}
          </div>
          {!googleConfigured && !dropboxConfigured && (
            <p className="text-xs text-muted">
              Configure NEXT_PUBLIC_GOOGLE_CLIENT_ID + GOOGLE_CLIENT_SECRET (servidor)
              e/ou NEXT_PUBLIC_DROPBOX_APP_KEY no ambiente de deploy.
            </p>
          )}
          <p className="text-xs text-muted">
            O arquivo fica em pasta oculta do app (Google appData ou Dropbox App
            Folder). Sync automático ocorre ~45s após alterações.
          </p>
          <div className="flex flex-wrap gap-2 pt-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => lockCloudPassphrase()}
            >
              Bloquear senha
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowChangePassphrase((v) => !v)}
            >
              Trocar senha
            </Button>
          </div>
        </div>
      )}

      {showChangePassphrase && syncState.sessionUnlocked && (
        <div className="rounded-2xl ring-1 ring-border/60 p-4 sm:p-5 space-y-3">
          <p className="text-sm font-medium">Trocar senha de criptografia</p>
          <input
            type="password"
            placeholder="Senha atual"
            value={oldPassphrase}
            onChange={(e) => setOldPassphrase(e.target.value)}
            className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm"
          />
          <input
            type="password"
            placeholder="Nova senha"
            value={newPassphrase}
            onChange={(e) => setNewPassphrase(e.target.value)}
            className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm"
          />
          <Button variant="primary" size="sm" disabled={busy} onClick={handleChangePassphrase}>
            Confirmar troca
          </Button>
        </div>
      )}

      {syncState.pendingRestore && !syncState.conflict && (
        <div className="rounded-2xl ring-1 ring-warning/40 bg-[var(--bg-warning-soft)] p-4 sm:p-5 space-y-3">
          <p className="text-sm font-medium">Backup mais recente na nuvem</p>
          <p className="text-xs text-muted">
            Exportado em{" "}
            {new Date(syncState.pendingRestore.exportedAt).toLocaleString("pt-BR")}
          </p>
          <div className="flex flex-wrap gap-2">
            <Button
              variant="primary"
              size="sm"
              disabled={busy}
              onClick={() => run(restorePendingRemote)}
            >
              Restaurar da nuvem
            </Button>
            <Button
              variant="ghost"
              size="sm"
              disabled={busy}
              onClick={() => run(dismissPendingRestore)}
            >
              Manter dados locais
            </Button>
          </div>
        </div>
      )}

      {syncState.conflict && remoteSummary && (
        <div className="rounded-2xl ring-1 ring-warning/40 p-4 sm:p-5 space-y-4">
          <p className="text-sm font-medium">Conflito de sincronização</p>
          <p className="text-xs text-muted">
            A nuvem foi alterada em outro dispositivo. Escolha como resolver
            antes de continuar o sync automático.
          </p>
          <div className="grid sm:grid-cols-2 gap-3 text-xs">
            <div className="rounded-lg ring-1 ring-border/60 p-3">
              <p className="font-medium mb-1">Este dispositivo</p>
              <p>{currentSummary.transactions} transações</p>
              <p className="text-muted mt-1">
                {formatSyncTime(syncState.conflict.localExportedAt)}
              </p>
            </div>
            <div className="rounded-lg ring-1 ring-border/60 p-3">
              <p className="font-medium mb-1">Nuvem</p>
              <p>{remoteSummary.transactions} transações</p>
              <p className="text-muted mt-1">
                {formatSyncTime(syncState.conflict.remoteExportedAt)}
              </p>
            </div>
          </div>

          <SegmentedControl<BackupImportMode>
            value={mergeMode}
            onChange={setMergeMode}
            options={[
              { value: "replace", label: "Substituir" },
              { value: "merge", label: "Mesclar" },
            ]}
          />

          {mergePreview && mergeMode === "merge" && (
            <p className="text-xs text-muted">
              Mesclagem adicionará ~{mergePreview.transactionsToAdd} transações,{" "}
              {mergePreview.accountsToAdd} contas e{" "}
              {mergePreview.budgetsToAdd} orçamentos.
            </p>
          )}

          <div className="flex flex-wrap gap-2">
            <Button
              variant="primary"
              size="sm"
              disabled={busy}
              onClick={() => run(resolveConflictUseLocal)}
            >
              Usar deste dispositivo
            </Button>
            <Button
              variant="default"
              size="sm"
              disabled={busy}
              onClick={() =>
                run(
                  mergeMode === "merge"
                    ? resolveConflictMerge
                    : resolveConflictUseRemote,
                )
              }
            >
              {mergeMode === "merge" ? "Mesclar com nuvem" : "Usar da nuvem"}
            </Button>
          </div>
        </div>
      )}

      <div className="rounded-2xl ring-1 ring-border/60 p-4 sm:p-5">
        <p className="text-sm font-medium">iCloud</p>
        <p className="text-xs text-muted mt-1">
          No iPhone ou Mac, você pode salvar manualmente o backup JSON em
          iCloud Drive. Sync automático com iCloud não é suportado na web.
        </p>
      </div>
    </div>
  );
}
