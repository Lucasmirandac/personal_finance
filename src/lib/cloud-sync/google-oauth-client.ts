import { tokensFromResponse } from "./oauth-pkce";

type AuthorizationCodeRequest = {
  grant_type: "authorization_code";
  code: string;
  code_verifier: string;
  redirect_uri: string;
};

type RefreshTokenRequest = {
  grant_type: "refresh_token";
  refresh_token: string;
};

export type GoogleTokenApiRequest = AuthorizationCodeRequest | RefreshTokenRequest;

function formatGoogleTokenError(message: string): string {
  if (/client_secret is missing/i.test(message)) {
    return "Configure GOOGLE_CLIENT_SECRET no servidor (variável de ambiente, sem NEXT_PUBLIC_).";
  }
  if (/Google OAuth não configurado/i.test(message)) {
    return message;
  }
  return message;
}

export async function exchangeGoogleTokensViaApi(
  body: GoogleTokenApiRequest,
): Promise<Record<string, unknown>> {
  const res = await fetch("/api/oauth/google/token", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  let data: Record<string, unknown> = {};
  try {
    data = (await res.json()) as Record<string, unknown>;
  } catch {
    // ignore invalid JSON
  }

  if (!res.ok) {
    const raw =
      typeof data.error === "string" ? data.error : "Falha ao obter token Google.";
    throw new Error(formatGoogleTokenError(raw));
  }

  return data;
}

export async function exchangeGoogleTokensViaApiAsOAuthTokens(
  body: GoogleTokenApiRequest,
) {
  const data = await exchangeGoogleTokensViaApi(body);
  return tokensFromResponse(data);
}
