import { exportAllData, type BackupFile } from "../backup";
import {
  decryptBackupWithKey,
  encryptBackupWithKey,
  type EncryptedBackupFile,
} from "../crypto/e2ee";
import {
  getSessionKey,
  getSessionKdfSalt,
  isSessionUnlocked,
  lockSession,
  setupSession,
  unlockSession,
  unlockSessionFromWrap,
  changeSessionPassphrase,
} from "../crypto/sessionKey";
import { trackEvent } from "../analytics";
import { saveLastBackupAt } from "../storage";
import { dropboxProvider } from "./dropbox";
import { googleDriveProvider } from "./google-drive";
import { onDataMutated } from "./mutations";
import {
  clearProviderTokens,
  getKdfSaltBytes,
  loadCloudSyncSettings,
  setKdfSaltBytes,
  updateCloudSyncSettings,
} from "./settings";
import type {
  CloudConflictState,
  CloudProvider,
  CloudProviderId,
  CloudSyncListener,
  CloudSyncState,
} from "./types";

const DEBOUNCE_MS = 45_000;

export { DEBOUNCE_MS };

const providers: Record<CloudProviderId, CloudProvider> = {
  google: googleDriveProvider,
  dropbox: dropboxProvider,
};

let state: CloudSyncState = {
  status: "idle",
  provider: null,
  connected: false,
  hasPassphrase: false,
  sessionUnlocked: false,
  rememberDevice: false,
  lastSyncAt: null,
  lastError: null,
  conflict: null,
  pendingRestore: null,
};

const listeners = new Set<CloudSyncListener>();
let debounceTimer: ReturnType<typeof setTimeout> | null = null;
let uploadInFlight = false;
let initialized = false;

type ImportBackupFn = (
  backup: BackupFile,
  mode: "replace" | "merge",
) => Promise<void>;

let importBackupFn: ImportBackupFn | null = null;
let getLocalExportedAt: (() => string | null) | null = null;

function emit(next: Partial<CloudSyncState>): void {
  state = { ...state, ...next };
  for (const listener of listeners) {
    listener(state);
  }
}

function getActiveProvider(): CloudProvider | null {
  if (!state.provider) return null;
  return providers[state.provider];
}

function isOnline(): boolean {
  if (typeof navigator === "undefined") return true;
  return navigator.onLine !== false;
}

async function refreshStateFromSettings(): Promise<void> {
  const settings = await loadCloudSyncSettings();
  const hasPassphrase = !!settings.kdfSalt;
  const connected =
    !!settings.provider && !!settings.tokens[settings.provider]?.accessToken;
  emit({
    provider: settings.provider,
    connected,
    hasPassphrase,
    rememberDevice: settings.rememberDevice,
    lastSyncAt: settings.lastSyncAt,
    sessionUnlocked: isSessionUnlocked(),
    status: !isOnline()
      ? "offline"
      : hasPassphrase && !isSessionUnlocked()
        ? "locked"
        : settings.conflictPaused
          ? "conflict"
          : "idle",
  });
}

async function getTokens() {
  const settings = await loadCloudSyncSettings();
  if (!settings.provider) return null;
  return settings.tokens[settings.provider] ?? null;
}

export function subscribeCloudSync(listener: CloudSyncListener): () => void {
  listeners.add(listener);
  listener(state);
  return () => listeners.delete(listener);
}

export function getCloudSyncState(): CloudSyncState {
  return state;
}

export function registerCloudSyncHandlers(handlers: {
  importBackup: ImportBackupFn;
  getLocalExportedAt: () => string | null;
}): void {
  importBackupFn = handlers.importBackup;
  getLocalExportedAt = handlers.getLocalExportedAt;
}

export async function initCloudSync(): Promise<void> {
  if (initialized) return;
  initialized = true;
  await refreshStateFromSettings();

  const settings = await loadCloudSyncSettings();
  if (settings.rememberDevice && settings.kdfSalt) {
    const key = await unlockSessionFromWrap();
    if (key) {
      emit({ sessionUnlocked: true, status: isOnline() ? "idle" : "offline" });
    }
  }

  onDataMutated(scheduleUpload);
  window.addEventListener("online", () => {
    void refreshStateFromSettings().then(() => {
      if (state.sessionUnlocked) void performUpload();
    });
  });
  window.addEventListener("offline", () => emit({ status: "offline" }));

  void checkRemoteOnBootstrap();
}

