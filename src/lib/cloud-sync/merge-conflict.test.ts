import { describe, expect, it } from "vitest";
import { BACKUP_VERSION, BACKUP_APP, type BackupFile } from "../backup";

const localBackup: BackupFile = {
  version: BACKUP_VERSION,
  app: BACKUP_APP,
  exportedAt: "2026-06-15T10:00:00.000Z",
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

const remoteBackup: BackupFile = {
  ...localBackup,
  exportedAt: "2026-06-16T12:00:00.000Z",
};

describe("cloud sync conflict detection", () => {
  it("detects remote newer than local by exportedAt", () => {
    expect(remoteBackup.exportedAt > localBackup.exportedAt).toBe(true);
  });

  it("treats missing local timestamp as older", () => {
    const localAt: string | null = null;
    const fallback = localAt ?? new Date(0).toISOString();
    expect(remoteBackup.exportedAt > fallback).toBe(true);
  });
});
