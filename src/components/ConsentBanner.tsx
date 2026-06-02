"use client";

import Link from "next/link";
import { Button } from "@/components/ui/Button";
import {
  markConsentGrantPending,
  setConsent,
  useConsent,
} from "@/lib/consent";

export function ConsentBanner() {
  const status = useConsent();

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
      className="fixed inset-x-0 bottom-0 z-50 border-t border-border bg-surface/95 backdrop-blur-sm p-4 sm:p-5 shadow-[0_-8px_24px_rgba(0,0,0,0.08)]"
    >
      <div className="mx-auto flex max-w-7xl flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-1.5 pr-0 sm:pr-6">
          <p
            id="consent-banner-title"
            className="text-sm font-medium text-foreground"
          >
            Métricas anônimas de uso
          </p>
          <p id="consent-banner-desc" className="text-xs text-muted leading-relaxed">
            Para nos ajudar a melhorar o Saldo Real, podemos coletar métricas
            anônimas de uso (telas visitadas, importações concluídas) via Google
            Analytics. Nenhum dado financeiro, valor ou descrição de transação é
            enviado.{" "}
            <Link
              href="/config?tab=privacidade"
              className="underline underline-offset-2 hover:text-foreground"
            >
              Saber mais
            </Link>
          </p>
        </div>
        <div className="flex shrink-0 flex-wrap gap-2">
          <Button variant="ghost" size="sm" onClick={decline}>
            Continuar sem coletar
          </Button>
          <Button variant="primary" size="sm" onClick={accept}>
            Aceitar
          </Button>
        </div>
      </div>
    </div>
  );
}
