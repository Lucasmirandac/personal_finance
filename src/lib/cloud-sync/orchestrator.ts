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
import { evaluateRemoteProbe } from "./remote-probe";
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

  if (state.connected && state.sessionUnlocked) {
    void safeSyncAfterConnect();
  }
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
  if (state.connected) {
    await safeSyncAfterConnect();
  }
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
  if (state.connected) {
    await safeSyncAfterConnect();
  }
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
  if (state.sessionUnlocked) {
    await safeSyncAfterConnect();
  }
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
  if (
    !state.connected ||
    !state.sessionUnlocked ||
    state.conflict ||
    state.pendingRestore
  ) {
    return;
  }
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

export async function forceSyncNow(): Promise<void> {
  if (debounceTimer) {
    clearTimeout(debounceTimer);
    debounceTimer = null;
  }
  await performUpload(true);
}

async function performUpload(force = false): Promise<void> {
  if (uploadInFlight) return;
  if (!state.connected || !state.sessionUnlocked) return;
  if (state.pendingRestore && !force) {
    emit({ status: "conflict" });
    return;
  }
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
    if (remote && !force) {
      const blocked = await applyRemoteProbe(provider, tokens, remote.revision);
      if (blocked) return;
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

export type RemoteProbeResult = "clear" | "blocked";

export async function probeRemoteBackup(): Promise<RemoteProbeResult> {
  if (!state.connected || !state.sessionUnlocked) return "clear";

  const provider = getActiveProvider();
  const tokens = await getTokens();
  const key = getSessionKey();
  if (!provider || !tokens || !key) return "clear";

  try {
    const remote = await provider.getRevision(tokens);
    if (!remote) return "clear";

    const blocked = await applyRemoteProbe(provider, tokens, remote.revision);
    return blocked ? "blocked" : "clear";
  } catch {
    return "clear";
  }
}

async function safeSyncAfterConnect(): Promise<void> {
  const probeResult = await probeRemoteBackup();
  if (probeResult === "clear") {
    await performUpload(true);
  }
}

async function applyRemoteProbe(
  provider: CloudProvider,
  tokens: import("./types").OAuthTokens,
  remoteRevision: string,
): Promise<boolean> {
  const settings = await loadCloudSyncSettings();
  const key = getSessionKey();
  if (!key) return false;

  if (
    settings.lastRemoteRevision &&
    settings.lastRemoteRevision === remoteRevision
  ) {
    return false;
  }

  const encrypted = await provider.download(tokens);
  if (!encrypted) return false;

  const { backup: remoteBackup } = await decryptBackupWithKey(encrypted, key);
  const localAt = getLocalExportedAt?.() ?? null;
  const action = evaluateRemoteProbe({
    localExportedAt: localAt,
    remoteExportedAt: remoteBackup.exportedAt,
    lastRemoteRevision: settings.lastRemoteRevision,
    remoteRevision,
  });

  if (action === "clear") {
    if (
      !settings.lastRemoteRevision &&
      localAt &&
      remoteBackup.exportedAt === localAt
    ) {
      await updateCloudSyncSettings({
        lastRemoteRevision: remoteRevision,
        lastLocalExportedAt: localAt,
      });
    }
    return false;
  }

  if (action === "pending_restore") {
    await updateCloudSyncSettings({ conflictPaused: true });
    emit({ pendingRestore: remoteBackup, status: "conflict", conflict: null });
    return true;
  }

  await handleConflict(provider, tokens, remoteRevision);
  return true;
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
  const provider = getActiveProvider();
  const tokens = await getTokens();
  let remoteRevision: string | null = null;
  if (provider && tokens) {
    try {
      const remote = await provider.getRevision(tokens);
      remoteRevision = remote?.revision ?? null;
    } catch {
      // keep null revision
    }
  }
  await updateCloudSyncSettings({
    conflictPaused: false,
    lastRemoteRevision: remoteRevision,
    lastLocalExportedAt: state.pendingRestore.exportedAt,
    lastSyncAt: new Date().toISOString(),
  });
  emit({
    pendingRestore: null,
    status: "idle",
    lastSyncAt: new Date().toISOString(),
  });
}

export async function dismissPendingRestore(): Promise<void> {
  const provider = getActiveProvider();
  const tokens = await getTokens();
  if (provider && tokens) {
    try {
      const remote = await provider.getRevision(tokens);
      if (remote) {
        await updateCloudSyncSettings({
          conflictPaused: false,
          lastRemoteRevision: remote.revision,
        });
      } else {
        await updateCloudSyncSettings({ conflictPaused: false });
      }
    } catch {
      await updateCloudSyncSettings({ conflictPaused: false });
    }
  } else {
    await updateCloudSyncSettings({ conflictPaused: false });
  }
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
