import type { EncryptedBackupFile } from "../crypto/e2ee";
import { base64ToBytes } from "../crypto/encoding";

export function getKdfSaltFromEncrypted(file: EncryptedBackupFile): Uint8Array {
  return base64ToBytes(file.kdf.salt);
}

export function saltsEqual(a: Uint8Array, b: Uint8Array): boolean {
  if (a.byteLength !== b.byteLength) return false;
  return a.every((byte, index) => byte === b[index]);
}

export function shouldAdoptRemoteSalt(
  localSalt: Uint8Array | null,
  remoteSalt: Uint8Array,
): boolean {
  return !localSalt || !saltsEqual(localSalt, remoteSalt);
}
