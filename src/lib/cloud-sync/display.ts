import { daysSince } from "../backup";
import type { CloudSyncState } from "./types";

export function getCloudSyncStatusLabel(state: CloudSyncState): string {
  if (state.status === "locked") {
    return "Desbloqueie a senha para sincronizar";
  }
  if (state.status === "offline") return "Offline — sync pausado";
  if (state.status === "pending") return "Alterações pendentes…";
  if (state.status === "uploading") return "Enviando…";
  if (state.status === "downloading") return "Baixando…";
  if (state.status === "error") return "Erro na sincronização";
  if (state.status === "conflict" || state.pendingRestore) {
    return "Conflito detectado";
  }
  if (state.connected && !state.lastSyncAt) {
    return "Aguardando primeiro backup";
  }
  if (state.connected && state.lastSyncAt) {
    const providerLabel =
      state.provider === "google"
        ? "Google Drive"
        : state.provider === "dropbox"
          ? "Dropbox"
          : "nuvem";
    return `Protegido no ${providerLabel}`;
  }
  return "Pronto para sincronizar";
}

export type CloudSyncReminderInfo = {
  variant: "setup" | "locked" | "urgent" | "stale";
  label: string;
  href: string;
};

export function getCloudSyncReminder(
  state: CloudSyncState,
  hasAnalysis: boolean,
  manualBackupDays: number | null,
): CloudSyncReminderInfo | null {
  const href = "/config?tab=sincronizacao";

  if (
    state.pendingRestore ||
    state.conflict ||
    state.status === "error"
  ) {
    return {
      variant: "urgent",
      label: state.status === "error" ? "Erro no sync" : "Resolver sync",
      href,
    };
  }

  if (state.connected && state.status === "locked") {
    return { variant: "locked", label: "Sync bloqueada", href };
  }

  if (state.connected && !state.lastSyncAt && state.sessionUnlocked) {
    return { variant: "urgent", label: "Primeiro backup", href };
  }

  if (state.connected && state.lastSyncAt) {
    const days = daysSince(state.lastSyncAt);
    if (days !== null && days > 7) {
      return { variant: "stale", label: `Sync há ${days}d`, href };
    }
    return null;
  }

  if (!state.connected && hasAnalysis) {
    if (manualBackupDays === null || manualBackupDays > 14) {
      return { variant: "setup", label: "Proteger no Drive", href };
    }
  }

  return null;
}

export function shouldSuppressBackupReminder(state: CloudSyncState): boolean {
  if (!state.connected || !state.lastSyncAt) return false;
  const days = daysSince(state.lastSyncAt);
  return days !== null && days <= 14;
}

export function isGoogleProtectionComplete(state: CloudSyncState): boolean {
  return (
    state.connected &&
    state.provider === "google" &&
    !!state.lastSyncAt &&
    state.sessionUnlocked
  );
}

export function getProtectionWizardStep(state: CloudSyncState): 1 | 2 | 3 | 0 {
  if (isGoogleProtectionComplete(state)) return 0;
  if (!state.sessionUnlocked) return 1;
  if (!state.connected || state.provider !== "google") return 2;
  return 3;
}
