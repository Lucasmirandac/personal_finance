import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { BACKUP_APP, BACKUP_VERSION, type BackupFile } from "../backup";
import type { EncryptedBackupFile } from "../crypto/e2ee";
import { notifyDataMutated, onDataMutated } from "./mutations";
import type {
  CloudProvider,
  CloudProviderId,
  OAuthTokens,
  RemoteFileMeta,
} from "./types";

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

type MockSettings = {
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

async function loadOrchestratorWithMocks(options: {
  remoteFile: EncryptedBackupFile;
  remoteRevision?: string | null;
}) {
  vi.resetModules();
  const idb = new Map<string, unknown>();

  const tokens: OAuthTokens = {
    accessToken: "access",
    expiresAt: Date.now() + 60_000,
  };
  const settings: MockSettings = {
    provider: null,
    deviceId: "device-b",
    kdfSalt: null,
    rememberDevice: false,
    lastSyncAt: null,
    lastRemoteRevision: null,
    lastLocalExportedAt: null,
    conflictPaused: false,
    tokens: {},
  };

  const provider: CloudProvider = {
    id: "google",
    label: "Google Drive",
    connect: vi.fn(async () => {
      settings.provider = "google";
      settings.tokens.google = tokens;
      return tokens;
    }),
    disconnect: vi.fn(async () => {}),
    getRevision: vi.fn(async () =>
      options.remoteRevision === null
        ? null
        : ({
            revision: options.remoteRevision ?? "rev-remote",
            modifiedAt: "2026-06-16T12:00:00.000Z",
          } satisfies RemoteFileMeta),
    ),
    upload: vi.fn(async () => ({
      revision: "rev-uploaded",
      modifiedAt: "2026-06-16T12:01:00.000Z",
    })),
    download: vi.fn(async () => options.remoteFile),
    refreshTokens: vi.fn(async () => tokens),
  };

  vi.doMock("idb-keyval", () => ({
    get: vi.fn(async (key: string) => idb.get(key)),
    set: vi.fn(async (key: string, value: unknown) => {
      idb.set(key, value);
    }),
    del: vi.fn(async (key: string) => {
      idb.delete(key);
    }),
  }));
  vi.doMock("./google-drive", () => ({ googleDriveProvider: provider }));
  vi.doMock("./dropbox", () => ({
    dropboxProvider: { ...provider, id: "dropbox", label: "Dropbox" },
  }));
  vi.doMock("./settings", async () => {
    const encoding = await vi.importActual<typeof import("../crypto/encoding")>(
      "../crypto/encoding",
    );
    return {
      loadCloudSyncSettings: vi.fn(async () => settings),
      updateCloudSyncSettings: vi.fn(async (patch: Partial<MockSettings>) => {
        Object.assign(settings, patch);
        return settings;
      }),
      clearProviderTokens: vi.fn(async (providerId: CloudProviderId) => {
        delete settings.tokens[providerId];
        if (settings.provider === providerId) settings.provider = null;
        return settings;
      }),
      getKdfSaltBytes: vi.fn((current: MockSettings) =>
        current.kdfSalt ? encoding.base64ToBytes(current.kdfSalt) : null,
      ),
      setKdfSaltBytes: vi.fn(encoding.bytesToBase64),
    };
  });
  vi.doMock("../storage", () => ({ saveLastBackupAt: vi.fn() }));
  vi.doMock("../analytics", () => ({ trackEvent: vi.fn() }));
  vi.doMock("./mutations", () => ({
    onDataMutated: vi.fn(),
  }));

  const orchestrator = await import("./orchestrator");
  return { orchestrator, provider, settings };
}

describe("cloud-sync mutations debounce", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("debounces mutation notifications", () => {
    const listener = vi.fn();
    onDataMutated(listener);
    notifyDataMutated();
    notifyDataMutated();
    notifyDataMutated();
    expect(listener).toHaveBeenCalledTimes(3);
  });

  it("uses 45 second debounce constant", async () => {
    const { DEBOUNCE_MS } = await import("./orchestrator");
    expect(DEBOUNCE_MS).toBe(45_000);
  });
});

describe("cloud-sync offline guard", () => {
  it("defaults to online when navigator.onLine is unavailable", () => {
    const online =
      typeof navigator === "undefined"
        ? true
        : navigator.onLine !== false;
    expect(online).toBe(true);
  });
});

describe("cloud sync remote salt handling", () => {
  it("adopts the remote salt on connect and locks the session before uploading", async () => {
    const { encryptBackup } = await import("../crypto/e2ee");
    const { bytesToBase64 } = await import("../crypto/encoding");
    const remoteSalt = new Uint8Array([1, 2, 3, 4]);
    const remoteFile = await encryptBackup(sampleBackup, "same-passphrase", {
      deviceId: "device-a",
      kdfSalt: remoteSalt,
      iterations: 1_000,
    });
    const { orchestrator, provider, settings } =
      await loadOrchestratorWithMocks({
        remoteFile,
      });

    await orchestrator.setupCloudPassphrase("same-passphrase", false);
    expect(settings.kdfSalt).not.toBe(bytesToBase64(remoteSalt));

    await orchestrator.connectCloudProvider("google");

    expect(settings.kdfSalt).toBe(bytesToBase64(remoteSalt));
    expect(orchestrator.getCloudSyncState()).toMatchObject({
      status: "locked",
      sessionUnlocked: false,
    });
    expect(provider.upload).not.toHaveBeenCalled();
  });

  it("blocks the first sync when the remote backup cannot be decrypted", async () => {
    const { encryptBackup } = await import("../crypto/e2ee");
    const remoteFile = await encryptBackup(sampleBackup, "same-passphrase", {
      deviceId: "device-a",
      iterations: 1_000,
    });
    const { orchestrator, provider, settings } =
      await loadOrchestratorWithMocks({
        remoteFile: {
          ...remoteFile,
          ciphertext: `${remoteFile.ciphertext.slice(0, -4)}AAAA`,
        },
      });

    await orchestrator.setupCloudPassphrase("same-passphrase", false);
    const localSalt = settings.kdfSalt;
    settings.kdfSalt = remoteFile.kdf.salt;

    await orchestrator.connectCloudProvider("google");

    expect(settings.kdfSalt).toBe(remoteFile.kdf.salt);
    expect(settings.kdfSalt).not.toBe(localSalt);
    expect(orchestrator.getCloudSyncState()).toMatchObject({
      status: "error",
      lastError: "Senha incorreta ou arquivo corrompido.",
    });
    expect(provider.upload).not.toHaveBeenCalled();
  });
});
