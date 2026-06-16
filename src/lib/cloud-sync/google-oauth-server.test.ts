import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  buildGoogleTokenParams,
  exchangeGoogleToken,
  getAllowedRedirectOrigins,
  GoogleOAuthError,
  isValidRedirectUri,
  parseGoogleTokenRequest,
  parseOrigins,
} from "./google-oauth-server";

describe("google-oauth-server", () => {
  beforeEach(() => {
    vi.stubEnv("NEXT_PUBLIC_GOOGLE_CLIENT_ID", "test-client-id");
    vi.stubEnv("GOOGLE_CLIENT_SECRET", "test-client-secret");
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "https://saldoreal.app");
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  describe("isValidRedirectUri", () => {
    it("accepts production callback", () => {
      expect(
        isValidRedirectUri("https://saldoreal.app/config/oauth/callback"),
      ).toBe(true);
    });

    it("accepts localhost callback", () => {
      expect(
        isValidRedirectUri("http://localhost:3000/config/oauth/callback"),
      ).toBe(true);
    });

    it("rejects wrong path", () => {
      expect(
        isValidRedirectUri("http://localhost:3000/other/callback"),
      ).toBe(false);
    });

    it("rejects unknown origin", () => {
      expect(
        isValidRedirectUri("https://evil.example/config/oauth/callback"),
      ).toBe(false);
    });

    it("accepts origin from OAUTH_ALLOWED_ORIGINS", () => {
      vi.stubEnv(
        "OAUTH_ALLOWED_ORIGINS",
        "https://www.saldoreal.dev.br,https://saldoreal.dev.br",
      );
      expect(
        isValidRedirectUri(
          "https://www.saldoreal.dev.br/config/oauth/callback",
        ),
      ).toBe(true);
      expect(
        isValidRedirectUri("https://saldoreal.dev.br/config/oauth/callback"),
      ).toBe(true);
    });

    it("adds www pair for NEXT_PUBLIC_SITE_URL", () => {
      vi.stubEnv("NEXT_PUBLIC_SITE_URL", "https://saldoreal.app");
      expect(getAllowedRedirectOrigins()).toContain("https://www.saldoreal.app");
      expect(getAllowedRedirectOrigins()).toContain("https://saldoreal.app");
    });
  });

  describe("parseOrigins", () => {
    it("parses comma-separated origins", () => {
      expect(
        parseOrigins(
          "https://www.saldoreal.dev.br/, https://saldoreal.app",
        ),
      ).toEqual(["https://www.saldoreal.dev.br", "https://saldoreal.app"]);
    });

    it("returns empty for blank input", () => {
      expect(parseOrigins("  ")).toEqual([]);
    });
  });

  describe("parseGoogleTokenRequest", () => {
    it("parses authorization_code request", () => {
      expect(
        parseGoogleTokenRequest({
          grant_type: "authorization_code",
          code: "abc",
          code_verifier: "verifier",
          redirect_uri: "http://localhost:3000/config/oauth/callback",
        }),
      ).toEqual({
        grant_type: "authorization_code",
        code: "abc",
        code_verifier: "verifier",
        redirect_uri: "http://localhost:3000/config/oauth/callback",
      });
    });

    it("parses refresh_token request", () => {
      expect(
        parseGoogleTokenRequest({
          grant_type: "refresh_token",
          refresh_token: "refresh-abc",
        }),
      ).toEqual({
        grant_type: "refresh_token",
        refresh_token: "refresh-abc",
      });
    });

    it("rejects invalid redirect in later validation", () => {
      expect(() =>
        parseGoogleTokenRequest({
          grant_type: "authorization_code",
          code: "abc",
          code_verifier: "verifier",
          redirect_uri: "https://evil.example/config/oauth/callback",
        }),
      ).not.toThrow();
    });
  });

  describe("buildGoogleTokenParams", () => {
    it("includes client_secret for authorization_code", () => {
      const params = buildGoogleTokenParams(
        {
          grant_type: "authorization_code",
          code: "abc",
          code_verifier: "verifier",
          redirect_uri: "http://localhost:3000/config/oauth/callback",
        },
        { clientId: "id", clientSecret: "secret" },
      );
      expect(params.get("client_secret")).toBe("secret");
      expect(params.get("code_verifier")).toBe("verifier");
      expect(params.get("grant_type")).toBe("authorization_code");
    });

    it("includes client_secret for refresh_token", () => {
      const params = buildGoogleTokenParams(
        {
          grant_type: "refresh_token",
          refresh_token: "refresh-abc",
        },
        { clientId: "id", clientSecret: "secret" },
      );
      expect(params.get("client_secret")).toBe("secret");
      expect(params.get("refresh_token")).toBe("refresh-abc");
    });
  });

  describe("exchangeGoogleToken", () => {
    it("rejects invalid redirect_uri before calling Google", async () => {
      await expect(
        exchangeGoogleToken({
          grant_type: "authorization_code",
          code: "abc",
          code_verifier: "verifier",
          redirect_uri: "https://evil.example/config/oauth/callback",
        }),
      ).rejects.toMatchObject({
        message: "redirect_uri não autorizado.",
        status: 400,
      });
    });

    it("returns parsed tokens from Google response", async () => {
      const fetchMock = vi.fn().mockResolvedValue({
        ok: true,
        text: async () =>
          JSON.stringify({
            access_token: "access-123",
            refresh_token: "refresh-456",
            expires_in: 3600,
          }),
      });

      const tokens = await exchangeGoogleToken(
        {
          grant_type: "authorization_code",
          code: "abc",
          code_verifier: "verifier",
          redirect_uri: "http://localhost:3000/config/oauth/callback",
        },
        fetchMock,
      );

      expect(tokens.access_token).toBe("access-123");
      expect(tokens.refresh_token).toBe("refresh-456");
      expect(tokens.expires_in).toBe(3600);
      expect(fetchMock).toHaveBeenCalledOnce();

      const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
      const body = init.body?.toString() ?? "";
      expect(body).toContain("client_secret=test-client-secret");
      expect(body).toContain("code_verifier=verifier");
    });

    it("maps Google errors to GoogleOAuthError", async () => {
      const fetchMock = vi.fn().mockResolvedValue({
        ok: false,
        status: 400,
        text: async () =>
          JSON.stringify({
            error: "invalid_request",
            error_description: "client_secret is missing.",
          }),
      });

      await expect(
        exchangeGoogleToken(
          {
            grant_type: "refresh_token",
            refresh_token: "refresh-abc",
          },
          fetchMock,
        ),
      ).rejects.toBeInstanceOf(GoogleOAuthError);
    });

    it("fails when server env is missing", async () => {
      vi.stubEnv("GOOGLE_CLIENT_SECRET", "");
      await expect(
        exchangeGoogleToken({
          grant_type: "refresh_token",
          refresh_token: "refresh-abc",
        }),
      ).rejects.toMatchObject({ status: 500 });
    });
  });
});
