export type StoragePersistenceStatus =
  | "unsupported"
  | "persistent"
  | "best_effort"
  | "unknown";

export type StoragePersistenceAttemptResult =
  | "already_persistent"
  | "granted"
  | "denied"
  | "unsupported"
  | "error";

export type StoragePersistenceAttemptRecord =
  | "granted"
  | "denied"
  | "unsupported"
  | "error";

const STORAGE_KEY = "saldoreal:storage-persist:v1";

type Listener = () => void;

const listeners = new Set<Listener>();

function notifyListeners(): void {
  for (const listener of listeners) {
    listener();
  }
}

function parseAttemptRecord(
  value: string | null,
): StoragePersistenceAttemptRecord | null {
  if (
    value === "granted" ||
    value === "denied" ||
    value === "unsupported" ||
    value === "error"
  ) {
    return value;
  }
  return null;
}

export function getStoragePersistenceAttemptRecord(): StoragePersistenceAttemptRecord | null {
  if (typeof window === "undefined") return null;
  try {
    return parseAttemptRecord(localStorage.getItem(STORAGE_KEY));
  } catch {
    return null;
  }
}

function setStoragePersistenceAttemptRecord(
  record: StoragePersistenceAttemptRecord,
): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, record);
  } catch {
    // ignore quota / private mode
  }
  notifyListeners();
}

export function subscribeStoragePersistence(listener: Listener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function isStoragePersistenceApiAvailable(): boolean {
  if (typeof navigator === "undefined") return false;
  const storage = navigator.storage;
  return (
    storage != null &&
    typeof storage.persist === "function" &&
    typeof storage.persisted === "function"
  );
}

export async function getStoragePersistenceStatus(): Promise<StoragePersistenceStatus> {
  if (!isStoragePersistenceApiAvailable()) return "unsupported";
  try {
    const persisted = await navigator.storage.persisted();
    return persisted ? "persistent" : "best_effort";
  } catch {
    return "unknown";
  }
}

export async function requestStoragePersistence(): Promise<StoragePersistenceAttemptResult> {
  if (!isStoragePersistenceApiAvailable()) {
    setStoragePersistenceAttemptRecord("unsupported");
    return "unsupported";
  }

  try {
    const alreadyPersistent = await navigator.storage.persisted();
    if (alreadyPersistent) {
      setStoragePersistenceAttemptRecord("granted");
      return "already_persistent";
    }

    const granted = await navigator.storage.persist();
    if (granted) {
      setStoragePersistenceAttemptRecord("granted");
      return "granted";
    }

    setStoragePersistenceAttemptRecord("denied");
    return "denied";
  } catch {
    setStoragePersistenceAttemptRecord("error");
    return "error";
  }
}
