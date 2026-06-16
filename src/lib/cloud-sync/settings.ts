import { get, set, del } from "idb-keyval";
import { base64ToBytes, bytesToBase64 } from "../crypto/encoding";
import type { CloudProviderId, OAuthTokens } from "./types";

const KEY_CLOUD_SYNC = "pf:cloudSync:v1";

export type CloudSyncSettings = {
  provider: CloudProviderId | null;
  deviceId: string;
  kdfSalt: string | null;
  rememberDevice: boolean;
  lastSyncAt: string | null;
  lastRemoteRevision: string | null;
  lastLocalExportedAt: string | null;
  conflictPaused: boolean;
  tokens: Partial<Record<CloudProviderId, OAuthTokens>>;
};

const DEFAULT_SETTINGS: CloudSyncSettings = {
  provider: null,
  deviceId: "",
  kdfSalt: null,
  rememberDevice: false,
  lastSyncAt: null,
  lastRemoteRevision: null,
  lastLocalExportedAt: null,
  conflictPaused: false,
  tokens: {},
};

function generateDeviceId(): string {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return `device-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function mergeSettings(v: unknown): CloudSyncSettings {
  if (!v || typeof v !== "object") {
    return { ...DEFAULT_SETTINGS, deviceId: generateDeviceId() };
  }
  const o = v as Partial<CloudSyncSettings>;
  return {
    provider:
      o.provider === "google" || o.provider === "dropbox" ? o.provider : null,
    deviceId:
      typeof o.deviceId === "string" && o.deviceId.length > 0
        ? o.deviceId
        : generateDeviceId(),
    kdfSalt: typeof o.kdfSalt === "string" ? o.kdfSalt : null,
    rememberDevice: o.rememberDevice === true,
    lastSyncAt: typeof o.lastSyncAt === "string" ? o.lastSyncAt : null,
    lastRemoteRevision:
      typeof o.lastRemoteRevision === "string" ? o.lastRemoteRevision : null,
    lastLocalExportedAt:
      typeof o.lastLocalExportedAt === "string" ? o.lastLocalExportedAt : null,
    conflictPaused: o.conflictPaused === true,
    tokens: o.tokens && typeof o.tokens === "object" ? o.tokens : {},
  };
}

export async function loadCloudSyncSettings(): Promise<CloudSyncSettings> {
  try {
    const v = await get(KEY_CLOUD_SYNC);
    return mergeSettings(v);
  } catch {
    return { ...DEFAULT_SETTINGS, deviceId: generateDeviceId() };
  }
}

export async function saveCloudSyncSettings(
  settings: CloudSyncSettings,
): Promise<void> {
  await set(KEY_CLOUD_SYNC, settings);
}

export async function updateCloudSyncSettings(
  patch: Partial<CloudSyncSettings>,
): Promise<CloudSyncSettings> {
  const current = await loadCloudSyncSettings();
  const next = { ...current, ...patch };
  await saveCloudSyncSettings(next);
  return next;
}

export async function clearCloudSyncSettings(): Promise<void> {
  await del(KEY_CLOUD_SYNC);
}

export function getKdfSaltBytes(settings: CloudSyncSettings): Uint8Array | null {
  if (!settings.kdfSalt) return null;
  return base64ToBytes(settings.kdfSalt);
}

export function setKdfSaltBytes(salt: Uint8Array): string {
  return bytesToBase64(salt);
}

export async function saveProviderTokens(
  provider: CloudProviderId,
  tokens: OAuthTokens,
): Promise<CloudSyncSettings> {
  const current = await loadCloudSyncSettings();
  return updateCloudSyncSettings({
    provider,
    tokens: { ...current.tokens, [provider]: tokens },
  });
}

export async function clearProviderTokens(
  provider: CloudProviderId,
): Promise<CloudSyncSettings> {
  const current = await loadCloudSyncSettings();
  const nextTokens = { ...current.tokens };
  delete nextTokens[provider];
  return updateCloudSyncSettings({
    provider: current.provider === provider ? null : current.provider,
    tokens: nextTokens,
    lastRemoteRevision: null,
    conflictPaused: false,
  });
}

export async function getProviderTokens(
  provider: CloudProviderId,
): Promise<OAuthTokens | null> {
  const settings = await loadCloudSyncSettings();
  return settings.tokens[provider] ?? null;
}
