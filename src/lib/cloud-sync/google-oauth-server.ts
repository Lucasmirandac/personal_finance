import { getSiteUrl } from "../marketing/site";

export const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token";
export const OAUTH_CALLBACK_PATH = "/config/oauth/callback";

export type GoogleTokenRequest =
  | {
      grant_type: "authorization_code";
      code: string;
      code_verifier: string;
      redirect_uri: string;
    }
  | {
      grant_type: "refresh_token";
      refresh_token: string;
    };

export type GoogleTokenResponse = {
  access_token: string;
  refresh_token?: string;
  expires_in: number;
  token_type?: string;
};

export class GoogleOAuthError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "GoogleOAuthError";
    this.status = status;
  }
}

/** Normalizes origin URLs from env (trim, strip trailing slash). */
export function parseOrigins(raw: string | undefined): string[] {
  if (!raw?.trim()) return [];
  const out: string[] = [];
  for (const part of raw.split(",")) {
    const trimmed = part.trim().replace(/\/$/, "");
    if (!trimmed) continue;
    try {
      out.push(new URL(trimmed).origin);
    } catch {
      // skip invalid entries
    }
  }
  return out;
}

/** Adds www / apex pair for a valid https origin (convenience). */
function withWwwOriginPair(origin: string): string[] {
  try {
    const url = new URL(origin);
    if (url.protocol !== "https:" && url.protocol !== "http:") {
      return [origin];
    }
    const host = url.hostname;
    const results = [url.origin];
    if (host.startsWith("www.")) {
      const apex = host.slice(4);
      if (apex) results.push(`${url.protocol}//${apex}`);
    } else if (!host.includes("localhost") && !host.startsWith("127.")) {
      results.push(`${url.protocol}//www.${host}`);
    }
    return results;
  } catch {
    return [origin];
  }
}

export function getAllowedRedirectOrigins(): string[] {
  const origins = new Set<string>([
    getSiteUrl(),
    ...withWwwOriginPair(getSiteUrl()),
    ...parseOrigins(process.env.OAUTH_ALLOWED_ORIGINS),
    "http://localhost:3000",
    "http://127.0.0.1:3000",
  ]);
  return [...origins];
}

export function isValidRedirectUri(redirectUri: string): boolean {
  try {
    const url = new URL(redirectUri);
    if (!getAllowedRedirectOrigins().includes(url.origin)) return false;
    return url.pathname === OAUTH_CALLBACK_PATH;
  } catch {
    return false;
  }
}

export function getGoogleOAuthConfig(): {
  clientId: string;
  clientSecret: string;
} | null {
  const clientId =
    process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID?.trim() ||
    process.env.GOOGLE_CLIENT_ID?.trim();
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET?.trim();
  if (!clientId || !clientSecret) return null;
  return { clientId, clientSecret };
}

export function parseGoogleTokenRequest(body: unknown): GoogleTokenRequest {
  if (!body || typeof body !== "object") {
    throw new GoogleOAuthError("Corpo da requisição inválido.", 400);
  }
  const o = body as Record<string, unknown>;
  const grantType = o.grant_type;
  if (grantType === "authorization_code") {
    if (typeof o.code !== "string" || o.code.length === 0) {
      throw new GoogleOAuthError("code é obrigatório.", 400);
    }
    if (typeof o.code_verifier !== "string" || o.code_verifier.length === 0) {
      throw new GoogleOAuthError("code_verifier é obrigatório.", 400);
    }
    if (typeof o.redirect_uri !== "string" || o.redirect_uri.length === 0) {
      throw new GoogleOAuthError("redirect_uri é obrigatório.", 400);
    }
    return {
      grant_type: "authorization_code",
      code: o.code,
      code_verifier: o.code_verifier,
      redirect_uri: o.redirect_uri,
    };
  }
  if (grantType === "refresh_token") {
    if (typeof o.refresh_token !== "string" || o.refresh_token.length === 0) {
      throw new GoogleOAuthError("refresh_token é obrigatório.", 400);
    }
    return {
      grant_type: "refresh_token",
      refresh_token: o.refresh_token,
    };
  }
  throw new GoogleOAuthError("grant_type inválido.", 400);
}

export function buildGoogleTokenParams(
  request: GoogleTokenRequest,
  config: { clientId: string; clientSecret: string },
): URLSearchParams {
  const params = new URLSearchParams({
    client_id: config.clientId,
    client_secret: config.clientSecret,
    grant_type: request.grant_type,
  });
  if (request.grant_type === "authorization_code") {
    params.set("code", request.code);
    params.set("code_verifier", request.code_verifier);
    params.set("redirect_uri", request.redirect_uri);
  } else {
    params.set("refresh_token", request.refresh_token);
  }
  return params;
}

export async function exchangeGoogleToken(
  request: GoogleTokenRequest,
  fetchImpl: typeof fetch = fetch,
): Promise<GoogleTokenResponse> {
  const config = getGoogleOAuthConfig();
  if (!config) {
    throw new GoogleOAuthError(
      "Google OAuth não configurado no servidor. Defina NEXT_PUBLIC_GOOGLE_CLIENT_ID e GOOGLE_CLIENT_SECRET.",
      500,
    );
  }

  if (request.grant_type === "authorization_code") {
    if (!isValidRedirectUri(request.redirect_uri)) {
      throw new GoogleOAuthError("redirect_uri não autorizado.", 400);
    }
  }

  const res = await fetchImpl(GOOGLE_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: buildGoogleTokenParams(request, config),
  });

  const text = await res.text();
  let data: Record<string, unknown>;
  try {
    data = JSON.parse(text) as Record<string, unknown>;
  } catch {
    throw new GoogleOAuthError("Resposta inválida do Google.", 502);
  }

  if (!res.ok) {
    const desc =
      typeof data.error_description === "string"
        ? data.error_description
        : typeof data.error === "string"
          ? data.error
          : "Falha ao obter token Google.";
    throw new GoogleOAuthError(desc, res.status);
  }

  if (typeof data.access_token !== "string") {
    throw new GoogleOAuthError("Resposta OAuth incompleta.", 502);
  }

  return {
    access_token: data.access_token,
    refresh_token:
      typeof data.refresh_token === "string" ? data.refresh_token : undefined,
    expires_in: typeof data.expires_in === "number" ? data.expires_in : 3600,
    token_type: typeof data.token_type === "string" ? data.token_type : undefined,
  };
}
