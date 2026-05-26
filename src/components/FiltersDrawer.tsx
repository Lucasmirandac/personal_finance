"use client";

import { useEffect, useMemo } from "react";
import { Filters } from "@/lib/aggregations";
import { Natureza, TransactionNormalized } from "@/lib/types";
import { MultiSelect } from "./MultiSelect";
import { DateRangePicker } from "./DateRangePicker";
import { FAIXA_LABELS } from "@/lib/normalize";
import { countActiveFilters } from "@/lib/filters";

type Props = {
  open: boolean;
  onClose: () => void;
  data: TransactionNormalized[];
  filters: Filters;
  onChange: (next: Filters) => void;
  onClear: () => void;
};

const NATUREZAS: Natureza[] = [
  "Gasto",
  "Despesa fixa",
  "Receita",
  "Pagamento de fatura",
  "Estorno / crédito",
];

export function FiltersDrawer({
  open,
  onClose,
  data,
  filters,
  onChange,
  onClear,
}: Props) {
  const { datasetMin, datasetMax } = useMemo(() => {
    let min: string | null = null;
    let max: string | null = null;
    for (const t of data) {
      if (!t.dataISO) continue;
      if (!min || t.dataISO < min) min = t.dataISO;
      if (!max || t.dataISO > max) max = t.dataISO;
    }
    return { datasetMin: min, datasetMax: max };
  }, [data]);

  const categories = useMemo(() => {
    const set = new Set<string>();
    for (const t of data) if (t.categoria) set.add(t.categoria);
    return [...set].sort().map((c) => ({ value: c, label: c }));
  }, [data]);

  const faixas = useMemo(
    () => FAIXA_LABELS.map((f) => ({ value: f, label: f })),
    [],
  );

  const activeCount = countActiveFilters(filters);

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <>
      <div
        className="drawer-backdrop"
        role="presentation"
        onClick={onClose}
        aria-hidden
      />
      <aside
        className="drawer-panel"
        role="dialog"
        aria-modal="true"
        aria-label="Filtros"
      >
        <div className="flex items-center justify-between gap-2 px-4 py-3 border-b border-[var(--border)]">
          <div>
            <div className="font-semibold text-sm">Filtros</div>
            <div className="text-[11px] subtle">
              {activeCount > 0
                ? `${activeCount} ativo(s)`
                : "Nenhum filtro aplicado"}
            </div>
          </div>
          <button type="button" className="btn btn-ghost btn-sm" onClick={onClose}>
            Fechar
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          <DateRangePicker
            dateFrom={filters.dateFrom}
            dateTo={filters.dateTo}
            datasetMin={datasetMin}
            datasetMax={datasetMax}
            onChange={(from, to) =>
              onChange({ ...filters, dateFrom: from, dateTo: to })
            }
          />
          <MultiSelect
            label="Categoria"
            options={categories}
            values={filters.categorias}
            onChange={(v) => onChange({ ...filters, categorias: v })}
          />
          <MultiSelect
            label="Natureza"
            options={NATUREZAS.map((n) => ({ value: n, label: n }))}
            values={filters.naturezas}
            onChange={(v) =>
              onChange({ ...filters, naturezas: v as Natureza[] })
            }
          />
          <MultiSelect
            label="Faixa de valor"
            options={faixas}
            values={filters.faixas}
            onChange={(v) => onChange({ ...filters, faixas: v })}
          />
          <div>
            <label className="section-title block mb-1">
              Buscar lançamento
            </label>
            <input
              className="input"
              type="search"
              placeholder="Uber, supermercado…"
              value={filters.search}
              onChange={(e) =>
                onChange({ ...filters, search: e.target.value })
              }
            />
          </div>
        </div>

        <div className="p-4 border-t border-[var(--border)] flex gap-2">
          <button
            type="button"
            className="btn flex-1"
            onClick={onClear}
            disabled={activeCount === 0}
          >
            Limpar
          </button>
          <button type="button" className="btn btn-primary flex-1" onClick={onClose}>
            Aplicar
          </button>
        </div>
      </aside>
    </>
  );
}

export function FiltersButton({
  activeCount,
  onClick,
}: {
  activeCount: number;
  onClick: () => void;
}) {
  return (
    <button type="button" className="btn" onClick={onClick}>
      Filtros
      {activeCount > 0 && (
        <span className="inline-flex min-w-[1.1rem] h-[1.1rem] items-center justify-center rounded-full bg-[var(--foreground)] text-[var(--surface)] text-[10px] font-semibold px-1">
          {activeCount}
        </span>
      )}
    </button>
  );
}
