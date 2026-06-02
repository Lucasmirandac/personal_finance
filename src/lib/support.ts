const DEFAULT_SUPPORT_EMAIL = "bugs@saldoreal.app";

let warnedMissingSupportEmail = false;

export function getSupportEmail(): string {
  const email = process.env.NEXT_PUBLIC_SUPPORT_EMAIL?.trim();
  if (email) return email;

  if (
    process.env.NODE_ENV === "development" &&
    !warnedMissingSupportEmail
  ) {
    warnedMissingSupportEmail = true;
    console.warn(
      `[Saldo Real] NEXT_PUBLIC_SUPPORT_EMAIL não definido; usando ${DEFAULT_SUPPORT_EMAIL}`,
    );
  }

  return DEFAULT_SUPPORT_EMAIL;
}

export function getAppVersion(): string {
  return process.env.NEXT_PUBLIC_APP_VERSION ?? "0.0.0";
}

/** Encoded mailto bodies above this length are often truncated by email clients. */
export const MAILTO_MAX_ENCODED_BODY_LENGTH = 1800;
