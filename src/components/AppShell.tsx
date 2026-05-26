"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAppStore } from "@/lib/store";
import clsx from "clsx";
import { Database, Wallet } from "lucide-react";

const NAV = [
  { href: "/", label: "Importar" },
  { href: "/dashboard", label: "Dashboard" },
  { href: "/transacoes", label: "Transações" },
  { href: "/recorrentes", label: "Recorrentes" },
  { href: "/regras", label: "Regras" },
];

function NavLink({
  href,
  label,
  active,
}: {
  href: string;
  label: string;
  active: boolean;
}) {
  return (
    <Link
      href={href}
      className={clsx(
        "px-3 py-1 text-sm border-b-2 -mb-px transition-colors whitespace-nowrap",
        active
          ? "border-[var(--foreground)] text-[var(--foreground)] font-medium"
          : "border-transparent subtle hover:text-[var(--foreground)]",
      )}
    >
      {label}
    </Link>
  );
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const path = usePathname();
  const { dataset, hasAnalysis, normalized } = useAppStore();

  const isActive = (href: string) =>
    href === "/"
      ? path === "/"
      : path === href || path.startsWith(href + "/");

  return (
    <div className="min-h-dvh flex flex-col">
      <header className="border-b border-[var(--border)] bg-[var(--surface)]/95 backdrop-blur sticky top-0 z-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 py-2 flex items-center justify-between gap-3">
          <Link href="/" className="flex items-center gap-2 shrink-0">
            <span className="inline-flex w-7 h-7 items-center justify-center rounded-md bg-[var(--foreground)] text-[var(--surface)]">
              <Wallet size={15} strokeWidth={2.25} />
            </span>
            <span className="font-semibold text-sm hidden sm:inline">
              Finanças
            </span>
          </Link>

          <nav className="hidden sm:flex items-center gap-0 min-w-0 overflow-x-auto">
            {NAV.map((n) => (
              <NavLink
                key={n.href}
                href={n.href}
                label={n.label}
                active={isActive(n.href)}
              />
            ))}
          </nav>

          {hasAnalysis && (
            <span className="chip hidden md:inline-flex items-center gap-1 shrink-0">
              <Database size={11} />
              {dataset.sources.length}f · {normalized.length}L
            </span>
          )}
        </div>

        <nav className="sm:hidden flex items-center gap-0 px-4 pb-0 overflow-x-auto border-t border-[var(--border)]">
          {NAV.map((n) => (
            <NavLink
              key={n.href}
              href={n.href}
              label={n.label}
              active={isActive(n.href)}
            />
          ))}
        </nav>
      </header>

      <main className="flex-1 mx-auto w-full max-w-7xl px-4 sm:px-6 py-4">
        {children}
      </main>

      <footer className="mx-auto w-full max-w-7xl px-4 sm:px-6 py-3 text-[11px] subtle border-t border-[var(--border)]">
        Dados processados no navegador. Nada é enviado para servidores.
      </footer>
    </div>
  );
}
