import { describe, expect, it } from "vitest";
import {
  getCloudSyncReminder,
  getCloudSyncStatusLabel,
  shouldSuppressBackupReminder,
} from "./display";
import type { CloudSyncState } from "./types";

const baseState: CloudSyncState = {
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

describe("getCloudSyncStatusLabel", () => {
  it("shows awaiting first backup when connected without sync", () => {
    expect(
      getCloudSyncStatusLabel({
        ...baseState,
        connected: true,
        provider: "google",
        sessionUnlocked: true,
      }),
    ).toBe("Aguardando primeiro backup");
  });

  it("shows protected label after successful sync", () => {
    expect(
      getCloudSyncStatusLabel({
        ...baseState,
        connected: true,
        provider: "google",
        sessionUnlocked: true,
        lastSyncAt: "2025-06-10T12:00:00.000Z",
      }),
    ).toBe("Protegido no Google Drive");
  });
});

describe("getCloudSyncReminder", () => {
  it("prompts setup when user has data but no cloud connection", () => {
    const reminder = getCloudSyncReminder(baseState, true, 20);
    expect(reminder?.label).toBe("Proteger no Drive");
  });

  it("shows locked chip when session is locked", () => {
    const reminder = getCloudSyncReminder(
      {
        ...baseState,
        connected: true,
        provider: "google",
        status: "locked",
      },
      true,
      null,
    );
    expect(reminder?.label).toBe("Sync bloqueada");
  });

  it("suppresses backup reminder when cloud sync is recent", () => {
    const recent = new Date().toISOString();
    expect(
      shouldSuppressBackupReminder({
        ...baseState,
        connected: true,
        provider: "google",
        lastSyncAt: recent,
      }),
    ).toBe(true);
  });
});
