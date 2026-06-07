"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { CategorySuggestion } from "@/lib/autoCategorize";
import { isEdited } from "@/lib/edits";
import { useFocusTrap } from "@/lib/hooks/useFocusTrap";
import { EditsState, InstallmentGroupEditsState, TransactionNormalized } from "@/lib/types";
import { formatBRL, formatInt } from "@/lib/format";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { DrawerBackdrop } from "@/components/ui/Drawer";
import { Num } from "@/components/ui/Num";
import { ChevronDown, ChevronRight, X } from "lucide-react";

type Props = {
  open: boolean;
  suggestions: CategorySuggestion[];
  transactionsById: Map<string, TransactionNormalized>;
  edits: EditsState;
  installmentGroupEdits: InstallmentGroupEditsState;
  onClose: () => void;
  onApply: (selectedRawIds: string[]) => Promise<void>;
};

type SuggestionGroup = {
  estabelecimento: string;
  suggestion: string;
  votes: number;
  support: number;
  items: CategorySuggestion[];
};

function groupSuggestions(suggestions: CategorySuggestion[]): SuggestionGroup[] {
  const map = new Map<string, SuggestionGroup>();
  for (const s of suggestions) {
    const key = `${s.estabelecimento}\0${s.suggestion}`;
    const existing = map.get(key);
    if (existing) {
      existing.items.push(s);
      continue;
    }
    map.set(key, {
      estabelecimento: s.estabelecimento,
      suggestion: s.suggestion,
      votes: s.votes,
      support: s.support,
      items: [s],
    });
  }
  return [...map.values()].sort((a, b) =>
    a.estabelecimento.localeCompare(b.estabelecimento, "pt-BR"),
  );
}

