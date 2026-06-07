"use client";

import { useEffect, useMemo, useRef } from "react";
import { Filters } from "@/lib/aggregations";
import { Natureza, TransactionNormalized } from "@/lib/types";
import { useFocusTrap } from "@/lib/hooks/useFocusTrap";
import { MultiSelect } from "./MultiSelect";
import { DateRangePicker } from "./DateRangePicker";
import { FAIXA_LABELS } from "@/lib/normalize";
import { countActiveFilters } from "@/lib/filters";
import { g } from "@/lib/glossary";
import { Button } from "@/components/ui/Button";
import { DrawerBackdrop } from "@/components/ui/Drawer";
import { Input } from "@/components/ui/Input";
import { SlidersHorizontal, X } from "lucide-react";

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
  const drawerRef = useRef<HTMLElement>(null);
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

  useFocusTrap(open, drawerRef);

  if (!open) return null;

  return (
    <>
      <DrawerBackdrop
        role="presentation"
        onClick={onClose}
        aria-hidden
      />
      <aside
        ref={drawerRef}
        className="fixed top-0 right-0 bottom-0 w-[min(100%,20rem)] bg-surface border-l border-border z-50 flex flex-col overflow-hidden"
        role="dialog"
        aria-modal="true"
        aria-label="Filtros"
      >
        <div className="flex items-center justify-between gap-2 px-4 py-3 border-b border-border">
          <div>
            <div className="font-semibold text-sm">Filtros</div>
            <div className="text-caption text-muted">
              {activeCount > 0
                ? `${activeCount} ativo(s)`
                : "Nenhum filtro aplicado"}
            </div>
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
            info={g("natureza")}
            options={NATUREZAS.map((n) => ({ value: n, label: n }))}
            values={filters.naturezas}
            onChange={(v) =>
              onChange({ ...filters, naturezas: v as Natureza[] })
            }
          />
          <MultiSelect
            label="Faixa de valor"
            info={g("faixaValor")}
            options={faixas}
            values={filters.faixas}
            onChange={(v) => onChange({ ...filters, faixas: v })}
          />
          <div>
            <label
              className="text-caption font-semibold tracking-wider uppercase text-muted block mb-1"
              htmlFor="filter-search"
            >
              Buscar lançamento
            </label>
            <Input
              id="filter-search"
              type="search"
              placeholder="Uber, supermercado…"
              value={filters.search}
              onChange={(e) =>
                onChange({ ...filters, search: e.target.value })
              }
            />
          </div>
        </div>

        <div className="p-4 border-t border-border flex gap-2">
          <Button
            className="flex-1"
            onClick={onClear}
            disabled={activeCount === 0}
          >
            Limpar
          </Button>
          <Button
            variant="primary"
            className="flex-1"
            onClick={onClose}
          >
            Aplicar
          </Button>
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
    <Button size="sm" onClick={onClick}>
      <SlidersHorizontal size={13} />
      Filtros
      {activeCount > 0 && (
        <span className="inline-flex min-w-[1.1rem] h-[1.1rem] items-center justify-center rounded-full bg-foreground text-surface text-[10px] font-semibold px-1">
          {activeCount}
        </span>
      )}
    </Button>
  );
}
