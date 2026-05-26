"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useAppStore } from "@/lib/store";
import { SetupIndicator, Saldo30Widget } from "@/components/HeaderWidgets";
import { QuickAddFab } from "@/components/QuickAddFab";
import clsx from "clsx";
import { ChevronDown, Database, Wallet } from "lucide-react";

const MAIN_NAV = [
  { href: "/saldo", label: "Saldo" },
  { href: "/dashboard", label: "Análise" },
  { href: "/recorrentes", label: "Recorrentes" },
] as const;

const CONFIG_LINKS = [
  { href: "/config?tab=importar", label: "Importar" },
  { href: "/config?tab=classificacao", label: "Classificação" },
  { href: "/config?tab=contas", label: "Contas" },
] as const;

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
  const [configOpen, setConfigOpen] = useState(false);
  const configRef = useRef<HTMLDivElement>(null);

  const isActive = (href: string) =>
    href === "/"
      ? path === "/"
      : path === href || path.startsWith(href + "/");

  const configActive =
    path === "/config" || path.startsWith("/config/") || path === "/regras";

  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (
        configRef.current &&
        !configRef.current.contains(e.target as Node)
      ) {
        setConfigOpen(false);
      }
    }
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

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

          <nav className="hidden sm:flex items-center gap-0 min-w-0 overflow-x-auto">
            {MAIN_NAV.map((n) => (
              <NavLink
                key={n.href}
                href={n.href}
                label={n.label}
                active={isActive(n.href)}
              />
            ))}
            <div className="relative" ref={configRef}>
              <button
                type="button"
                className={clsx(
                  "px-3 py-1 text-sm border-b-2 -mb-px transition-colors whitespace-nowrap inline-flex items-center gap-1",
                  configActive
                    ? "border-[var(--foreground)] text-[var(--foreground)] font-medium"
                    : "border-transparent subtle hover:text-[var(--foreground)]",
                )}
                onClick={() => setConfigOpen((o) => !o)}
                aria-expanded={configOpen}
                aria-haspopup="true"
              >
                Configurações
                <ChevronDown size={14} />
              </button>
              {configOpen && (
                <div className="absolute right-0 top-full mt-1 py-1 min-w-[180px] panel shadow-lg z-30">
                  {CONFIG_LINKS.map((l) => (
                    <Link
                      key={l.href}
                      href={l.href}
                      className="block px-3 py-2 text-sm hover:bg-[var(--surface-2)]"
                      onClick={() => setConfigOpen(false)}
                    >
                      {l.label}
                    </Link>
                  ))}
                  <Link
                    href="/config"
                    className="block px-3 py-2 text-xs subtle border-t border-[var(--border)] hover:bg-[var(--surface-2)]"
                    onClick={() => setConfigOpen(false)}
                  >
                    Ver todas…
                  </Link>
                </div>
              )}
            </div>
          </nav>

          <div className="flex items-center gap-2 shrink-0">
            <SetupIndicator />
            <Saldo30Widget />
            {hasAnalysis && (
              <span className="chip hidden lg:inline-flex items-center gap-1">
                <Database size={11} />
                {dataset.sources.length}f · {normalized.length}L
              </span>
            )}
          </div>
        </div>

        <nav className="sm:hidden flex items-center gap-0 px-4 pb-0 overflow-x-auto border-t border-[var(--border)]">
          {MAIN_NAV.map((n) => (
            <NavLink
              key={n.href}
              href={n.href}
              label={n.label}
              active={isActive(n.href)}
            />
          ))}
          <NavLink
            href="/config"
            label="Config"
            active={configActive}
          />
        </nav>
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
