import { useSyncExternalStore } from "react";

export type ConsentStatus = "unset" | "granted" | "revoked";

const STORAGE_KEY = "saldoreal:consent:v1";
const PENDING_GRANT_EVENT_KEY = "saldoreal:consent-grant-pending";

type Listener = (status: ConsentStatus) => void;

const listeners = new Set<Listener>();

function parseStored(value: string | null): ConsentStatus {
  if (value === "granted" || value === "revoked") return value;
  return "unset";
}

export function getConsent(): ConsentStatus {
  if (typeof window === "undefined") return "unset";
  try {
    return parseStored(localStorage.getItem(STORAGE_KEY));
  } catch {
    return "unset";
  }
}

export function setConsent(status: "granted" | "revoked"): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, status);
  } catch {
    // ignore quota / private mode
  }
  for (const listener of listeners) {
    listener(status);
  }
}

export function subscribe(listener: Listener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function hasAnalyticsConsent(): boolean {
  return getConsent() === "granted";
}

/** Call when user grants consent before gtag is loaded. */
export function markConsentGrantPending(): void {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.setItem(PENDING_GRANT_EVENT_KEY, "1");
  } catch {
    // ignore
  }
}

export function useConsent(): ConsentStatus {
  return useSyncExternalStore(subscribe, getConsent, () => "unset");
}

export function consumeConsentGrantPending(): boolean {
  if (typeof window === "undefined") return false;
  try {
    const pending = sessionStorage.getItem(PENDING_GRANT_EVENT_KEY);
    if (pending !== "1") return false;
    sessionStorage.removeItem(PENDING_GRANT_EVENT_KEY);
    return true;
  } catch {
    return false;
  }
}
