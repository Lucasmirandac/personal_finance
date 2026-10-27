"use client";

import { useEffect } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import {
  markConsentGrantPending,
  setConsent,
  useConsent,
} from "@/lib/consent";

export function ConsentBanner() {
  const status = useConsent();

  useEffect(() => {
    if (status !== "unset") return;
    document.documentElement.setAttribute("data-consent-banner", "1");
    return () => document.documentElement.removeAttribute("data-consent-banner");
  }, [status]);

  if (status !== "unset") return null;

  function accept() {
    markConsentGrantPending();
    setConsent("granted");
  }

  function decline() {
    setConsent("revoked");
  }

  return (
    <div
      role="dialog"
      aria-labelledby="consent-banner-title"
      aria-describedby="consent-banner-desc"
      className="fixed inset-x-0 bottom-16 z-50 border-t border-border bg-surface/95 p-4 shadow-[0_-8px_24px_rgba(0,0,0,0.08)] backdrop-blur-sm sm:bottom-0 sm:p-5"
    >
      <div className="mx-auto flex max-w-7xl flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-1.5 pr-0 sm:pr-6">
          <p
            id="consent-banner-title"
            className="text-sm font-medium text-foreground"
          >
            Métricas anônimas de uso
          </p>
          <p id="consent-banner-desc" className="text-xs leading-relaxed text-muted">
            Se aceitar, enviamos só visitas de tela e passos concluídos — sem
            saldo, valor ou descrição. Recusar não muda o app.{" "}
            <Link
              href="/privacidade#metricas"
              className="underline underline-offset-2 hover:text-foreground"
            >
              Ler a política de privacidade
            </Link>
          </p>
        </div>
        <div className="flex shrink-0 flex-wrap gap-2">
          <Button className="min-h-11" onClick={decline}>
            Continuar sem coletar
          </Button>
          <Button variant="primary" className="min-h-11" onClick={accept}>
            Aceitar
          </Button>
        </div>
      </div>
    </div>
  );
}
