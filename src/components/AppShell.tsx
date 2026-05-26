"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAppStore } from "@/lib/store";
import clsx from "clsx";

const NAV = [
  { href: "/", label: "Importar" },
  { href: "/dashboard", label: "Dashboard" },
  { href: "/transacoes", label: "Transações" },
  { href: "/regras", label: "Regras" },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const path = usePathname();
  const { dataset, normalized } = useAppStore();

  return (
    <div className="min-h-dvh flex flex-col">
      <header className="border-b border-[var(--border)] bg-[var(--surface)]/80 backdrop-blur sticky top-0 z-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 py-3 flex items-center justify-between gap-4">
          <Link href="/" className="flex items-center gap-2">
            <span className="inline-flex w-8 h-8 items-center justify-center rounded-lg bg-[var(--accent)] text-white font-semibold">
              $
            </span>
            <div className="flex flex-col leading-tight">
              <span className="font-semibold">Dashboard de Gastos</span>
              <span className="text-xs subtle">CSV local · privado</span>
            </div>
          </Link>
          <nav className="hidden sm:flex items-center gap-1">
            {NAV.map((n) => {
              const active =
                n.href === "/"
                  ? path === "/"
                  : path === n.href || path.startsWith(n.href + "/");
              return (
                <Link
                  key={n.href}
                  href={n.href}
                  className={clsx(
                    "px-3 py-1.5 rounded-lg text-sm transition-colors",
                    active
                      ? "bg-[var(--surface-2)] text-[var(--foreground)] font-medium"
                      : "subtle hover:bg-[var(--surface-2)]",
                  )}
                >
                  {n.label}
                </Link>
              );
            })}
          </nav>
          <div className="text-right text-xs subtle hidden md:block">
            {dataset
              ? `${dataset.fileName} · ${normalized.length} linhas`
              : "Nenhum dataset carregado"}
          </div>
        </div>
        <nav className="sm:hidden flex items-center gap-1 px-4 pb-2 overflow-x-auto">
          {NAV.map((n) => {
            const active =
              n.href === "/"
                ? path === "/"
                : path === n.href || path.startsWith(n.href + "/");
            return (
              <Link
                key={n.href}
                href={n.href}
                className={clsx(
                  "px-3 py-1.5 rounded-lg text-sm whitespace-nowrap",
                  active
                    ? "bg-[var(--surface-2)] text-[var(--foreground)] font-medium"
                    : "subtle hover:bg-[var(--surface-2)]",
                )}
              >
                {n.label}
              </Link>
            );
          })}
        </nav>
      </header>
      <main className="flex-1 mx-auto w-full max-w-7xl px-4 sm:px-6 py-6">
        {children}
      </main>
      <footer className="mx-auto w-full max-w-7xl px-4 sm:px-6 py-6 text-xs subtle">
        Dados processados 100% no seu navegador. Nada é enviado para servidores.
      </footer>
    </div>
  );
}
