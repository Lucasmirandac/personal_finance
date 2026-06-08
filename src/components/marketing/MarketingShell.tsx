"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import clsx from "clsx";
import { MarketingPageTracker } from "@/components/marketing/MarketingPageTracker";
import type { MarketingPageId } from "@/lib/marketing/site";

const NAV = [
  { href: "/ferramentas/limite-diario", label: "Limite diário" },
  { href: "/ferramentas/posso-comprar", label: "Posso comprar?" },
  { href: "/guias/importar-nubank", label: "Guia Nubank" },
  { href: "/guias/importar-inter", label: "Guia Inter" },
] as const;

type Props = {
  pageId?: MarketingPageId;
  children: React.ReactNode;
};

export function MarketingShell({ pageId, children }: Readonly<Props>) {
  const pathname = usePathname();

  return (
    <div className="min-h-dvh flex flex-col">
      {pageId && <MarketingPageTracker pageId={pageId} />}
      <header className="border-b border-border/60 bg-[color-mix(in_oklab,var(--surface)_82%,transparent)] backdrop-blur-xl">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-4 py-4 sm:px-6">
          <Link href="/" className="flex items-center gap-2.5 shrink-0">
            <Image
              src="/logo.png"
              alt=""
              width={32}
              height={32}
              className="rounded-lg shadow-sm"
            />
            <span className="font-semibold tracking-tight text-base">
              Saldo Real
            </span>
          </Link>
          <nav className="hidden md:flex items-center gap-1">
            {NAV.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={clsx(
                  "rounded-full px-3 py-1.5 text-sm transition-colors",
                  pathname === item.href
                    ? "bg-foreground text-surface font-medium"
                    : "text-muted hover:text-foreground hover:bg-surface-2",
                )}
              >
                {item.label}
              </Link>
            ))}
          </nav>
          <MarketingCtaLink
            href="/comecar"
            pageId={pageId ?? "landing"}
            cta="comecar"
            variant="primary"
            className="shrink-0"
          >
            Abrir app
          </MarketingCtaLink>
        </div>
      </header>

      <main className="flex-1">{children}</main>

      <footer className="border-t border-border/60 bg-surface/50">
        <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
          <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
            <div>
              <p className="font-semibold">Saldo Real</p>
              <p className="mt-2 text-sm text-muted leading-relaxed">
                Finanças pessoais locais e privadas. Seus dados ficam no
                navegador — sem cadastro, sem nuvem.
              </p>
            </div>
            <div>
              <p className="text-caption font-semibold uppercase tracking-wider text-muted">
                Ferramentas
              </p>
              <ul className="mt-3 space-y-2 text-sm">
                <li>
                  <Link href="/ferramentas/limite-diario" className="hover:text-accent">
                    Calculadora de limite diário
                  </Link>
                </li>
                <li>
                  <Link href="/ferramentas/posso-comprar" className="hover:text-accent">
                    Simulador posso comprar?
                  </Link>
                </li>
              </ul>
            </div>
            <div>
              <p className="text-caption font-semibold uppercase tracking-wider text-muted">
                Guias
              </p>
              <ul className="mt-3 space-y-2 text-sm">
                <li>
                  <Link href="/guias/importar-nubank" className="hover:text-accent">
                    Importar CSV Nubank
                  </Link>
                </li>
                <li>
                  <Link href="/guias/importar-inter" className="hover:text-accent">
                    Importar CSV Inter
                  </Link>
                </li>
                <li>
                  <Link href="/comecar" className="hover:text-accent">
                    Começar no app
                  </Link>
                </li>
              </ul>
            </div>
          </div>
          <p className="mt-8 text-caption text-muted">
            © {new Date().getFullYear()} Saldo Real · Cálculos locais, nada é enviado
            ao servidor.
          </p>
        </div>
      </footer>
    </div>
  );
}

type CtaProps = {
  href: string;
  pageId: MarketingPageId;
  cta: "comecar" | "ferramenta" | "guia";
  variant?: "primary" | "secondary";
  className?: string;
  children: React.ReactNode;
};

export function MarketingCtaLink({
  href,
  pageId,
  cta,
  variant = "secondary",
  className,
  children,
}: Readonly<CtaProps>) {
  return (
    <Link
      href={href}
      onClick={() => {
        void import("@/lib/analytics").then(({ trackEvent }) =>
          trackEvent({ name: "marketing_cta_clicked", page: pageId, cta }),
        );
      }}
      className={clsx(
        "inline-flex items-center justify-center rounded-full px-4 py-2 text-sm font-medium transition-opacity",
        variant === "primary"
          ? "bg-foreground text-surface hover:opacity-90"
          : "border border-border bg-surface hover:bg-surface-2",
        className,
      )}
    >
      {children}
    </Link>
  );
}
