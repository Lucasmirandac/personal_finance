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
  const [pasteError, setPasteError] = useState<string | null>(null);

  const openPaste = useCallback(
    (text: string) => {
      const parsed = parsePastedMonthSheet(text, monthIso, accounts);
      if (parsed.length === 0) {
        setPasteError("Não reconheci uma tabela nisso. Cole as linhas da planilha ou pule.");
        return false;
      }
      setPasteError(null);
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
    setPasteError(null);
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
    if (typed?.trim()) {
      openPaste(typed);
      return;
    }
    setPasteError(
      "Não consegui ler a área de transferência. Cole com Ctrl+V nesta página ou pule por agora.",
    );
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
    pasteError,
    importing,
    openPaste,
    handlePasteEvent,
    handlePasteButton,
    closePaste,
    confirmPaste,
  };
}
