export type RemoteProbeAction = "clear" | "pending_restore" | "conflict";

/**
 * Decide whether a remote backup should block upload on this device.
 * Pure logic — safe to unit test without OAuth/network.
 */
export function evaluateRemoteProbe(input: {
  localExportedAt: string | null;
  remoteExportedAt: string;
  lastRemoteRevision: string | null;
  remoteRevision: string;
}): RemoteProbeAction {
  const {
    localExportedAt,
    remoteExportedAt,
    lastRemoteRevision,
    remoteRevision,
  } = input;

  if (lastRemoteRevision && remoteRevision === lastRemoteRevision) {
    return "clear";
  }

  if (!localExportedAt || remoteExportedAt > localExportedAt) {
    return "pending_restore";
  }

  if (lastRemoteRevision && remoteRevision !== lastRemoteRevision) {
    return "conflict";
  }

  return "clear";
}
