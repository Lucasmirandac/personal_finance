"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import clsx from "clsx";
import { ChevronDown } from "lucide-react";
import { Panel } from "@/components/ui/Panel";

export const MAIN_NAV = [
  { href: "/saldo", label: "Hoje" },
  { href: "/futuro", label: "Futuro" },
  { href: "/divisor", label: "Divisor" },
  { href: "/dashboard", label: "Análise" },
  { href: "/recorrentes", label: "Recorrentes" },
] as const;

export const CONFIG_LINKS = [
  { href: "/config?tab=importar", label: "Importar" },
  { href: "/config?tab=classificacao", label: "Classificação" },
  { href: "/config?tab=contas", label: "Contas" },
  { href: "/config?tab=backup", label: "Backup" },
  { href: "/config?tab=orcamentos", label: "Orçamentos" },
] as const;

function useActiveMatcher() {
  const path = usePathname();
  return {
    isActive: (href: string) =>
      href === "/" ? path === "/" : path === href || path.startsWith(href + "/"),
    configActive:
      path === "/config" || path.startsWith("/config/") || path === "/regras",
  };
}

type NavLinkProps = {
  href: string;
  label: string;
  active: boolean;
  onClick?: () => void;
};

function NavLink({ href, label, active, onClick }: Readonly<NavLinkProps>) {
  return (
    <Link
      href={href}
      onClick={onClick}
      className={clsx(
        "px-3 py-1.5 text-sm rounded-full transition-colors whitespace-nowrap",
        active
          ? "bg-foreground text-surface font-medium shadow-sm"
          : "text-muted hover:bg-surface-2 hover:text-[var(--foreground)]",
      )}
    >
      {label}
    </Link>
  );
}

function ConfigMenu({ active }: Readonly<{ active: boolean }>) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onDocClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onDocClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDocClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        className={clsx(
          "px-3 py-1.5 text-sm rounded-full transition-colors whitespace-nowrap inline-flex items-center gap-1",
          active
            ? "bg-foreground text-surface font-medium shadow-sm"
            : "text-muted hover:bg-surface-2 hover:text-[var(--foreground)]",
        )}
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-haspopup="true"
      >
        Configurações
        <ChevronDown size={14} />
      </button>
      {open && (
        <Panel
          role="menu"
          className="absolute right-0 top-full mt-2 py-1 min-w-[200px] rounded-2xl shadow-[var(--shadow-card-lg)] z-40"
        >
          {CONFIG_LINKS.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              role="menuitem"
              className="block px-3 py-2 text-sm hover:bg-[var(--surface-2)]"
              onClick={() => setOpen(false)}
            >
              {l.label}
            </Link>
          ))}
          <Link
            href="/config"
            role="menuitem"
            className="block px-3 py-2 text-xs text-muted border-t border-border hover:bg-[var(--surface-2)]"
            onClick={() => setOpen(false)}
          >
            Ver todas…
          </Link>
        </Panel>
      )}
    </div>
  );
}

export function DesktopNav() {
  const { isActive, configActive } = useActiveMatcher();

  return (
    <nav className="hidden sm:flex items-center gap-1 min-w-0 rounded-full bg-surface/70 p-1 ring-1 ring-border/70">
      {MAIN_NAV.map((n) => (
        <NavLink
          key={n.href}
          href={n.href}
          label={n.label}
          active={isActive(n.href)}
        />
      ))}
      <ConfigMenu active={configActive} />
    </nav>
  );
}

export function MobileNav() {
  const { isActive, configActive } = useActiveMatcher();

  return (
    <nav className="no-scrollbar sm:hidden flex items-center gap-1 px-4 py-2 overflow-x-auto overflow-y-hidden border-t border-border">
      {MAIN_NAV.map((n) => (
        <NavLink
          key={n.href}
          href={n.href}
          label={n.label}
          active={isActive(n.href)}
        />
      ))}
      <NavLink href="/config" label="Config" active={configActive} />
    </nav>
  );
}
