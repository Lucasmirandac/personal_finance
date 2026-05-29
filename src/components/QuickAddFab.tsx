"use client";

import { useEffect, useState } from "react";
import { Plus } from "lucide-react";
import { useAppStore, QuickAddDraft } from "@/lib/store";
import { QuickAddModal } from "./QuickAddModal";
import { OPEN_QUICK_ADD_EVENT } from "./AffordTrigger";

type Props = {
  /** Controlled open state (optional — FAB manages its own if omitted) */
  open?: boolean;
  draft?: QuickAddDraft | null;
  onOpenChange?: (open: boolean) => void;
};

export function QuickAddFab({ open: controlledOpen, draft, onOpenChange }: Props) {
  const { hasAnalysis, accounts } = useAppStore();
  const [internalOpen, setInternalOpen] = useState(false);
  const [internalDraft, setInternalDraft] = useState<QuickAddDraft | null>(null);

  const open = controlledOpen ?? internalOpen;
  const setOpen = (v: boolean) => {
    setInternalOpen(v);
    onOpenChange?.(v);
    if (!v) setInternalDraft(null);
  };

  const openModal = (initialDraft: QuickAddDraft | null) => {
    setInternalDraft(initialDraft);
    setOpen(true);
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
        openModal(null);
      }
      if (e.key === "r" || e.key === "R") {
        e.preventDefault();
        openModal({ tipo: "Receita" });
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [visible]);

  useEffect(() => {
    if (!visible) return;
    function onOpenQuickAdd(e: Event) {
      const draft = (e as CustomEvent<QuickAddDraft | null>).detail ?? null;
      openModal(draft);
    }
    window.addEventListener(OPEN_QUICK_ADD_EVENT, onOpenQuickAdd);
    return () =>
      window.removeEventListener(OPEN_QUICK_ADD_EVENT, onOpenQuickAdd);
  }, [visible]);

  if (!visible) return null;

  const modalDraft = draft ?? internalDraft;

  return (
    <>
      <button
        type="button"
        className="fixed bottom-6 right-6 z-40 w-14 h-14 rounded-full bg-[var(--foreground)] text-[var(--surface)] shadow-lg flex items-center justify-center hover:opacity-90 transition-opacity"
        aria-label="Adicionar transação (n: gasto, r: receita)"
        title="Adicionar transação (n: gasto, r: receita)"
        onClick={() => openModal(null)}
      >
        <Plus size={24} strokeWidth={2.5} />
      </button>
      <QuickAddModal
        open={open}
        draft={modalDraft}
        onClose={() => setOpen(false)}
      />
    </>
  );
}
