import { describe, expect, it } from "vitest";
import { evaluateRemoteProbe } from "./remote-probe";

describe("evaluateRemoteProbe", () => {
  const remoteAt = "2025-06-10T12:00:00.000Z";
  const localAt = "2025-06-01T12:00:00.000Z";
  const revision = "rev-1";

  it("returns clear when local revision matches remote", () => {
    expect(
      evaluateRemoteProbe({
        localExportedAt: localAt,
        remoteExportedAt: remoteAt,
        lastRemoteRevision: revision,
        remoteRevision: revision,
      }),
    ).toBe("clear");
  });

  it("returns pending_restore on new device when remote is newer than local", () => {
    expect(
      evaluateRemoteProbe({
        localExportedAt: localAt,
        remoteExportedAt: remoteAt,
        lastRemoteRevision: null,
        remoteRevision: revision,
      }),
    ).toBe("pending_restore");
  });

  it("returns pending_restore when local has no export timestamp", () => {
    expect(
      evaluateRemoteProbe({
        localExportedAt: null,
        remoteExportedAt: remoteAt,
        lastRemoteRevision: null,
        remoteRevision: revision,
      }),
    ).toBe("pending_restore");
  });

  it("returns clear when local is newer and device has no revision yet", () => {
    const newerLocal = "2025-06-15T12:00:00.000Z";
    expect(
      evaluateRemoteProbe({
        localExportedAt: newerLocal,
        remoteExportedAt: remoteAt,
        lastRemoteRevision: null,
        remoteRevision: revision,
      }),
    ).toBe("clear");
  });

  it("returns conflict when revision diverges and local is newer", () => {
    const newerLocal = "2025-06-15T12:00:00.000Z";
    expect(
      evaluateRemoteProbe({
        localExportedAt: newerLocal,
        remoteExportedAt: remoteAt,
        lastRemoteRevision: "rev-old",
        remoteRevision: revision,
      }),
    ).toBe("conflict");
  });
});
