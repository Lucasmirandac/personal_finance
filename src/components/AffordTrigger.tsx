"use client";

import { useEffect, useState } from "react";
import { HelpCircle } from "lucide-react";
import { useAppStore, QuickAddDraft } from "@/lib/store";
import { AffordModal } from "./AffordModal";

export const OPEN_QUICK_ADD_EVENT = "pf:open-quick-add";

export function dispatchOpenQuickAdd(draft: QuickAddDraft | null) {
  window.dispatchEvent(
    new CustomEvent(OPEN_QUICK_ADD_EVENT, { detail: draft }),
  );
}

function isTypingTarget(target: EventTarget | null): boolean {
  const el = target as HTMLElement | null;
  if (!el) return false;
  const tag = el.tagName;
  return (
    tag === "INPUT" ||
    tag === "TEXTAREA" ||
    tag === "SELECT" ||
    el.isContentEditable
  );
}

export function AffordTrigger() {
  const { hasAnalysis, accounts } = useAppStore();
  const [open, setOpen] = useState(false);

  const visible = hasAnalysis && accounts.length > 0;

  useEffect(() => {
    if (!visible) return;

    function onKey(e: KeyboardEvent) {
      if (isTypingTarget(e.target)) return;

      // `s` opens simulator; `?` (Shift+/) also opens — no help panel in app today.
      if (e.key === "s" || e.key === "S" || e.key === "?") {
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
        className="fixed bottom-24 right-6 z-40 w-12 h-12 rounded-full bg-surface-2 border border-border text-[var(--foreground)] shadow-md flex items-center justify-center hover:opacity-90 transition-opacity"
        aria-label="Posso comprar isso? (atalho: s ou ?)"
        title="Posso comprar isso? (s / ?)"
        onClick={() => setOpen(true)}
      >
        <HelpCircle size={20} strokeWidth={2} />
      </button>
      <AffordModal
        open={open}
        onClose={() => setOpen(false)}
        onRegisterGasto={(draft) => dispatchOpenQuickAdd(draft)}
      />
    </>
  );
}
