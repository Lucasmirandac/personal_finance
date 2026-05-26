"use client";

import { useEffect, useState } from "react";
import { Plus } from "lucide-react";
import { useAppStore, QuickAddDraft } from "@/lib/store";
import { QuickAddModal } from "./QuickAddModal";

type Props = {
  /** Controlled open state (optional — FAB manages its own if omitted) */
  open?: boolean;
  draft?: QuickAddDraft | null;
  onOpenChange?: (open: boolean) => void;
};

export function QuickAddFab({ open: controlledOpen, draft, onOpenChange }: Props) {
  const { hasAnalysis, accounts } = useAppStore();
  const [internalOpen, setInternalOpen] = useState(false);

  const open = controlledOpen ?? internalOpen;
  const setOpen = (v: boolean) => {
    setInternalOpen(v);
    onOpenChange?.(v);
  };

  const visible = hasAnalysis && accounts.length > 0;

  useEffect(() => {
    if (!visible) return;
    function onKey(e: KeyboardEvent) {
      const tag = (e.target as HTMLElement)?.tagName;
      if (
        tag === "INPUT" ||
        tag === "TEXTAREA" ||
        tag === "SELECT" ||
        (e.target as HTMLElement)?.isContentEditable
      ) {
        return;
      }
      if (e.key === "n" || e.key === "N") {
        e.preventDefault();
        setOpen(true);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [visible]);

  if (!visible) return null;

  return (
    <>
      <button
        type="button"
        className="fixed bottom-6 right-6 z-40 w-14 h-14 rounded-full bg-[var(--foreground)] text-[var(--surface)] shadow-lg flex items-center justify-center hover:opacity-90 transition-opacity"
        aria-label="Adicionar gasto (n)"
        title="Adicionar gasto (n)"
        onClick={() => setOpen(true)}
      >
        <Plus size={24} strokeWidth={2.5} />
      </button>
      <QuickAddModal open={open} draft={draft} onClose={() => setOpen(false)} />
    </>
  );
}