export async function setupCloudPassphrase(
  passphrase: string,
  rememberDevice: boolean,
): Promise<void> {
  const settings = await loadCloudSyncSettings();
  const existingSalt = getKdfSaltBytes(settings);
  const { kdfSalt } = await setupSession(
    passphrase,
    rememberDevice,
    existingSalt ?? undefined,
  );
  await updateCloudSyncSettings({
    kdfSalt: setKdfSaltBytes(kdfSalt),
    rememberDevice,
  });
  emit({
    hasPassphrase: true,
    sessionUnlocked: true,
    rememberDevice,
    status: isOnline() ? "idle" : "offline",
  });
}

export async function unlockCloudPassphrase(passphrase: string): Promise<void> {
  const settings = await loadCloudSyncSettings();
  const salt = getKdfSaltBytes(settings);
  if (!salt) {
    throw new Error("Configure uma senha de criptografia primeiro.");
  }
  await unlockSession(passphrase, salt);
  emit({
    sessionUnlocked: true,
    status: settings.conflictPaused
      ? "conflict"
      : isOnline()
        ? "idle"
        : "offline",
  });
}

export function lockCloudPassphrase(): void {
  lockSession();
  emit({ sessionUnlocked: false, status: "locked" });
}

export async function connectCloudProvider(
  providerId: CloudProviderId,
): Promise<void> {
  const provider = providers[providerId];
  await provider.connect();
  await refreshStateFromSettings();
  trackEvent({ name: "cloud_sync_connected", provider: providerId });
}

export async function disconnectCloudProvider(): Promise<void> {
  const settings = await loadCloudSyncSettings();
  if (settings.provider) {
    const providerId = settings.provider;
    await clearProviderTokens(providerId);
    trackEvent({
      name: "cloud_sync_disconnected",
      provider: providerId,
    });
  }
  emit({ connected: false, provider: null, conflict: null, status: "idle" });
}

function scheduleUpload(): void {
  if (!state.connected || !state.sessionUnlocked || state.conflict) return;
  if (!isOnline()) {
    emit({ status: "offline" });
    return;
  }
  emit({ status: "pending" });
  if (debounceTimer) clearTimeout(debounceTimer);
  debounceTimer = setTimeout(() => {
    debounceTimer = null;
    void performUpload();
  }, DEBOUNCE_MS);
}

export async function syncNow(): Promise<void> {
  if (debounceTimer) {
    clearTimeout(debounceTimer);
    debounceTimer = null;
  }
  await performUpload();
}

async function performUpload(force = false): Promise<void> {
  if (uploadInFlight) return;
  if (!state.connected || !state.sessionUnlocked) return;
  if (!isOnline()) {
    emit({ status: "offline" });
    return;
  }

  const settings = await loadCloudSyncSettings();
  if (settings.conflictPaused && !force) {
    emit({ status: "conflict" });
    return;
  }

  const provider = getActiveProvider();
  const tokens = await getTokens();
  const key = getSessionKey();
  const salt = getSessionKdfSalt();
  if (!provider || !tokens || !key || !salt) return;

  uploadInFlight = true;
  emit({ status: "uploading", lastError: null });

  try {
    const remote = await provider.getRevision(tokens);
    if (
      remote &&
      settings.lastRemoteRevision &&
      remote.revision !== settings.lastRemoteRevision &&
      !force
    ) {
      await handleConflict(provider, tokens, remote.revision);
      return;
    }

    const backup = await exportAllData();
    const encrypted = await encryptBackupWithKey(backup, key, {
      deviceId: settings.deviceId,
      kdfSalt: salt,
    });

    const meta = await provider.upload(
      tokens,
      encrypted,
      settings.lastRemoteRevision,
    );

    await updateCloudSyncSettings({
      lastSyncAt: new Date().toISOString(),
      lastRemoteRevision: meta.revision,
      lastLocalExportedAt: backup.exportedAt,
      conflictPaused: false,
    });
    await saveLastBackupAt(backup.exportedAt);

    emit({
      status: "idle",
      lastSyncAt: new Date().toISOString(),
      conflict: null,
    });
    trackEvent({ name: "cloud_sync_uploaded", provider: provider.id, result: "ok" });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erro desconhecido";
    if (message === "CONFLICT") {
      const tokensNow = await getTokens();
      const providerNow = getActiveProvider();
      if (providerNow && tokensNow) {
        const remote = await providerNow.getRevision(tokensNow);
        if (remote) {
          await handleConflict(providerNow, tokensNow, remote.revision);
          return;
        }
      }
    }
    emit({ status: "error", lastError: message });
    trackEvent({
      name: "cloud_sync_uploaded",
      provider: state.provider ?? "google",
      result: "fail",
    });
  } finally {
    uploadInFlight = false;
  }
}

