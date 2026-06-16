"use client";

import Image from "next/image";
import Link from "next/link";
import clsx from "clsx";
import { useAppStore } from "@/lib/store";
import {
  BackupReminder,
  BudgetAlertWidget,
  CloudSyncReminder,
  SetupIndicator,
} from "@/components/HeaderWidgets";
import { AppFooter } from "@/components/AppFooter";
import { DesktopNav } from "@/components/NavBar";
import { BottomTabBar } from "@/components/BottomTabBar";
import { QuickAddFab } from "@/components/QuickAddFab";
import { AffordTrigger } from "@/components/AffordTrigger";
import { AchievementToastHost } from "@/components/AchievementToastHost";
import { Database } from "lucide-react";

const chipBase =
  "inline-flex items-center px-2 py-0.5 rounded-full font-mono bg-surface/70 border border-border text-muted shadow-sm";

export function AppShell({ children }: Readonly<{ children: React.ReactNode }>) {
  const { dataset, hasAnalysis, normalized } = useAppStore();

  return (
    <div className="min-h-dvh flex flex-col">
      <header className="sticky top-0 z-20 border-b border-border/60 bg-[color-mix(in_oklab,var(--surface)_78%,transparent)] backdrop-blur-2xl">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 py-3 flex items-center justify-between gap-3">
          <Link href="/saldo" className="flex items-center gap-2 shrink-0">
            <Image
              src="/logo.png"
              alt=""
              width={28}
              height={28}
              priority
              className="rounded-[7px] shadow-sm"
            />
            <span className="font-semibold tracking-tight text-sm hidden sm:inline">
              Saldo Real
            </span>
          </Link>

          <DesktopNav />

          <div className="flex items-center gap-2 shrink-0">
            <SetupIndicator />
            <BudgetAlertWidget />
            <CloudSyncReminder />
            <BackupReminder />
            {hasAnalysis && (
              <span
                className={clsx(chipBase, "hidden lg:inline-flex gap-1")}
              >
                <Database size={11} />
                {dataset.sources.length}f · {normalized.length}L
              </span>
            )}
          </div>
        </div>
      </header>

      <main className="flex-1 mx-auto w-full max-w-7xl px-4 sm:px-6 py-5 sm:py-6">
        {children}
      </main>

      <AppFooter />
      <QuickAddFab />
      <AffordTrigger />
      <BottomTabBar />
      <AchievementToastHost />
    </div>
  );
}
