import {
  E2EE_FILENAME,
  parseEncryptedBackup,
  serializeEncryptedBackup,
  type EncryptedBackupFile,
} from "../crypto/e2ee";
import {
  consumePkceState,
  exchangeCodeForTokens,
  getOAuthRedirectUri,
  preparePkceOAuth,
  startOAuthPopup,
  tokensFromResponse,
} from "./oauth-pkce";
import {
  getProviderTokens,
  saveProviderTokens,
  updateCloudSyncSettings,
} from "./settings";
import type { CloudProvider, OAuthTokens, RemoteFileMeta } from "./types";

const DROPBOX_AUTH_URL = "https://www.dropbox.com/oauth2/authorize";
const DROPBOX_TOKEN_URL = "https://api.dropboxapi.com/oauth2/token";
const DROPBOX_API = "https://api.dropboxapi.com/2";
const DROPBOX_CONTENT = "https://content.dropboxapi.com/2";
const DROPBOX_PATH = `/${E2EE_FILENAME}`;

function getAppKey(): string {
  const key = process.env.NEXT_PUBLIC_DROPBOX_APP_KEY?.trim();
  if (!key) {
    throw new Error("NEXT_PUBLIC_DROPBOX_APP_KEY não configurado.");
  }
  return key;
}

async function ensureFreshTokens(tokens: OAuthTokens): Promise<OAuthTokens> {
  if (Date.now() < tokens.expiresAt) return tokens;
  if (!tokens.refreshToken) {
    throw new Error("Sessão Dropbox expirada. Conecte novamente.");
  }
  const data = await exchangeCodeForTokens(DROPBOX_TOKEN_URL, {
    grant_type: "refresh_token",
    refresh_token: tokens.refreshToken,
    client_id: getAppKey(),
  });
  const refreshed = tokensFromResponse(data);
  const next: OAuthTokens = {
    accessToken: refreshed.accessToken,
    refreshToken: tokens.refreshToken,
    expiresAt: refreshed.expiresAt,
  };
  await saveProviderTokens("dropbox", next);
  return next;
}

async function dropboxRpc(
  tokens: OAuthTokens,
  path: string,
  body: Record<string, unknown>,
): Promise<Response> {
  const fresh = await ensureFreshTokens(tokens);
  const res = await fetch(`${DROPBOX_API}${path}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${fresh.accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Dropbox: ${text.slice(0, 200)}`);
  }
  return res;
}

async function getFileMeta(tokens: OAuthTokens): Promise<RemoteFileMeta | null> {
  try {
    const res = await dropboxRpc(tokens, "/files/get_metadata", {
      path: DROPBOX_PATH,
      include_media_info: false,
    });
    const data = (await res.json()) as {
      rev?: string;
      client_modified?: string;
    };
    if (!data.rev) return null;
    return { revision: data.rev, modifiedAt: data.client_modified };
  } catch {
    return null;
  }
}

export const dropboxProvider: CloudProvider = {
  id: "dropbox",
  label: "Dropbox",

  async connect() {
    const appKey = getAppKey();
    const redirectUri = getOAuthRedirectUri();
    const { verifier, challenge, state } = await preparePkceOAuth("dropbox");
    const params = new URLSearchParams({
      client_id: appKey,
      redirect_uri: redirectUri,
      response_type: "code",
      token_access_type: "offline",
      code_challenge: challenge,
      code_challenge_method: "S256",
      state,
    });
    const { code, state: returnedState } = await startOAuthPopup(
      `${DROPBOX_AUTH_URL}?${params.toString()}`,
      "dropbox",
    );
    const pkce = consumePkceState(returnedState);
    if (!pkce || pkce.verifier !== verifier) {
      throw new Error("Estado OAuth inválido.");
    }
    const data = await exchangeCodeForTokens(DROPBOX_TOKEN_URL, {
      client_id: appKey,
      code,
      redirect_uri: redirectUri,
      grant_type: "authorization_code",
      code_verifier: verifier,
    });
    const tokens = tokensFromResponse(data);
    await saveProviderTokens("dropbox", tokens);
    await updateCloudSyncSettings({ provider: "dropbox" });
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
    return getFileMeta(tokens);
  },

  async upload(tokens, data, expectedRevision) {
    const fresh = await ensureFreshTokens(tokens);
    const payload = serializeEncryptedBackup(data);
    const existing = await getFileMeta(fresh);

    if (existing && expectedRevision && existing.revision !== expectedRevision) {
      throw new Error("CONFLICT");
    }

    const mode = existing ? "overwrite" : "add";
    const apiArg: Record<string, unknown> = {
      path: DROPBOX_PATH,
      mode,
      autorename: false,
      mute: true,
    };
    if (existing?.revision) {
      apiArg.rev = existing.revision;
    }

    const res = await fetch(`${DROPBOX_CONTENT}/files/upload`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${fresh.accessToken}`,
        "Content-Type": "application/octet-stream",
        "Dropbox-API-Arg": JSON.stringify(apiArg),
      },
      body: payload,
    });

    if (res.status === 409) {
      throw new Error("CONFLICT");
    }
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Dropbox upload: ${text.slice(0, 200)}`);
    }

    const uploaded = (await res.json()) as { rev?: string; client_modified?: string };
    return {
      revision: uploaded.rev ?? existing?.revision ?? "1",
      modifiedAt: uploaded.client_modified,
    };
  },

  async download(tokens) {
    const fresh = await ensureFreshTokens(tokens);
    try {
      const res = await fetch(`${DROPBOX_CONTENT}/files/download`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${fresh.accessToken}`,
          "Dropbox-API-Arg": JSON.stringify({ path: DROPBOX_PATH }),
        },
      });
      if (res.status === 409) return null;
      if (!res.ok) {
        const text = await res.text();
        throw new Error(`Dropbox download: ${text.slice(0, 200)}`);
      }
      const json = await res.text();
      return parseEncryptedBackup(JSON.parse(json));
    } catch {
      return null;
    }
  },
};

export async function loadDropboxTokens(): Promise<OAuthTokens | null> {
  return getProviderTokens("dropbox");
}
