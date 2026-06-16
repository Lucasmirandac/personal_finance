import { describe, expect, it } from "vitest";
import type { EncryptedBackupFile } from "../crypto/e2ee";
import { bytesToBase64 } from "../crypto/encoding";
import {
  getKdfSaltFromEncrypted,
  saltsEqual,
  shouldAdoptRemoteSalt,
} from "./remote-salt";

const encrypted: EncryptedBackupFile = {
  format: "saldoreal-e2ee-v1",
  kdf: {
    name: "PBKDF2",
    hash: "SHA-256",
    iterations: 600_000,
    salt: bytesToBase64(new Uint8Array([1, 2, 3, 4])),
  },
  cipher: {
    name: "AES-GCM",
    iv: bytesToBase64(new Uint8Array([5, 6, 7])),
  },
  ciphertext: bytesToBase64(new Uint8Array([8, 9, 10])),
};

describe("remote salt helpers", () => {
  it("extracts the KDF salt from the encrypted envelope", () => {
    expect([...getKdfSaltFromEncrypted(encrypted)]).toEqual([1, 2, 3, 4]);
  });

  it("compares salts byte-by-byte", () => {
    expect(
      saltsEqual(new Uint8Array([1, 2, 3]), new Uint8Array([1, 2, 3])),
    ).toBe(true);
    expect(
      saltsEqual(new Uint8Array([1, 2, 3]), new Uint8Array([1, 2, 4])),
    ).toBe(false);
    expect(saltsEqual(new Uint8Array([1, 2]), new Uint8Array([1, 2, 3]))).toBe(
      false,
    );
  });

  it("adopts remote salt when local salt is missing or different", () => {
    const remoteSalt = new Uint8Array([1, 2, 3]);
    expect(shouldAdoptRemoteSalt(null, remoteSalt)).toBe(true);
    expect(shouldAdoptRemoteSalt(new Uint8Array([9, 9, 9]), remoteSalt)).toBe(
      true,
    );
    expect(shouldAdoptRemoteSalt(new Uint8Array([1, 2, 3]), remoteSalt)).toBe(
      false,
    );
  });
});