export function AutoCategorizeModal({
  open,
  suggestions,
  transactionsById,
  edits,
  installmentGroupEdits,
  onClose,
  onApply,
}: Props) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const groups = useMemo(() => groupSuggestions(suggestions), [suggestions]);
  const allIds = useMemo(
    () => suggestions.map((s) => s.rawId),
    [suggestions],
  );
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [applying, setApplying] = useState(false);

  useEffect(() => {
    if (!open) return;
    setSelected(new Set(allIds));
    setExpanded(new Set());
    setApplying(false);
  }, [open, allIds]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  useFocusTrap(open, dialogRef);

  if (!open) return null;

  const selectedCount = selected.size;
  const editedSelectedCount = [...selected].filter((id) =>
    isEdited(id, edits, installmentGroupEdits, transactionsById.get(id)),
  ).length;

  function toggleOne(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleGroup(ids: string[]) {
    setSelected((prev) => {
      const next = new Set(prev);
      const allOn = ids.every((id) => next.has(id));
      for (const id of ids) {
        if (allOn) next.delete(id);
        else next.add(id);
      }
      return next;
    });
  }

  function toggleExpanded(key: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  async function handleApply() {
    if (selectedCount === 0) return;
    setApplying(true);
    try {
      await onApply([...selected]);
      onClose();
    } finally {
      setApplying(false);
    }
  }

  return (
    <DrawerBackdrop
      className="flex items-center justify-center"
      role="presentation"
      onClick={onClose}
    >
      <div
        ref={dialogRef}
        className="bg-surface border border-border rounded-lg w-full max-w-2xl mx-4 p-4 space-y-4 max-h-[90dvh] flex flex-col"
        role="dialog"
        aria-modal="true"
        aria-labelledby="auto-categorize-title"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-2 shrink-0">
          <div>
            <h2
              id="auto-categorize-title"
              className="text-caption font-semibold tracking-wider uppercase text-muted"
            >
              Auto-categorizar {formatInt(suggestions.length)} linhas
            </h2>
            <p className="text-xs text-muted mt-0.5">
              em {formatInt(groups.length)} estabelecimento
              {groups.length === 1 ? "" : "s"} · categoria sugerida pelo
              histórico
            </p>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            aria-label="Fechar"
          >
            <X size={14} />
          </Button>
        </div>

        <div className="flex flex-wrap gap-2 shrink-0">
          <Button size="sm" onClick={() => setSelected(new Set(allIds))}>
            Selecionar todos
          </Button>
          <Button size="sm" onClick={() => setSelected(new Set())}>
            Limpar seleção
          </Button>
        </div>

        {editedSelectedCount > 0 && (
          <p className="text-xs text-warning border border-warning/30 rounded-md px-2 py-1.5 shrink-0">
            {formatInt(editedSelectedCount)} linha
            {editedSelectedCount === 1 ? "" : "s"} selecionada
            {editedSelectedCount === 1 ? "" : "s"} já tem edição manual — a
            categoria será sobrescrita.
          </p>
        )}

        <div className="overflow-auto flex-1 min-h-0 space-y-2 border border-border rounded-lg">
          {groups.map((group) => {
            const groupKey = `${group.estabelecimento}\0${group.suggestion}`;
            const ids = group.items.map((i) => i.rawId);
            const allOn = ids.every((id) => selected.has(id));
            const someOn = ids.some((id) => selected.has(id));
            const isExpanded = expanded.has(groupKey);

            return (
              <div
                key={groupKey}
                className="border-b border-border last:border-b-0"
              >
                <div className="flex items-start gap-2 px-3 py-2">
                  <input
                    type="checkbox"
                    className="mt-1"
                    checked={allOn}
                    ref={(el) => {
                      if (el) el.indeterminate = someOn && !allOn;
                    }}
                    onChange={() => toggleGroup(ids)}
                    aria-label={`Selecionar ${group.estabelecimento}`}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-sm truncate">
                      {group.estabelecimento}
                    </div>
                    <div className="flex flex-wrap items-center gap-2 mt-1 text-xs">
                      <Badge>Sugerido: {group.suggestion}</Badge>
                      <span className="text-muted">
                        {formatInt(group.items.length)} linha
                        {group.items.length === 1 ? "" : "s"} ·{" "}
                        {formatInt(group.votes)} voto
                        {group.votes === 1 ? "" : "s"} /{" "}
                        {formatInt(group.support)} no histórico
                      </span>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="shrink-0"
                    onClick={() => toggleExpanded(groupKey)}
                    aria-expanded={isExpanded}
                  >
                    {isExpanded ? (
                      <ChevronDown size={14} />
                    ) : (
                      <ChevronRight size={14} />
                    )}
                    Ver linhas
                  </Button>
                </div>

                {isExpanded && (
                  <ul className="divide-y divide-border bg-surface-2/40">
                    {group.items.map((item) => {
                      const tx = transactionsById.get(item.rawId);
                      return (
                        <li
                          key={item.rawId}
                          className="flex items-center gap-2 px-3 py-2 pl-9"
                        >
                          <input
                            type="checkbox"
                            checked={selected.has(item.rawId)}
                            onChange={() => toggleOne(item.rawId)}
                            aria-label={`Selecionar transação ${item.rawId}`}
                          />
                          <div className="flex-1 min-w-0 flex items-center gap-3 text-xs">
                            <span className="text-muted whitespace-nowrap shrink-0">
                              {tx?.data ?? "—"}
                            </span>
                            <span className="truncate">
                              {tx?.lancamento ?? item.estabelecimento}
                            </span>
                            <span className="text-muted whitespace-nowrap shrink-0">
                              {item.currentCategoria}
                            </span>
                            {tx && (
                              <Num className="whitespace-nowrap shrink-0">
                                {formatBRL(tx.valorOriginal)}
                              </Num>
                            )}
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>
            );
          })}
        </div>

        <div className="flex items-center justify-between gap-3 flex-wrap shrink-0 pt-1 border-t border-border">
          <span className="text-xs text-muted">
            Selecionados: {formatInt(selectedCount)} de{" "}
            {formatInt(suggestions.length)}
          </span>
          <div className="flex gap-2">
            <Button
              size="sm"
              onClick={onClose}
              disabled={applying}
            >
              Cancelar
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={handleApply}
              disabled={applying || selectedCount === 0}
            >
              {applying ? "Aplicando…" : "Aplicar"}
            </Button>
          </div>
        </div>
      </div>
    </DrawerBackdrop>
  );
}
