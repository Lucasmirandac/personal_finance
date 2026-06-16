"use client";

import { useEffect, useRef } from "react";
import { X } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { DrawerBackdrop } from "@/components/ui/Drawer";
import { Num } from "@/components/ui/Num";
import { SupportLink } from "@/components/SupportLink";
import { formatBRL } from "@/lib/format";
import { useFocusTrap } from "@/lib/hooks/useFocusTrap";

type Props = {
  open: boolean;
  monthLabel: string;
  sobra: number;
  supporterConfirmed: boolean;
  onConfirmSupporter: () => void;
  onClose: () => void;
};

export function MonthCloseCelebrateModal({
  open,
  monthLabel,
  sobra,
  supporterConfirmed,
  onConfirmSupporter,
  onClose,
}: Readonly<Props>) {
  const dialogRef = useRef<HTMLDialogElement>(null);

  useFocusTrap(open, dialogRef);

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    globalThis.addEventListener("keydown", onKey);
    return () => globalThis.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <>
      <DrawerBackdrop onClick={onClose} aria-hidden />
      <dialog
        ref={dialogRef}
        open
        aria-labelledby="month-close-celebrate-title"
        className="fixed inset-0 z-50 m-0 flex h-full w-full max-w-none items-center justify-center bg-transparent p-4 text-foreground"
      >
        <div className="w-full max-w-md rounded-2xl bg-surface p-5 shadow-xl ring-1 ring-border/60">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-caption uppercase tracking-wider text-success">
                Mês fechado
              </p>
              <h2
                id="month-close-celebrate-title"
                className="mt-1 text-lg font-semibold tracking-tight"
              >
                {monthLabel} terminou com sobra.
              </h2>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg p-1 text-muted hover:text-foreground"
              aria-label="Fechar"
            >
              <X className="size-4" />
            </button>
          </div>

          <p className="mt-4 text-3xl font-semibold tracking-tight text-success">
            <Num className="font-mono tabular-nums num-display">
              {formatBRL(sobra)}
            </Num>
          </p>
          <p className="mt-2 text-sm text-muted leading-relaxed">
            Continue assim — e, se o app te ajuda, saiba que existe apoio
            opcional no APOIA.se. O Saldo Real continua gratuito.
          </p>

          {!supporterConfirmed && (
            <div className="mt-4 rounded-2xl bg-surface-2/70 p-3">
              <p className="text-xs text-muted leading-relaxed">
                Já apoia? Confirme neste dispositivo para desbloquear a
                conquista Apoiador Real.
              </p>
              <Button
                variant="ghost"
                size="sm"
                className="mt-2 rounded-full text-xs"
                onClick={onConfirmSupporter}
              >
                Confirmo que contribuí no APOIA.se
              </Button>
            </div>
          )}

          <div className="mt-5 flex flex-wrap justify-end gap-2">
            <Button variant="ghost" size="sm" onClick={onClose}>
              Fechar
            </Button>
            <SupportLink
              surface="month_close_celebrate"
              className="inline-flex items-center justify-center rounded-full bg-foreground px-4 py-2 text-sm font-medium text-surface transition-opacity hover:opacity-90"
            >
              Apoiar no APOIA.se
            </SupportLink>
          </div>
        </div>
      </dialog>
    </>
  );
}
