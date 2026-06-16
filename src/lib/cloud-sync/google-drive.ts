import {
  E2EE_FILENAME,
  parseEncryptedBackup,
  serializeEncryptedBackup,
  type EncryptedBackupFile,
} from "../crypto/e2ee";
import {
  consumePkceState,
  getOAuthRedirectUri,
  preparePkceOAuth,
  startOAuthPopup,
} from "./oauth-pkce";
import { exchangeGoogleTokensViaApiAsOAuthTokens } from "./google-oauth-client";
import {
  getProviderTokens,
  saveProviderTokens,
  updateCloudSyncSettings,
} from "./settings";
import type { CloudProvider, OAuthTokens, RemoteFileMeta } from "./types";

const GOOGLE_AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth";
const GOOGLE_DRIVE_API = "https://www.googleapis.com/drive/v3";
const GOOGLE_UPLOAD_API = "https://www.googleapis.com/upload/drive/v3";
const GOOGLE_SCOPE = "https://www.googleapis.com/auth/drive.appdata";

function getClientId(): string {
  const id = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID?.trim();
  if (!id) {
    throw new Error("NEXT_PUBLIC_GOOGLE_CLIENT_ID não configurado.");
  }
  return id;
}

async function ensureFreshTokens(tokens: OAuthTokens): Promise<OAuthTokens> {
  if (Date.now() < tokens.expiresAt) return tokens;
  if (!tokens.refreshToken) {
    throw new Error("Sessão Google expirada. Conecte novamente.");
  }
  const refreshed = await exchangeGoogleTokensViaApiAsOAuthTokens({
    grant_type: "refresh_token",
    refresh_token: tokens.refreshToken,
  });
  const next: OAuthTokens = {
    accessToken: refreshed.accessToken,
    refreshToken: tokens.refreshToken,
    expiresAt: refreshed.expiresAt,
  };
  await saveProviderTokens("google", next);
  return next;
}

async function driveFetch(
  tokens: OAuthTokens,
  path: string,
  init?: RequestInit,
): Promise<Response> {
  const fresh = await ensureFreshTokens(tokens);
  const res = await fetch(`${GOOGLE_DRIVE_API}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${fresh.accessToken}`,
      ...(init?.headers ?? {}),
    },
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Google Drive: ${text.slice(0, 200)}`);
  }
  return res;
}

async function findBackupFile(tokens: OAuthTokens): Promise<{
  id: string;
  revision: string;
  modifiedTime?: string;
} | null> {
  const q = encodeURIComponent(
    `name='${E2EE_FILENAME}' and trashed=false`,
  );
  const res = await driveFetch(
    tokens,
    `/files?spaces=appDataFolder&fields=files(id,name,modifiedTime,revisionId)&q=${q}`,
  );
  const data = (await res.json()) as {
    files?: Array<{ id: string; modifiedTime?: string; revisionId?: string }>;
  };
  const file = data.files?.[0];
  if (!file?.id || !file.revisionId) return null;
  return {
    id: file.id,
    revision: file.revisionId,
    modifiedTime: file.modifiedTime,
  };
}

export const googleDriveProvider: CloudProvider = {
  id: "google",
  label: "Google Drive",

  async connect() {
    const clientId = getClientId();
    const redirectUri = getOAuthRedirectUri();
    const { verifier, challenge, state } = await preparePkceOAuth("google");
    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: redirectUri,
      response_type: "code",
      scope: GOOGLE_SCOPE,
      access_type: "offline",
      prompt: "consent",
      code_challenge: challenge,
      code_challenge_method: "S256",
      state,
    });
    const { code, state: returnedState } = await startOAuthPopup(
      `${GOOGLE_AUTH_URL}?${params.toString()}`,
      "google",
    );
    const pkce = consumePkceState(returnedState);
    if (!pkce || pkce.verifier !== verifier) {
      throw new Error("Estado OAuth inválido.");
    }
    const tokens = await exchangeGoogleTokensViaApiAsOAuthTokens({
      grant_type: "authorization_code",
      code,
      redirect_uri: redirectUri,
      code_verifier: verifier,
    });
    await saveProviderTokens("google", tokens);
    await updateCloudSyncSettings({ provider: "google" });
    return tokens;
  },

  async disconnect() {
    await updateCloudSyncSettings({
      provider: null,
      lastRemoteRevision: null,
      conflictPaused: false,
    });
  },

  async refreshTokens(tokens) {
    return ensureFreshTokens(tokens);
  },

  async getRevision(tokens) {
    const fresh = await ensureFreshTokens(tokens);
    const file = await findBackupFile(fresh);
    if (!file) return null;
    return { revision: file.revision, modifiedAt: file.modifiedTime };
  },

  async upload(tokens, data, expectedRevision) {
    const fresh = await ensureFreshTokens(tokens);
    const payload = serializeEncryptedBackup(data);
    const existing = await findBackupFile(fresh);

    if (existing && expectedRevision && existing.revision !== expectedRevision) {
      throw new Error("CONFLICT");
    }

    if (existing) {
      const res = await fetch(
        `${GOOGLE_UPLOAD_API}/files/${existing.id}?uploadType=media`,
        {
          method: "PATCH",
          headers: {
            Authorization: `Bearer ${fresh.accessToken}`,
            "Content-Type": "application/json",
            ...(expectedRevision
              ? { "X-Goog-If-Match": expectedRevision }
              : {}),
          },
          body: payload,
        },
      );
      if (res.status === 412) {
        throw new Error("CONFLICT");
      }
      if (!res.ok) {
        const text = await res.text();
        throw new Error(`Google Drive upload: ${text.slice(0, 200)}`);
      }
      const updated = (await res.json()) as { revisionId?: string; modifiedTime?: string };
      return {
        revision: updated.revisionId ?? existing.revision,
        modifiedAt: updated.modifiedTime ?? existing.modifiedTime,
      };
    }

    const metadata = JSON.stringify({
      name: E2EE_FILENAME,
      parents: ["appDataFolder"],
    });
    const boundary = "saldoreal_boundary";
    const body =
      `--${boundary}\r\n` +
      "Content-Type: application/json; charset=UTF-8\r\n\r\n" +
      `${metadata}\r\n` +
      `--${boundary}\r\n` +
      "Content-Type: application/json\r\n\r\n" +
      `${payload}\r\n` +
      `--${boundary}--`;

    const res = await fetch(
      `${GOOGLE_UPLOAD_API}/files?uploadType=multipart`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${fresh.accessToken}`,
          "Content-Type": `multipart/related; boundary=${boundary}`,
        },
        body,
      },
    );
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Google Drive create: ${text.slice(0, 200)}`);
    }
    const created = (await res.json()) as { revisionId?: string; modifiedTime?: string };
    return {
      revision: created.revisionId ?? "1",
      modifiedAt: created.modifiedTime,
    };
  },

  async download(tokens) {
    const fresh = await ensureFreshTokens(tokens);
    const file = await findBackupFile(fresh);
    if (!file) return null;
    const res = await fetch(
      `${GOOGLE_DRIVE_API}/files/${file.id}?alt=media`,
      {
        headers: { Authorization: `Bearer ${fresh.accessToken}` },
      },
    );
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Google Drive download: ${text.slice(0, 200)}`);
    }
    const json = await res.text();
    return parseEncryptedBackup(JSON.parse(json));
  },
};

export async function loadGoogleTokens(): Promise<OAuthTokens | null> {
  return getProviderTokens("google");
}
