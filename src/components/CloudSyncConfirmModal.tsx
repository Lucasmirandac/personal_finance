"use client";

import { useEffect, useRef, useState } from "react";
import clsx from "clsx";
import { useFocusTrap } from "@/lib/hooks/useFocusTrap";
import { Button } from "@/components/ui/Button";
import { DrawerBackdrop } from "@/components/ui/Drawer";
import { X } from "lucide-react";

type Props = {
  open: boolean;
  title: string;
  description: React.ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  confirmVariant?: "primary" | "default" | "ghost";
  requireAcknowledge?: boolean;
  acknowledgeLabel?: string;
  busy?: boolean;
  onConfirm: () => void;
  onClose: () => void;
};

export function CloudSyncConfirmModal({
  open,
  title,
  description,
  confirmLabel = "Confirmar",
  cancelLabel = "Cancelar",
  confirmVariant = "primary",
  requireAcknowledge = false,
  acknowledgeLabel = "Entendo",
  busy = false,
  onConfirm,
  onClose,
}: Props) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const [acknowledged, setAcknowledged] = useState(false);

  useFocusTrap(open, dialogRef);

  useEffect(() => {
    if (!open) setAcknowledged(false);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  const canConfirm = !requireAcknowledge || acknowledged;

  return (
    <>
      <DrawerBackdrop onClick={onClose} aria-hidden />
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="cloud-sync-confirm-title"
        className="fixed inset-0 z-50 flex items-center justify-center p-4"
      >
        <div className="w-full max-w-md rounded-2xl bg-surface ring-1 ring-border/60 shadow-xl p-5 space-y-4">
          <div className="flex items-start justify-between gap-3">
            <h2
              id="cloud-sync-confirm-title"
              className="text-sm font-semibold tracking-tight"
            >
              {title}
            </h2>
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg p-1 text-muted hover:text-foreground"
              aria-label="Fechar"
            >
              <X className="size-4" />
            </button>
          </div>

          <div className="text-sm text-muted space-y-2">{description}</div>

          {requireAcknowledge && (
            <label className="flex items-start gap-2 text-sm cursor-pointer">
              <input
                type="checkbox"
                checked={acknowledged}
                onChange={(e) => setAcknowledged(e.target.checked)}
                className="mt-0.5"
              />
              <span>{acknowledgeLabel}</span>
            </label>
          )}

          <div className="flex flex-wrap justify-end gap-2 pt-1">
            <Button variant="ghost" size="sm" disabled={busy} onClick={onClose}>
              {cancelLabel}
            </Button>
            <Button
              variant={confirmVariant}
              size="sm"
              disabled={busy || !canConfirm}
              onClick={onConfirm}
              className={clsx(
                confirmVariant === "primary" &&
                  requireAcknowledge &&
                  "disabled:opacity-50",
              )}
            >
              {confirmLabel}
            </Button>
          </div>
        </div>
      </div>
    </>
  );
}
