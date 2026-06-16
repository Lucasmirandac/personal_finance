"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import clsx from "clsx";
import {
  House,
  ReceiptText,
  TrendingUp,
  Ellipsis,
  Plus,
  CreditCard,
  Scale,
  ChartColumnBig,
  Settings,
  X,
  type LucideIcon,
} from "lucide-react";
import { useAppStore } from "@/lib/store";
import { dispatchOpenQuickAdd } from "@/components/AffordTrigger";
import { MAIN_NAV, CONFIG_LINKS } from "@/components/NavBar";
import { DrawerBackdrop } from "@/components/ui/Drawer";
import { useFocusTrap } from "@/lib/hooks/useFocusTrap";

const PRIMARY: ReadonlyArray<{ href: string; label: string; Icon: LucideIcon }> = [
  { href: "/saldo", label: "Hoje", Icon: House },
  { href: "/extrato", label: "Extrato", Icon: ReceiptText },
  { href: "/futuro", label: "Futuro", Icon: TrendingUp },
];

const PINNED_HREFS = new Set(PRIMARY.map((item) => item.href));

const MORE_ICONS: Record<string, LucideIcon> = {
  "/faturas": CreditCard,
  "/divisor": Scale,
  "/dashboard": ChartColumnBig,
};

// Routes reachable only through the "Mais" sheet — used to highlight that tab.
const MORE_PREFIXES = ["/faturas", "/divisor", "/dashboard", "/config", "/recorrentes", "/transacoes", "/regras"];

function isActivePath(path: string, href: string): boolean {
  return path === href || path.startsWith(href + "/");
}

const tabClass =
  "flex flex-1 flex-col items-center justify-center gap-0.5 py-2 text-[11px] font-medium transition-colors";

export function BottomTabBar() {
  const { hasAnalysis, accounts } = useAppStore();
  const path = usePathname();
  const [moreOpen, setMoreOpen] = useState(false);
  const sheetRef = useRef<HTMLDivElement>(null);

  const quickAddReady = hasAnalysis && accounts.length > 0;
  const moreActive = MORE_PREFIXES.some((prefix) => isActivePath(path, prefix));

  const extraNav = MAIN_NAV.filter((item) => !PINNED_HREFS.has(item.href));

  useFocusTrap(moreOpen, sheetRef);

  useEffect(() => {
    if (!moreOpen) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setMoreOpen(false);
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [moreOpen]);

  // Close the sheet whenever the route changes.
  useEffect(() => {
    setMoreOpen(false);
  }, [path]);

  return (
    <>
      <nav
        aria-label="Navegação principal"
        className="sm:hidden fixed inset-x-0 bottom-0 z-40 border-t border-border/60 bg-[color-mix(in_oklab,var(--surface)_88%,transparent)] backdrop-blur-2xl pb-[env(safe-area-inset-bottom)]"
      >
        <ul className="flex items-stretch justify-around">
          {PRIMARY.slice(0, 2).map(({ href, label, Icon }) => {
            const active = isActivePath(path, href);
            return (
              <li key={href} className="flex flex-1">
                <Link
                  href={href}
                  aria-current={active ? "page" : undefined}
                  className={clsx(tabClass, active ? "text-foreground" : "text-muted")}
                >
                  <Icon size={20} strokeWidth={active ? 2.4 : 2} />
                  <span>{label}</span>
                </Link>
              </li>
            );
          })}

          {quickAddReady && (
            <li className="flex flex-1 justify-center">
              <button
                type="button"
                onClick={() => dispatchOpenQuickAdd(null)}
                aria-label="Adicionar transação"
                className="flex flex-col items-center justify-end pb-2"
              >
                <span className="-mt-5 flex h-12 w-12 items-center justify-center rounded-full bg-[var(--foreground)] text-[var(--surface)] shadow-lg">
                  <Plus size={24} strokeWidth={2.5} />
                </span>
              </button>
            </li>
          )}

          {PRIMARY.slice(2).map(({ href, label, Icon }) => {
            const active = isActivePath(path, href);
            return (
              <li key={href} className="flex flex-1">
                <Link
                  href={href}
                  aria-current={active ? "page" : undefined}
                  className={clsx(tabClass, active ? "text-foreground" : "text-muted")}
                >
                  <Icon size={20} strokeWidth={active ? 2.4 : 2} />
                  <span>{label}</span>
                </Link>
              </li>
            );
          })}

          <li className="flex flex-1">
            <button
              type="button"
              onClick={() => setMoreOpen(true)}
              aria-haspopup="dialog"
              aria-expanded={moreOpen}
              className={clsx(tabClass, "w-full", moreActive ? "text-foreground" : "text-muted")}
            >
              <Ellipsis size={20} strokeWidth={moreActive ? 2.4 : 2} />
              <span>Mais</span>
            </button>
          </li>
        </ul>
      </nav>

      {moreOpen && (
        <DrawerBackdrop className="sm:hidden" onClick={() => setMoreOpen(false)}>
          <div
            ref={sheetRef}
            role="dialog"
            aria-modal="true"
            aria-label="Mais opções"
            onClick={(e) => e.stopPropagation()}
            className="fixed inset-x-0 bottom-0 z-50 max-h-[82dvh] overflow-auto rounded-t-3xl border-t border-border bg-surface px-4 pt-4 pb-[max(1rem,env(safe-area-inset-bottom))] shadow-[var(--shadow-card-lg)]"
          >
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-sm font-semibold tracking-tight">Mais opções</h2>
              <button
                type="button"
                onClick={() => setMoreOpen(false)}
                aria-label="Fechar"
                className="rounded-full p-1.5 text-muted hover:bg-surface-2 hover:text-[var(--foreground)]"
              >
                <X size={18} />
              </button>
            </div>

            {extraNav.length > 0 && (
              <>
                <p className="mb-2 text-[10px] uppercase tracking-[0.18em] text-muted">Ir para</p>
                <div className="mb-4 grid grid-cols-3 gap-2">
                  {extraNav.map(({ href, label }) => {
                    const Icon = MORE_ICONS[href] ?? Ellipsis;
                    const active = isActivePath(path, href);
                    return (
                      <Link
                        key={href}
                        href={href}
                        aria-current={active ? "page" : undefined}
                        className={clsx(
                          "flex flex-col items-center justify-center gap-1.5 rounded-2xl border px-2 py-3 text-xs font-medium transition-colors",
                          active
                            ? "border-foreground/40 bg-surface-2 text-foreground"
                            : "border-border bg-surface text-muted hover:bg-surface-2",
                        )}
                      >
                        <Icon size={20} strokeWidth={2} />
                        <span>{label}</span>
                      </Link>
                    );
                  })}
                </div>
              </>
            )}

            <p className="mb-2 flex items-center gap-1.5 text-[10px] uppercase tracking-[0.18em] text-muted">
              <Settings size={12} />
              Gerenciar
            </p>
            <div className="grid grid-cols-2 gap-2">
              {CONFIG_LINKS.map(({ href, label }) => (
                <Link
                  key={href}
                  href={href}
                  className="rounded-xl border border-border bg-surface px-3 py-2.5 text-sm text-[var(--foreground)] transition-colors hover:bg-surface-2"
                >
                  {label}
                </Link>
              ))}
            </div>
          </div>
        </DrawerBackdrop>
      )}
    </>
  );
}
