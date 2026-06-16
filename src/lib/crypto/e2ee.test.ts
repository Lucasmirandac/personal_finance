import { describe, expect, it } from "vitest";
import { BACKUP_VERSION, BACKUP_APP, type BackupFile } from "../backup";
import {
  decryptBackupWithKey,
  deriveKeyFromPassphrase,
  decryptBackup,
  encryptBackup,
  E2EEDecryptError,
  parseEncryptedBackup,
  PBKDF2_ITERATIONS,
} from "./e2ee";

const TEST_ITERATIONS = 1000;

const sampleBackup: BackupFile = {
  version: BACKUP_VERSION,
  app: BACKUP_APP,
  exportedAt: "2026-06-16T12:00:00.000Z",
  data: {
    dataset: { sources: [] },
    rules: {
      pagamentoPatterns: [],
      estornoPatterns: [],
      genericCategorias: [],
    },
    recurring: [],
    settings: {
      cards: [],
      balanceAnchor: null,
      projectionHorizonDays: 90,
    },
    edits: {},
    installmentGroupEdits: {},
    accounts: [],
    manualTransactions: [],
    budgets: [],
    subscriptionDismissals: [],
    establishmentAliases: [],
    structuralCategories: [],
    achievements: { unlocked: [], meta: { lastSobraTotal: 0, lastStreak: 0 } },
    monthCloses: [],
    paymentStatus: {},
  },
};

describe("e2ee", () => {
  it("roundtrips encrypt and decrypt", async () => {
    const encrypted = await encryptBackup(sampleBackup, "test-passphrase", {
      deviceId: "device-1",
      iterations: TEST_ITERATIONS,
    });
    expect(encrypted.format).toBe("saldoreal-e2ee-v1");
    expect(encrypted.kdf.iterations).toBe(TEST_ITERATIONS);

    const decrypted = await decryptBackup(encrypted, "test-passphrase");
    expect(decrypted.backup.exportedAt).toBe(sampleBackup.exportedAt);
    expect(decrypted.deviceId).toBe("device-1");
  });

  it("rejects wrong passphrase", async () => {
    const encrypted = await encryptBackup(sampleBackup, "correct", {
      deviceId: "device-1",
      iterations: TEST_ITERATIONS,
    });
    await expect(decryptBackup(encrypted, "wrong")).rejects.toBeInstanceOf(
      E2EEDecryptError,
    );
  });

  it("decrypts cross-device backups only after adopting the remote salt", async () => {
    const remoteSalt = new Uint8Array([1, 2, 3, 4]);
    const localSalt = new Uint8Array([9, 8, 7, 6]);
    const encrypted = await encryptBackup(sampleBackup, "same-passphrase", {
      deviceId: "device-a",
      kdfSalt: remoteSalt,
      iterations: TEST_ITERATIONS,
    });

    const wrongLocalKey = await deriveKeyFromPassphrase(
      "same-passphrase",
      localSalt,
      TEST_ITERATIONS,
    );
    await expect(
      decryptBackupWithKey(encrypted, wrongLocalKey),
    ).rejects.toBeInstanceOf(E2EEDecryptError);

    const adoptedRemoteKey = await deriveKeyFromPassphrase(
      "same-passphrase",
      remoteSalt,
      TEST_ITERATIONS,
    );
    await expect(
      decryptBackupWithKey(encrypted, adoptedRemoteKey),
    ).resolves.toMatchObject({
      backup: { exportedAt: sampleBackup.exportedAt },
      deviceId: "device-a",
    });
  });

  it("rejects tampered ciphertext", async () => {
    const encrypted = await encryptBackup(sampleBackup, "test-passphrase", {
      deviceId: "device-1",
      iterations: TEST_ITERATIONS,
    });
    const tampered = {
      ...encrypted,
      ciphertext: encrypted.ciphertext.slice(0, -4) + "AAAA",
    };
    await expect(decryptBackup(tampered, "test-passphrase")).rejects.toBeInstanceOf(
      E2EEDecryptError,
    );
  });

  it("parses encrypted envelope", async () => {
    const encrypted = await encryptBackup(sampleBackup, "test-passphrase", {
      deviceId: "device-1",
      iterations: TEST_ITERATIONS,
    });
    const parsed = parseEncryptedBackup(encrypted);
    expect(parsed.format).toBe("saldoreal-e2ee-v1");
  });

  it("uses production iteration count constant", () => {
    expect(PBKDF2_ITERATIONS).toBe(600_000);
  });
});
