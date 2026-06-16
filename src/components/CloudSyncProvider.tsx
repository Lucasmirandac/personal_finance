"use client";

import { useEffect } from "react";
import { useAppStore } from "@/lib/store";
import {
  initCloudSync,
  registerCloudSyncHandlers,
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

  return children;
}
