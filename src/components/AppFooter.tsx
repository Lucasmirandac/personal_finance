"use client";

import { useState } from "react";
import Link from "next/link";
import { Bug } from "lucide-react";
import { BugReportModal } from "@/components/BugReportModal";
import { SupportLink } from "@/components/SupportLink";
import { Button } from "@/components/ui/Button";
import { useConsent } from "@/lib/consent";

export function AppFooter() {
  const [bugReportOpen, setBugReportOpen] = useState(false);
  const consent = useConsent();

  return (
    <>
      <footer className="mx-auto w-full max-w-7xl px-4 sm:px-6 pt-3 pb-24 sm:py-3 text-caption text-muted border-t border-border">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p>
            Dados financeiros processados apenas no navegador.
            {consent === "granted" && (
              <>
                {" "}
                · Métricas anônimas: ativadas (
                <Link
                  href="/config?tab=privacidade"
                  className="underline underline-offset-2 hover:text-foreground"
                >
                  gerenciar
                </Link>
                )
              </>
            )}
          </p>
          <div className="flex flex-wrap items-center gap-2">
            <SupportLink
              surface="app_footer"
              className="inline-flex items-center justify-center rounded-full px-3 py-1.5 text-caption font-medium hover:bg-surface-2 hover:text-foreground"
            >
              Apoiar o projeto
            </SupportLink>
            <Button
              variant="ghost"
              size="sm"
              className="rounded-full text-caption"
              aria-label="Reportar bug por e-mail"
              onClick={() => setBugReportOpen(true)}
            >
              <Bug size={13} />
              Reportar bug
            </Button>
          </div>
        </div>
      </footer>

      <BugReportModal
        open={bugReportOpen}
        onClose={() => setBugReportOpen(false)}
      />
    </>
  );
}
