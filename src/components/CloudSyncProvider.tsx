"use client";

import { useEffect } from "react";
import { useAppStore } from "@/lib/store";
import {
  getCloudSyncState,
  initCloudSync,
  registerCloudSyncHandlers,
  subscribeCloudSync,
} from "@/lib/cloud-sync/orchestrator";

export function CloudSyncProvider({ children }: { children: React.ReactNode }) {
  const { loaded, importBackup, lastBackupAt } = useAppStore();

  useEffect(() => {
    registerCloudSyncHandlers({
      importBackup,
      getLocalExportedAt: () => lastBackupAt,
    });
  }, [importBackup, lastBackupAt]);

  useEffect(() => {
    if (!loaded) return;
    void initCloudSync();
  }, [loaded]);

  useEffect(() => {
    function onBeforeUnload(e: BeforeUnloadEvent) {
      const { status } = getCloudSyncState();
      if (status === "uploading" || status === "pending") {
        e.preventDefault();
        e.returnValue = "";
      }
    }

    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, []);

  useEffect(() => {
    return subscribeCloudSync((state) => {
      if (typeof document === "undefined") return;
      const dirty = state.status === "uploading" || state.status === "pending";
      document.documentElement.dataset.cloudSyncDirty = dirty ? "true" : "false";
    });
  }, []);

  return children;
}
