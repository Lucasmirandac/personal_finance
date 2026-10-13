"use client";

import { useCallback, useState } from "react";
import {
  buildMonthGridImport,
  looksLikeSheetPaste,
  parsePastedMonthSheet,
  type ParsedSheetRow,
} from "@/lib/monthGrid";
import { useAppStore } from "@/lib/store";

export function useMonthGridPaste(monthIso: string) {
  const { accounts, recurringRules, normalized, importMonthGrid } =
    useAppStore();
  const [pasteRows, setPasteRows] = useState<ParsedSheetRow[] | null>(null);
  const [pasteOpen, setPasteOpen] = useState(false);
  const [importing, setImporting] = useState(false);

  const openPaste = useCallback(
    (text: string) => {
      const parsed = parsePastedMonthSheet(text, monthIso, accounts);
      if (parsed.length === 0) return false;
      setPasteRows(parsed);
      setPasteOpen(true);
      return true;
    },
    [accounts, monthIso],
  );

  const handlePasteEvent = useCallback(
    (e: React.ClipboardEvent) => {
      const text = e.clipboardData.getData("text/plain");
      if (!looksLikeSheetPaste(text)) return;
      e.preventDefault();
      openPaste(text);
    },
    [openPaste],
  );

  const handlePasteButton = useCallback(async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text.trim()) {
        openPaste(text);
        return;
      }
    } catch {
      /* permission denied — fall through */
    }
    const typed = window.prompt(
      "Cole aqui o bloco copiado da planilha (Ctrl+V) e confirme.",
    );
    if (typed?.trim()) openPaste(typed);
  }, [openPaste]);

  const closePaste = useCallback(() => {
    if (importing) return;
    setPasteOpen(false);
  }, [importing]);

  const confirmPaste = useCallback(
    async (rows: ParsedSheetRow[]) => {
      setImporting(true);
      try {
        const payload = buildMonthGridImport({
          rows,
          monthIso,
          rules: recurringRules,
          existing: normalized,
        });
        await importMonthGrid(payload);
        setPasteOpen(false);
        setPasteRows(null);
        return true;
      } finally {
        setImporting(false);
      }
    },
    [importMonthGrid, monthIso, normalized, recurringRules],
  );

  return {
    pasteRows,
    pasteOpen,
    importing,
    openPaste,
    handlePasteEvent,
    handlePasteButton,
    closePaste,
    confirmPaste,
  };
}
