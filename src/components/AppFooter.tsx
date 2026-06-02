"use client";

import { useState } from "react";
import Link from "next/link";
import { Bug } from "lucide-react";
import { BugReportModal } from "@/components/BugReportModal";
import { Button } from "@/components/ui/Button";
import { useConsent } from "@/lib/consent";

export function AppFooter() {
  const [bugReportOpen, setBugReportOpen] = useState(false);
  const consent = useConsent();

  return (
    <>
      <footer className="mx-auto w-full max-w-7xl px-4 sm:px-6 py-3 text-[11px] text-muted border-t border-border">
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
          <Button
            variant="ghost"
            size="sm"
            className="rounded-full text-[11px]"
            aria-label="Reportar bug por e-mail"
            onClick={() => setBugReportOpen(true)}
          >
            <Bug size={13} />
            Reportar bug
          </Button>
        </div>
      </footer>

      <BugReportModal
        open={bugReportOpen}
        onClose={() => setBugReportOpen(false)}
      />
    </>
  );
}
