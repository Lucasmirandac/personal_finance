"use client";

import { useState } from "react";
import { Bug } from "lucide-react";
import { BugReportModal } from "@/components/BugReportModal";
import { Button } from "@/components/ui/Button";

export function AppFooter() {
  const [bugReportOpen, setBugReportOpen] = useState(false);

  return (
    <>
      <footer className="mx-auto w-full max-w-7xl px-4 sm:px-6 py-3 text-[11px] text-muted border-t border-border">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p>Dados processados no navegador. Nada é enviado para servidores.</p>
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
