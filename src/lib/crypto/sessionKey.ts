import { get, set, del } from "idb-keyval";
import {
  deriveKeyFromPassphrase,
  exportRawKey,
  importRawKey,
  generateKdfSalt,
  PBKDF2_ITERATIONS,
} from "./e2ee";
import { bytesToBase64, base64ToBytes, toBufferSource } from "./encoding";

const KEY_WRAP = "pf:cloudSyncKeyWrap:v1";

type KeyWrapState = {
  deviceSecret: string;
  wrappedKey: string;
  wrapIv: string;
  kdfSalt: string;
  iterations: number;
};

let sessionKey: CryptoKey | null = null;
let sessionKdfSalt: Uint8Array | null = null;

function getSubtleCrypto(): SubtleCrypto {
  const subtle = globalThis.crypto?.subtle;
  if (!subtle) {
    throw new Error("Web Crypto não está disponível neste ambiente.");
  }
  return subtle;
}

function randomBytes(length: number): Uint8Array {
  const bytes = new Uint8Array(length);
  globalThis.crypto.getRandomValues(bytes);
  return bytes;
}

export function isSessionUnlocked(): boolean {
  return sessionKey !== null;
}

export function getSessionKey(): CryptoKey | null {
  return sessionKey;
}

export function getSessionKdfSalt(): Uint8Array | null {
  return sessionKdfSalt;
}

export function lockSession(): void {
  sessionKey = null;
  sessionKdfSalt = null;
}

async function getDeviceSecret(): Promise<Uint8Array> {
  const existing = await get<KeyWrapState>(KEY_WRAP);
  if (existing?.deviceSecret) {
    return base64ToBytes(existing.deviceSecret);
  }
  const secret = randomBytes(32);
  return secret;
}

async function wrapRawKeyForDevice(
  raw: Uint8Array,
  kdfSalt: Uint8Array,
  iterations = PBKDF2_ITERATIONS,
): Promise<void> {
  const deviceSecret = await getDeviceSecret();
  const wrapKey = await getSubtleCrypto().importKey(
    "raw",
    toBufferSource(deviceSecret),
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt"],
  );
  const iv = randomBytes(12);
  const wrapped = await getSubtleCrypto().encrypt(
    { name: "AES-GCM", iv: toBufferSource(iv) },
    wrapKey,
    toBufferSource(raw),
  );
  const state: KeyWrapState = {
    deviceSecret: bytesToBase64(deviceSecret),
    wrappedKey: bytesToBase64(new Uint8Array(wrapped)),
    wrapIv: bytesToBase64(iv),
    kdfSalt: bytesToBase64(kdfSalt),
    iterations,
  };
  await set(KEY_WRAP, state);
}

export async function clearWrappedKey(): Promise<void> {
  await del(KEY_WRAP);
}

export async function unlockSession(
  passphrase: string,
  kdfSalt: Uint8Array,
  iterations = PBKDF2_ITERATIONS,
): Promise<CryptoKey> {
  const key = await deriveKeyFromPassphrase(passphrase, kdfSalt, iterations);
  sessionKey = key;
  sessionKdfSalt = kdfSalt;
  return key;
}

export async function unlockSessionFromWrap(): Promise<CryptoKey | null> {
  const state = await get<KeyWrapState>(KEY_WRAP);
  if (!state?.wrappedKey || !state.deviceSecret) return null;

  try {
    const deviceSecret = base64ToBytes(state.deviceSecret);
    const wrapKey = await getSubtleCrypto().importKey(
      "raw",
      toBufferSource(deviceSecret),
      { name: "AES-GCM", length: 256 },
      false,
      ["decrypt"],
    );
    const raw = await getSubtleCrypto().decrypt(
      { name: "AES-GCM", iv: toBufferSource(base64ToBytes(state.wrapIv)) },
      wrapKey,
      toBufferSource(base64ToBytes(state.wrappedKey)),
    );
    const key = await importRawKey(new Uint8Array(raw));
    sessionKey = key;
    sessionKdfSalt = base64ToBytes(state.kdfSalt);
    return key;
  } catch {
    await clearWrappedKey();
    return null;
  }
}

export async function setupSession(
  passphrase: string,
  rememberDevice: boolean,
  existingSalt?: Uint8Array,
  iterations = PBKDF2_ITERATIONS,
): Promise<{ key: CryptoKey; kdfSalt: Uint8Array }> {
  const kdfSalt = existingSalt ?? generateKdfSalt();
  if (rememberDevice) {
    const extractable = await deriveKeyFromPassphrase(
      passphrase,
      kdfSalt,
      iterations,
      true,
    );
    const raw = await exportRawKey(extractable);
    await wrapRawKeyForDevice(raw, kdfSalt, iterations);
    sessionKey = await importRawKey(raw);
  } else {
    sessionKey = await deriveKeyFromPassphrase(passphrase, kdfSalt, iterations);
    await clearWrappedKey();
  }
  sessionKdfSalt = kdfSalt;
  return { key: sessionKey, kdfSalt };
}

export async function changeSessionPassphrase(
  oldPassphrase: string,
  newPassphrase: string,
  kdfSalt: Uint8Array,
  rememberDevice: boolean,
): Promise<{ key: CryptoKey; kdfSalt: Uint8Array }> {
  await unlockSession(oldPassphrase, kdfSalt);
  lockSession();
  const newSalt = generateKdfSalt();
  return setupSession(newPassphrase, rememberDevice, newSalt);
}
