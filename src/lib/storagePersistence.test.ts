import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  getStoragePersistenceAttemptRecord,
  getStoragePersistenceStatus,
  isStoragePersistenceApiAvailable,
  requestStoragePersistence,
} from "./storagePersistence";

const STORAGE_KEY = "saldoreal:storage-persist:v1";

type MockStorage = {
  persist: ReturnType<typeof vi.fn>;
  persisted: ReturnType<typeof vi.fn>;
};

function createLocalStorageMock(): Storage {
  const store = new Map<string, string>();
  return {
    get length() {
      return store.size;
    },
    clear() {
      store.clear();
    },
    getItem(key: string) {
      return store.get(key) ?? null;
    },
    key(index: number) {
      return [...store.keys()][index] ?? null;
    },
    removeItem(key: string) {
      store.delete(key);
    },
    setItem(key: string, value: string) {
      store.set(key, value);
    },
  };
}

function setNavigatorStorage(storage: MockStorage | undefined): void {
  Object.defineProperty(globalThis, "navigator", {
    configurable: true,
    value: storage ? { storage } : {},
  });
}

describe("isStoragePersistenceApiAvailable", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("returns false when navigator.storage is missing", () => {
    setNavigatorStorage(undefined);
    expect(isStoragePersistenceApiAvailable()).toBe(false);
  });

  it("returns true when persist and persisted exist", () => {
    setNavigatorStorage({
      persist: vi.fn(),
      persisted: vi.fn(),
    });
    expect(isStoragePersistenceApiAvailable()).toBe(true);
  });
});

describe("getStoragePersistenceStatus", () => {
  beforeEach(() => {
    vi.stubGlobal("localStorage", createLocalStorageMock());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("returns unsupported when API is unavailable", async () => {
    setNavigatorStorage(undefined);
    await expect(getStoragePersistenceStatus()).resolves.toBe("unsupported");
  });

  it("returns persistent when persisted() is true", async () => {
    setNavigatorStorage({
      persist: vi.fn(),
      persisted: vi.fn().mockResolvedValue(true),
    });
    await expect(getStoragePersistenceStatus()).resolves.toBe("persistent");
  });

  it("returns best_effort when persisted() is false", async () => {
    setNavigatorStorage({
      persist: vi.fn(),
      persisted: vi.fn().mockResolvedValue(false),
    });
    await expect(getStoragePersistenceStatus()).resolves.toBe("best_effort");
  });

  it("returns unknown when persisted() throws", async () => {
    setNavigatorStorage({
      persist: vi.fn(),
      persisted: vi.fn().mockRejectedValue(new Error("fail")),
    });
    await expect(getStoragePersistenceStatus()).resolves.toBe("unknown");
  });
});

describe("requestStoragePersistence", () => {
  beforeEach(() => {
    vi.stubGlobal("window", {});
    vi.stubGlobal("localStorage", createLocalStorageMock());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("returns unsupported and records flag when API is unavailable", async () => {
    setNavigatorStorage(undefined);
    await expect(requestStoragePersistence()).resolves.toBe("unsupported");
    expect(getStoragePersistenceAttemptRecord()).toBe("unsupported");
  });

  it("returns already_persistent without calling persist()", async () => {
    const persist = vi.fn();
    setNavigatorStorage({
      persist,
      persisted: vi.fn().mockResolvedValue(true),
    });

    await expect(requestStoragePersistence()).resolves.toBe("already_persistent");
    expect(persist).not.toHaveBeenCalled();
    expect(getStoragePersistenceAttemptRecord()).toBe("granted");
  });

  it("returns granted when persist() resolves true", async () => {
    setNavigatorStorage({
      persist: vi.fn().mockResolvedValue(true),
      persisted: vi.fn().mockResolvedValue(false),
    });

    await expect(requestStoragePersistence()).resolves.toBe("granted");
    expect(localStorage.getItem(STORAGE_KEY)).toBe("granted");
  });

  it("returns denied when persist() resolves false", async () => {
    setNavigatorStorage({
      persist: vi.fn().mockResolvedValue(false),
      persisted: vi.fn().mockResolvedValue(false),
    });

    await expect(requestStoragePersistence()).resolves.toBe("denied");
    expect(localStorage.getItem(STORAGE_KEY)).toBe("denied");
  });

  it("returns error when persist() throws", async () => {
    setNavigatorStorage({
      persist: vi.fn().mockRejectedValue(new Error("fail")),
      persisted: vi.fn().mockResolvedValue(false),
    });

    await expect(requestStoragePersistence()).resolves.toBe("error");
    expect(localStorage.getItem(STORAGE_KEY)).toBe("error");
  });
});
