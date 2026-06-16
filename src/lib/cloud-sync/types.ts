import type { EncryptedBackupFile } from "../crypto/e2ee";
import type { BackupFile } from "../backup";

export type CloudProviderId = "google" | "dropbox";

export type CloudSyncStatus =
  | "idle"
  | "locked"
  | "pending"
  | "uploading"
  | "downloading"
  | "conflict"
  | "offline"
  | "error";

export type OAuthTokens = {
  accessToken: string;
  refreshToken?: string;
  expiresAt: number;
};

export type RemoteFileMeta = {
  revision: string;
  modifiedAt?: string;
};

export type CloudProvider = {
  id: CloudProviderId;
  label: string;
  connect: () => Promise<OAuthTokens>;
  disconnect: () => Promise<void>;
  getRevision: (tokens: OAuthTokens) => Promise<RemoteFileMeta | null>;
  upload: (
    tokens: OAuthTokens,
    data: EncryptedBackupFile,
    expectedRevision: string | null,
  ) => Promise<RemoteFileMeta>;
  download: (tokens: OAuthTokens) => Promise<EncryptedBackupFile | null>;
  refreshTokens: (tokens: OAuthTokens) => Promise<OAuthTokens>;
};

export type CloudConflictState = {
  remoteBackup: BackupFile;
  remoteRevision: string;
  remoteExportedAt: string;
  localExportedAt: string;
};

export type CloudSyncState = {
  status: CloudSyncStatus;
  provider: CloudProviderId | null;
  connected: boolean;
  hasPassphrase: boolean;
  sessionUnlocked: boolean;
  rememberDevice: boolean;
  lastSyncAt: string | null;
  lastError: string | null;
  conflict: CloudConflictState | null;
  pendingRestore: BackupFile | null;
};

export type CloudSyncListener = (state: CloudSyncState) => void;
