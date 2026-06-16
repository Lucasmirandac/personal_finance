import { bytesToBase64 } from "../crypto/encoding";

const PKCE_STORAGE_KEY = "pf:oauth-pkce:v1";

type PkceState = {
  verifier: string;
  state: string;
  provider: string;
};

function randomString(length: number): string {
  const bytes = new Uint8Array(length);
  crypto.getRandomValues(bytes);
  return bytesToBase64(bytes).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

async function sha256Base64Url(input: string): Promise<string> {
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(input),
  );
  return bytesToBase64(new Uint8Array(digest))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

export async function createPkcePair(): Promise<{
  verifier: string;
  challenge: string;
}> {
  const verifier = randomString(32);
  const challenge = await sha256Base64Url(verifier);
  return { verifier, challenge };
}

export function getOAuthRedirectUri(): string {
  if (typeof window === "undefined") return "";
  return `${window.location.origin}/config/oauth/callback`;
}

export function storePkceState(state: PkceState): void {
  sessionStorage.setItem(PKCE_STORAGE_KEY, JSON.stringify(state));
}

export function consumePkceState(expectedState: string): PkceState | null {
  const raw = sessionStorage.getItem(PKCE_STORAGE_KEY);
  sessionStorage.removeItem(PKCE_STORAGE_KEY);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as PkceState;
    if (parsed.state !== expectedState) return null;
    return parsed;
  } catch {
    return null;
  }
}

export async function startOAuthPopup(
  authUrl: string,
  provider: string,
): Promise<{ code: string; state: string }> {
  return new Promise((resolve, reject) => {
    const width = 520;
    const height = 640;
    const left = window.screenX + (window.outerWidth - width) / 2;
    const top = window.screenY + (window.outerHeight - height) / 2;
    const popup = window.open(
      authUrl,
      `saldoreal-oauth-${provider}`,
      `width=${width},height=${height},left=${left},top=${top}`,
    );
    if (!popup) {
      reject(new Error("Não foi possível abrir a janela de autorização."));
      return;
    }

    const timeout = window.setTimeout(() => {
      cleanup();
      reject(new Error("Tempo esgotado na autorização."));
    }, 120_000);

    function onMessage(event: MessageEvent) {
      if (event.origin !== window.location.origin) return;
      const data = event.data as {
        type?: string;
        code?: string;
        state?: string;
        error?: string;
      };
      if (data?.type !== "saldoreal-oauth-callback") return;
      cleanup();
      if (data.error) {
        reject(new Error(data.error));
        return;
      }
      if (!data.code || !data.state) {
        reject(new Error("Resposta OAuth inválida."));
        return;
      }
      resolve({ code: data.code, state: data.state });
    }

    function cleanup() {
      window.clearTimeout(timeout);
      window.removeEventListener("message", onMessage);
    }

    window.addEventListener("message", onMessage);
  });
}

export async function exchangeCodeForTokens(
  tokenUrl: string,
  params: Record<string, string>,
): Promise<Record<string, unknown>> {
  const body = new URLSearchParams(params);
  const res = await fetch(tokenUrl, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Falha ao obter token: ${text.slice(0, 200)}`);
  }
  return res.json() as Promise<Record<string, unknown>>;
}

export function tokensFromResponse(
  data: Record<string, unknown>,
): { accessToken: string; refreshToken?: string; expiresAt: number } {
  const accessToken = data.access_token;
  if (typeof accessToken !== "string") {
    throw new Error("Resposta OAuth sem access_token.");
  }
  const expiresIn =
    typeof data.expires_in === "number" ? data.expires_in : 3600;
  const refreshToken =
    typeof data.refresh_token === "string" ? data.refresh_token : undefined;
  return {
    accessToken,
    refreshToken,
    expiresAt: Date.now() + expiresIn * 1000 - 60_000,
  };
}

export async function preparePkceOAuth(
  provider: string,
): Promise<{ verifier: string; challenge: string; state: string }> {
  const { verifier, challenge } = await createPkcePair();
  const state = randomString(16);
  storePkceState({ verifier, state, provider });
  return { verifier, challenge, state };
}