async function handleConflict(
  provider: CloudProvider,
  tokens: import("./types").OAuthTokens,
  remoteRevision: string,
): Promise<void> {
  const key = getSessionKey();
  if (!key) return;

  const encrypted = await provider.download(tokens);
  if (!encrypted) return;

  const { backup: remoteBackup } = await decryptBackupWithKey(encrypted, key);
  const localExportedAt = getLocalExportedAt?.() ?? null;

  await updateCloudSyncSettings({ conflictPaused: true });
  const conflict: CloudConflictState = {
    remoteBackup,
    remoteRevision,
    remoteExportedAt: remoteBackup.exportedAt,
    localExportedAt: localExportedAt ?? new Date(0).toISOString(),
  };
  emit({ status: "conflict", conflict });
  trackEvent({
    name: "cloud_sync_conflict",
    provider: provider.id,
  });
}

async function checkRemoteOnBootstrap(): Promise<void> {
  if (!state.connected || !state.sessionUnlocked) return;
  const settings = await loadCloudSyncSettings();
  const provider = getActiveProvider();
  const tokens = await getTokens();
  const key = getSessionKey();
  if (!provider || !tokens || !key) return;

  try {
    const remote = await provider.getRevision(tokens);
    if (!remote) return;

    if (
      settings.lastRemoteRevision &&
      remote.revision !== settings.lastRemoteRevision
    ) {
      const encrypted = await provider.download(tokens);
      if (!encrypted) return;
      const { backup } = await decryptBackupWithKey(encrypted, key);
      const localAt = getLocalExportedAt?.();
      if (
        !localAt ||
        backup.exportedAt > localAt
      ) {
        emit({ pendingRestore: backup, status: "conflict" });
      }
    }
  } catch {
    // ignore bootstrap check failures
  }
}

export async function resolveConflictUseLocal(): Promise<void> {
  await updateCloudSyncSettings({ conflictPaused: false });
  emit({ conflict: null, status: "uploading" });
  await performUpload(true);
}

export async function resolveConflictUseRemote(): Promise<void> {
  if (!state.conflict || !importBackupFn) return;
  await importBackupFn(state.conflict.remoteBackup, "replace");
  const settings = await loadCloudSyncSettings();
  await updateCloudSyncSettings({
    conflictPaused: false,
    lastRemoteRevision: state.conflict.remoteRevision,
    lastLocalExportedAt: state.conflict.remoteBackup.exportedAt,
    lastSyncAt: new Date().toISOString(),
  });
  emit({ conflict: null, pendingRestore: null, status: "idle" });
  trackEvent({
    name: "cloud_sync_restored",
    provider: settings.provider ?? "google",
    result: "ok",
  });
}

export async function resolveConflictMerge(): Promise<void> {
  if (!state.conflict || !importBackupFn) return;
  await importBackupFn(state.conflict.remoteBackup, "merge");
  await updateCloudSyncSettings({ conflictPaused: false });
  emit({ conflict: null, pendingRestore: null, status: "pending" });
  scheduleUpload();
}

export async function restorePendingRemote(): Promise<void> {
  if (!state.pendingRestore || !importBackupFn) return;
  await importBackupFn(state.pendingRestore, "replace");
  emit({ pendingRestore: null, status: "idle" });
}

export async function dismissPendingRestore(): Promise<void> {
  emit({ pendingRestore: null, status: "idle" });
}

export async function changeCloudPassphrase(
  oldPassphrase: string,
  newPassphrase: string,
): Promise<void> {
  const settings = await loadCloudSyncSettings();
  const salt = getKdfSaltBytes(settings);
  if (!salt) throw new Error("Senha não configurada.");
  const { kdfSalt } = await changeSessionPassphrase(
    oldPassphrase,
    newPassphrase,
    salt,
    settings.rememberDevice,
  );
  await updateCloudSyncSettings({
    kdfSalt: setKdfSaltBytes(kdfSalt),
    lastRemoteRevision: null,
  });
  emit({ sessionUnlocked: true });
  await performUpload(true);
}

export async function downloadRemoteBackup(): Promise<EncryptedBackupFile | null> {
  const provider = getActiveProvider();
  const tokens = await getTokens();
  if (!provider || !tokens) return null;
  emit({ status: "downloading" });
  try {
    const file = await provider.download(tokens);
    emit({ status: "idle" });
    return file;
  } catch (err) {
    emit({
      status: "error",
      lastError: err instanceof Error ? err.message : "Erro ao baixar",
    });
    return null;
  }
}
