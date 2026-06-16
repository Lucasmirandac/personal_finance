"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
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
import { CloudSyncConfirmModal } from "@/components/CloudSyncConfirmModal";
import {
  computeMergePreview,
  summarizeBackup,
  type BackupImportMode,
} from "@/lib/backup";
import {
  getCloudSyncStatusLabel,
  getProtectionWizardStep,
  isGoogleProtectionComplete,
} from "@/lib/cloud-sync/display";
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
  forceSyncNow,
  unlockCloudPassphrase,
} from "@/lib/cloud-sync/orchestrator";
import type { CloudProviderId, CloudSyncState } from "@/lib/cloud-sync/types";
import clsx from "clsx";

function formatSyncTime(iso: string | null): string {
  if (!iso) return "Nunca";
  return new Date(iso).toLocaleString("pt-BR");
}

const WIZARD_STEPS = [
  { id: 1, label: "Senha de criptografia" },
  { id: 2, label: "Google Drive" },
  { id: 3, label: "Primeiro backup" },
] as const;

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
  const [disconnectOpen, setDisconnectOpen] = useState(false);
  const [dismissRestoreOpen, setDismissRestoreOpen] = useState(false);
  const [forceUploadOpen, setForceUploadOpen] = useState(false);

  useEffect(() => subscribeCloudSync(setSyncState), []);

  const googleConfigured = !!process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID?.trim();
  const dropboxConfigured = !!process.env.NEXT_PUBLIC_DROPBOX_APP_KEY?.trim();
  const wizardStep = getProtectionWizardStep(syncState);
  const protectionComplete = isGoogleProtectionComplete(syncState);
  const showGoogleWizard = googleConfigured && wizardStep > 0;

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

  const pendingRestoreSummary = useMemo(
    () =>
      syncState.pendingRestore
        ? summarizeBackup(syncState.pendingRestore.data)
        : null,
    [syncState.pendingRestore],
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

  const statusLabel = getCloudSyncStatusLabel(syncState);

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
      const nextSyncState = getCloudSyncState();
      if (
        nextSyncState.connected &&
        nextSyncState.status === "locked" &&
        !nextSyncState.lastSyncAt
      ) {
        setMessage(
          "Backup encontrado na nuvem. Desbloqueie a senha de criptografia para continuar.",
        );
        return;
      }
      setMessage(
        provider === "google"
          ? "Google Drive conectado. Enviando primeiro backup…"
          : "Dropbox conectado.",
      );
    });
  }

  async function handleDisconnectConfirm() {
    await run(async () => {
      await disconnectCloudProvider();
      setDisconnectOpen(false);
      setMessage("Google Drive desconectado. Seus dados locais continuam neste dispositivo.");
    });
  }

  async function handleDismissRestoreConfirm() {
    await run(async () => {
      await dismissPendingRestore();
      setDismissRestoreOpen(false);
      setMessage("Mantendo dados locais. Você pode enviar para a nuvem quando quiser.");
    });
  }

  async function handleForceUploadConfirm() {
    await run(async () => {
      await dismissPendingRestore();
      await forceSyncNow();
      setForceUploadOpen(false);
      setMessage("Backup local enviado para a nuvem.");
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

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <SectionTitle>Sincronização criptografada</SectionTitle>
        <p className="text-sm text-muted mt-1">
          Seus dados financeiros são criptografados com sua senha antes de
          sair deste dispositivo. O Saldo Real não tem acesso à senha nem ao
          conteúdo na nuvem.{" "}
          <Link href="/config?tab=backup" className="underline underline-offset-2">
            Backup manual JSON
          </Link>{" "}
          continua disponível como rede de segurança.
        </p>
      </div>

      <div className="rounded-2xl ring-1 ring-border/60 p-4 sm:p-5 space-y-3">
        <div className="flex items-start gap-3">
          {syncState.status === "offline" ? (
            <CloudOff className="size-5 text-muted shrink-0 mt-0.5" />
          ) : syncState.status === "locked" ? (
            <Lock className="size-5 text-muted shrink-0 mt-0.5" />
          ) : syncState.status === "conflict" || syncState.pendingRestore ? (
            <AlertTriangle className="size-5 text-warning shrink-0 mt-0.5" />
          ) : protectionComplete ? (
            <CheckCircle2 className="size-5 text-[var(--success)] shrink-0 mt-0.5" />
          ) : (
            <Cloud className="size-5 text-muted shrink-0 mt-0.5" />
          )}
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium">{statusLabel}</p>
            <p className="text-xs text-muted mt-0.5">
              Última sync: {formatSyncTime(syncState.lastSyncAt)}
            </p>
            {syncState.lastError && (
              <p className="text-xs text-danger mt-1">{syncState.lastError}</p>
            )}
          </div>
          {syncState.connected &&
            syncState.sessionUnlocked &&
            !syncState.pendingRestore && (
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

      {message && <p className="text-sm text-success">{message}</p>}
      {error && <p className="text-sm text-danger">{error}</p>}

      {protectionComplete && (
        <div className="rounded-2xl ring-1 ring-[var(--success)]/30 bg-[var(--bg-success-soft)] p-4 sm:p-5 space-y-2">
          <div className="flex items-start gap-2">
            <CheckCircle2 className="size-5 text-[var(--success)] shrink-0" />
            <div>
              <p className="text-sm font-medium">Dados protegidos no Google Drive</p>
              <p className="text-xs text-muted mt-1">
                {currentSummary.transactions} transações · última sync{" "}
                {formatSyncTime(syncState.lastSyncAt)}
              </p>
              <Link
                href="/config?tab=backup"
                className="inline-block text-xs underline underline-offset-2 mt-2 text-muted hover:text-foreground"
              >
                Ver backup manual
              </Link>
            </div>
          </div>
        </div>
      )}

      {showGoogleWizard && (
        <div className="rounded-2xl ring-1 ring-border/60 p-4 sm:p-5 space-y-5">
          <div>
            <p className="text-sm font-medium">Proteger no Google Drive</p>
            <p className="text-xs text-muted mt-1">
              Três passos para copiar seus dados criptografados na sua conta Google.
              Sem a senha, o Google Drive não consegue abrir o backup.
            </p>
          </div>

          <ol className="flex flex-col sm:flex-row gap-2 sm:gap-0">
            {WIZARD_STEPS.map((step, index) => {
              const done = wizardStep > step.id || protectionComplete;
              const active = wizardStep === step.id;
              return (
                <li
                  key={step.id}
                  className={clsx(
                    "flex items-center gap-2 flex-1 text-xs",
                    index > 0 && "sm:pl-2",
                  )}
                >
                  {index > 0 && (
                    <span
                      className="hidden sm:block h-px flex-1 bg-border/60 mr-2"
                      aria-hidden
                    />
                  )}
                  <span
                    className={clsx(
                      "inline-flex size-6 shrink-0 items-center justify-center rounded-full font-mono text-[10px] ring-1",
                      done
                        ? "bg-[var(--success)]/15 text-[var(--success)] ring-[var(--success)]/30"
                        : active
                          ? "bg-surface ring-border-strong text-foreground"
                          : "bg-surface/50 ring-border/60 text-muted",
                    )}
                  >
                    {done ? "✓" : step.id}
                  </span>
                  <span className={active ? "font-medium" : "text-muted"}>
                    {step.label}
                  </span>
                </li>
              );
            })}
          </ol>

          {wizardStep === 1 && !syncState.hasPassphrase && (
            <div className="space-y-4 pt-1 border-t border-border/40">
              <div className="flex items-start gap-2">
                <Shield className="size-4 text-muted shrink-0 mt-0.5" />
                <p className="text-sm text-muted">
                  Passo 1 — Crie uma senha de criptografia. Guarde-a em local
                  seguro: sem ela, o backup na nuvem não pode ser recuperado.
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

          {wizardStep === 1 && syncState.hasPassphrase && !syncState.sessionUnlocked && (
            <div className="space-y-3 pt-1 border-t border-border/40">
              <p className="text-sm text-muted">
                Passo 1 — Desbloqueie a senha de criptografia nesta sessão.
              </p>
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

          {wizardStep === 2 && (
            <div className="space-y-3 pt-1 border-t border-border/40">
              <p className="text-sm text-muted">
                Passo 2 — Conecte sua conta Google. O backup fica em pasta oculta
                do app (appDataFolder), invisível no Drive normal.
              </p>
              <Button
                variant="primary"
                size="sm"
                disabled={busy || syncState.connected}
                onClick={() => handleConnect("google")}
              >
                Conectar Google Drive
              </Button>
            </div>
          )}

          {wizardStep === 3 && (
            <div className="space-y-3 pt-1 border-t border-border/40">
              <p className="text-sm text-muted">
                Passo 3 — Confirme o primeiro backup na nuvem. Isso acontece
                automaticamente após conectar; se demorar, use o botão abaixo.
              </p>
              {syncState.pendingRestore && pendingRestoreSummary && (
                <div className="rounded-xl ring-1 ring-warning/40 bg-[var(--bg-warning-soft)] p-3 space-y-2">
                  <p className="text-sm font-medium">Backup mais recente na nuvem</p>
                  <p className="text-xs text-muted">
                    A nuvem tem {pendingRestoreSummary.transactions} transações
                    (exportado em{" "}
                    {new Date(syncState.pendingRestore!.exportedAt).toLocaleString(
                      "pt-BR",
                    )}
                    ). Restaurar evita perder dados deste dispositivo.
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
                      onClick={() => setDismissRestoreOpen(true)}
                    >
                      Manter dados locais
                    </Button>
                    {currentSummary.transactions <
                      pendingRestoreSummary.transactions && (
                      <Button
                        variant="default"
                        size="sm"
                        disabled={busy}
                        onClick={() => setForceUploadOpen(true)}
                      >
                        Enviar dados locais
                      </Button>
                    )}
                  </div>
                </div>
              )}
              {!syncState.lastSyncAt && !syncState.pendingRestore && (
                <Button
                  variant="primary"
                  size="sm"
                  disabled={busy}
                  onClick={() => run(syncNow)}
                >
                  Enviar backup agora
                </Button>
              )}
            </div>
          )}
        </div>
      )}

      {!showGoogleWizard && syncState.hasPassphrase && !syncState.sessionUnlocked && (
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

      {!showGoogleWizard &&
        !syncState.hasPassphrase &&
        !googleConfigured && (
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

      {syncState.sessionUnlocked && (
        <div className="rounded-2xl ring-1 ring-border/60 p-4 sm:p-5 space-y-4">
          <p className="text-sm font-medium">
            {protectionComplete ? "Outros provedores" : "Provedor de nuvem"}
          </p>
          <div className="flex flex-wrap gap-2">
            {!protectionComplete && (
              <Button
                variant={syncState.provider === "google" ? "primary" : "default"}
                size="sm"
                disabled={busy || !googleConfigured || syncState.connected}
                onClick={() => handleConnect("google")}
              >
                Google Drive
              </Button>
            )}
            <Button
              variant={syncState.provider === "dropbox" ? "primary" : "default"}
              size="sm"
              disabled={
                busy ||
                !dropboxConfigured ||
                (syncState.connected && syncState.provider === "google")
              }
              onClick={() => handleConnect("dropbox")}
            >
              Dropbox
            </Button>
            {syncState.connected && (
              <Button
                variant="ghost"
                size="sm"
                disabled={busy}
                onClick={() => setDisconnectOpen(true)}
              >
                <Unlink className="size-3.5" />
                Desconectar
              </Button>
            )}
          </div>
          {!googleConfigured && !dropboxConfigured && (
            <p className="text-xs text-muted">
              Configure NEXT_PUBLIC_GOOGLE_CLIENT_ID + GOOGLE_CLIENT_SECRET
              (servidor) e/ou NEXT_PUBLIC_DROPBOX_APP_KEY no ambiente de deploy.
            </p>
          )}
          <p className="text-xs text-muted">
            Sync automático ocorre ~45s após alterações locais.
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
          <Button
            variant="primary"
            size="sm"
            disabled={busy}
            onClick={handleChangePassphrase}
          >
            Confirmar troca
          </Button>
        </div>
      )}

      {!showGoogleWizard &&
        syncState.pendingRestore &&
        !syncState.conflict &&
        pendingRestoreSummary && (
          <div className="rounded-2xl ring-1 ring-warning/40 bg-[var(--bg-warning-soft)] p-4 sm:p-5 space-y-3">
            <p className="text-sm font-medium">Backup mais recente na nuvem</p>
            <p className="text-xs text-muted">
              {pendingRestoreSummary.transactions} transações · exportado em{" "}
              {new Date(syncState.pendingRestore.exportedAt).toLocaleString(
                "pt-BR",
              )}
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
                onClick={() => setDismissRestoreOpen(true)}
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
              {mergePreview.accountsToAdd} contas e {mergePreview.budgetsToAdd}{" "}
              orçamentos.
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

      <CloudSyncConfirmModal
        open={disconnectOpen}
        title="Desconectar Google Drive?"
        description={
          <>
            <p>Seus dados locais continuam neste dispositivo.</p>
            <p>
              Novas alterações <strong>não</strong> serão copiadas para o Google
              Drive até você reconectar.
            </p>
          </>
        }
        confirmLabel="Desconectar"
        requireAcknowledge
        acknowledgeLabel="Entendo que o backup na nuvem não será atualizado"
        busy={busy}
        onConfirm={handleDisconnectConfirm}
        onClose={() => setDisconnectOpen(false)}
      />

      <CloudSyncConfirmModal
        open={dismissRestoreOpen}
        title="Manter dados locais?"
        description={
          pendingRestoreSummary &&
          pendingRestoreSummary.transactions > currentSummary.transactions ? (
            <>
              <p>
                A nuvem tem {pendingRestoreSummary.transactions} transações e
                este dispositivo tem {currentSummary.transactions}.
              </p>
              <p>
                Ignorar o backup da nuvem pode impedir recuperar os dados mais
                recentes se você limpar este dispositivo.
              </p>
            </>
          ) : (
            <p>
              Você continuará com os dados deste dispositivo. Poderá enviá-los
              para a nuvem depois.
            </p>
          )
        }
        confirmLabel="Manter locais"
        requireAcknowledge={
          !!pendingRestoreSummary &&
          pendingRestoreSummary.transactions > currentSummary.transactions
        }
        acknowledgeLabel="Entendo o risco de perder dados da nuvem"
        busy={busy}
        onConfirm={handleDismissRestoreConfirm}
        onClose={() => setDismissRestoreOpen(false)}
      />

      <CloudSyncConfirmModal
        open={forceUploadOpen}
        title="Enviar dados locais para a nuvem?"
        description={
          <>
            <p>
              Isso substituirá o backup na nuvem pelos dados deste dispositivo (
              {currentSummary.transactions} transações).
            </p>
            {pendingRestoreSummary && (
              <p>
                O backup na nuvem tem {pendingRestoreSummary.transactions}{" "}
                transações — essa ação não pode ser desfeita.
              </p>
            )}
          </>
        }
        confirmLabel="Enviar e substituir"
        requireAcknowledge
        acknowledgeLabel="Entendo que o backup na nuvem será sobrescrito"
        busy={busy}
        onConfirm={handleForceUploadConfirm}
        onClose={() => setForceUploadOpen(false)}
      />
    </div>
  );
}
