import { z } from "zod";
import { parseBackup, type BackupFile } from "../backup";
import { bytesToBase64, base64ToBytes, bytesToString, stringToBytes, toBufferSource } from "./encoding";

export const E2EE_FORMAT = "saldoreal-e2ee-v1" as const;
export const E2EE_FILENAME = "saldoreal-backup.enc";
export const PBKDF2_ITERATIONS = 600_000;
export const PBKDF2_HASH = "SHA-256";

const encryptedBackupSchema = z.object({
  format: z.literal(E2EE_FORMAT),
  kdf: z.object({
    name: z.literal("PBKDF2"),
    hash: z.literal(PBKDF2_HASH),
    iterations: z.number().int().positive(),
    salt: z.string().min(1),
  }),
  cipher: z.object({
    name: z.literal("AES-GCM"),
    iv: z.string().min(1),
  }),
  ciphertext: z.string().min(1),
});

export type EncryptedBackupFile = z.infer<typeof encryptedBackupSchema>;

type EncryptedBackupInner = {
  backup: BackupFile;
  deviceId: string;
  contentHash: string;
};

export class E2EEDecryptError extends Error {
  constructor(message = "Senha incorreta ou arquivo corrompido.") {
    super(message);
    this.name = "E2EEDecryptError";
  }
}

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

async function sha256Hex(data: string): Promise<string> {
  const digest = await getSubtleCrypto().digest(
    "SHA-256",
    toBufferSource(stringToBytes(data)),
  );
  return [...new Uint8Array(digest)]
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export async function deriveKeyFromPassphrase(
  passphrase: string,
  salt: Uint8Array,
  iterations = PBKDF2_ITERATIONS,
  extractable = false,
): Promise<CryptoKey> {
  const subtle = getSubtleCrypto();
  const baseKey = await subtle.importKey(
    "raw",
    toBufferSource(stringToBytes(passphrase)),
    "PBKDF2",
    false,
    ["deriveKey"],
  );
  return subtle.deriveKey(
    {
      name: "PBKDF2",
      salt: toBufferSource(salt),
      iterations,
      hash: PBKDF2_HASH,
    },
    baseKey,
    { name: "AES-GCM", length: 256 },
    extractable,
    ["encrypt", "decrypt"],
  );
}

export async function exportRawKey(key: CryptoKey): Promise<Uint8Array> {
  const raw = await getSubtleCrypto().exportKey("raw", key);
  return new Uint8Array(raw as ArrayBuffer);
}

export async function importRawKey(raw: Uint8Array): Promise<CryptoKey> {
  return getSubtleCrypto().importKey(
    "raw",
    toBufferSource(raw),
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"],
  );
}

export function generateKdfSalt(): Uint8Array {
  return randomBytes(16);
}

export function parseEncryptedBackup(raw: unknown): EncryptedBackupFile {
  return encryptedBackupSchema.parse(raw);
}

export function serializeEncryptedBackup(file: EncryptedBackupFile): string {
  return JSON.stringify(file);
}

export async function encryptBackupWithKey(
  backup: BackupFile,
  key: CryptoKey,
  options: { deviceId: string; kdfSalt: Uint8Array; iterations?: number },
): Promise<EncryptedBackupFile> {
  const backupJson = JSON.stringify(backup);
  const inner: EncryptedBackupInner = {
    backup,
    deviceId: options.deviceId,
    contentHash: await sha256Hex(backupJson),
  };
  const iv = randomBytes(12);
  const ciphertext = await getSubtleCrypto().encrypt(
    { name: "AES-GCM", iv: toBufferSource(iv) },
    key,
    toBufferSource(stringToBytes(JSON.stringify(inner))),
  );
  return {
    format: E2EE_FORMAT,
    kdf: {
      name: "PBKDF2",
      hash: PBKDF2_HASH,
      iterations: options.iterations ?? PBKDF2_ITERATIONS,
      salt: bytesToBase64(options.kdfSalt),
    },
    cipher: {
      name: "AES-GCM",
      iv: bytesToBase64(iv),
    },
    ciphertext: bytesToBase64(new Uint8Array(ciphertext)),
  };
}

export async function encryptBackup(
  backup: BackupFile,
  passphrase: string,
  options: { deviceId: string; kdfSalt?: Uint8Array; iterations?: number },
): Promise<EncryptedBackupFile> {
  const salt = options.kdfSalt ?? generateKdfSalt();
  const key = await deriveKeyFromPassphrase(
    passphrase,
    salt,
    options.iterations ?? PBKDF2_ITERATIONS,
  );
  return encryptBackupWithKey(backup, key, {
    deviceId: options.deviceId,
    kdfSalt: salt,
    iterations: options.iterations ?? PBKDF2_ITERATIONS,
  });
}

export async function decryptBackupWithKey(
  file: EncryptedBackupFile,
  key: CryptoKey,
): Promise<{ backup: BackupFile; deviceId: string; contentHash: string }> {
  const iv = base64ToBytes(file.cipher.iv);
  let plain: ArrayBuffer;
  try {
    plain = await getSubtleCrypto().decrypt(
      { name: "AES-GCM", iv: toBufferSource(iv) },
      key,
      toBufferSource(base64ToBytes(file.ciphertext)),
    );
  } catch {
    throw new E2EEDecryptError();
  }

  let inner: EncryptedBackupInner;
  try {
    inner = JSON.parse(bytesToString(new Uint8Array(plain))) as EncryptedBackupInner;
  } catch {
    throw new E2EEDecryptError();
  }

  if (!inner?.backup) {
    throw new E2EEDecryptError();
  }

  const expectedHash = await sha256Hex(JSON.stringify(inner.backup));
  if (inner.contentHash !== expectedHash) {
    throw new E2EEDecryptError();
  }

  const result = parseBackup(JSON.stringify(inner.backup));
  if (!result.ok) {
    throw new E2EEDecryptError();
  }
  const backup = result.backup;

  return {
    backup,
    deviceId: inner.deviceId,
    contentHash: inner.contentHash,
  };
}

export async function decryptBackup(
  file: EncryptedBackupFile,
  passphrase: string,
): Promise<{ backup: BackupFile; deviceId: string; contentHash: string }> {
  const salt = base64ToBytes(file.kdf.salt);
  const key = await deriveKeyFromPassphrase(
    passphrase,
    salt,
    file.kdf.iterations,
  );
  return decryptBackupWithKey(file, key);
}

export async function decryptBackupFromJson(
  json: string,
  passphrase: string,
): Promise<{ backup: BackupFile; deviceId: string; contentHash: string }> {
  const parsed = parseEncryptedBackup(JSON.parse(json));
  return decryptBackup(parsed, passphrase);
}
