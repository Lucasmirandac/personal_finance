"use client";

import Link from "next/link";
import { useAppStore } from "@/lib/store";
import {
  BackupReminder,
  BudgetAlertWidget,
  SetupIndicator,
  Saldo30Widget,
} from "@/components/HeaderWidgets";
import { DesktopNav, MobileNav } from "@/components/NavBar";
import { QuickAddFab } from "@/components/QuickAddFab";
import { Database, Wallet } from "lucide-react";

export function AppShell({ children }: { children: React.ReactNode }) {
  const { dataset, hasAnalysis, normalized } = useAppStore();

  return (
    <div className="min-h-dvh flex flex-col">
      <header className="border-b border-[var(--border)] bg-[var(--surface)]/95 backdrop-blur sticky top-0 z-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 py-2 flex items-center justify-between gap-3">
          <Link href="/saldo" className="flex items-center gap-2 shrink-0">
            <span className="inline-flex w-7 h-7 items-center justify-center rounded-md bg-[var(--foreground)] text-[var(--surface)]">
              <Wallet size={15} strokeWidth={2.25} />
            </span>
            <span className="font-semibold text-sm hidden sm:inline">
              Finanças
            </span>
          </Link>

          <DesktopNav />

          <div className="flex items-center gap-2 shrink-0">
            <SetupIndicator />
            <BudgetAlertWidget />
            <BackupReminder />
            <Saldo30Widget />
            {hasAnalysis && (
              <span className="chip hidden lg:inline-flex items-center gap-1">
                <Database size={11} />
                {dataset.sources.length}f · {normalized.length}L
              </span>
            )}
          </div>
        </div>

        <MobileNav />
      </header>

      <main className="flex-1 mx-auto w-full max-w-7xl px-4 sm:px-6 py-4">
        {children}
      </main>

      <footer className="mx-auto w-full max-w-7xl px-4 sm:px-6 py-3 text-[11px] subtle border-t border-[var(--border)]">
        Dados processados no navegador. Nada é enviado para servidores.
      </footer>
      <QuickAddFab />
    </div>
  );
}
