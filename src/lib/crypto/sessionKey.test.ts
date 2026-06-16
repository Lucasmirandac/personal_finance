import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { deriveKeyFromPassphrase, exportRawKey } from "./e2ee";

const store = new Map<string, unknown>();

vi.mock("idb-keyval", () => ({
  get: (key: string) => Promise.resolve(store.get(key)),
  set: (key: string, value: unknown) => {
    store.set(key, value);
    return Promise.resolve();
  },
  del: (key: string) => {
    store.delete(key);
    return Promise.resolve();
  },
}));

const TEST_ITERATIONS = 1000;

describe("sessionKey remember device", () => {
  beforeEach(() => {
    store.clear();
  });

  afterEach(async () => {
    const { lockSession, clearWrappedKey } = await import("./sessionKey");
    lockSession();
    await clearWrappedKey();
  });

  it("setupSession with rememberDevice persists wrap without error", async () => {
    const { setupSession, isSessionUnlocked, getSessionKey } = await import(
      "./sessionKey"
    );

    await expect(
      setupSession("test-passphrase", true, undefined, TEST_ITERATIONS),
    ).resolves.toBeDefined();

    expect(isSessionUnlocked()).toBe(true);
    expect(getSessionKey()).not.toBeNull();
    expect(store.has("pf:cloudSyncKeyWrap:v1")).toBe(true);
  });

  it("session key in memory is not extractable after remember setup", async () => {
    const { setupSession, getSessionKey } = await import("./sessionKey");

    await setupSession("test-passphrase", true, undefined, TEST_ITERATIONS);
    const key = getSessionKey();
    expect(key).not.toBeNull();

    await expect(exportRawKey(key!)).rejects.toThrow(/not extractable/i);
  });

  it("unlockSessionFromWrap restores a working session key", async () => {
    const {
      setupSession,
      lockSession,
      unlockSessionFromWrap,
      isSessionUnlocked,
      getSessionKey,
    } = await import("./sessionKey");

    await setupSession("test-passphrase", true, undefined, TEST_ITERATIONS);
    const originalKey = getSessionKey();
    expect(originalKey).not.toBeNull();

    lockSession();
    expect(isSessionUnlocked()).toBe(false);

    const restored = await unlockSessionFromWrap();
    expect(restored).not.toBeNull();
    expect(isSessionUnlocked()).toBe(true);

    const subtle = globalThis.crypto.subtle;
    const iv = new Uint8Array(12);
    crypto.getRandomValues(iv);
    const data = new TextEncoder().encode("probe");

    const encOriginal = await subtle.encrypt(
      { name: "AES-GCM", iv },
      originalKey!,
      data,
    );
    const encRestored = await subtle.encrypt(
      { name: "AES-GCM", iv },
      getSessionKey()!,
      data,
    );
    expect(new Uint8Array(encOriginal)).toEqual(new Uint8Array(encRestored));
  });

  it("setupSession without remember clears wrapped storage", async () => {
    const { setupSession, clearWrappedKey } = await import("./sessionKey");

    await setupSession("first", true, undefined, TEST_ITERATIONS);
    expect(store.has("pf:cloudSyncKeyWrap:v1")).toBe(true);

    await clearWrappedKey();
    await setupSession("second", false, undefined, TEST_ITERATIONS);
    expect(store.has("pf:cloudSyncKeyWrap:v1")).toBe(false);
  });

  it("deriveKeyFromPassphrase supports extractable keys for wrap flow", async () => {
    const salt = crypto.getRandomValues(new Uint8Array(16));
    const key = await deriveKeyFromPassphrase(
      "wrap-test",
      salt,
      TEST_ITERATIONS,
      true,
    );
    const raw = await exportRawKey(key);
    expect(raw.byteLength).toBe(32);
  });
});
