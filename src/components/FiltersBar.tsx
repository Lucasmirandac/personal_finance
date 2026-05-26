"use client";

import { Filters } from "@/lib/aggregations";
import { Natureza, TransactionNormalized } from "@/lib/types";
import { MultiSelect } from "./MultiSelect";
import { DateRangePicker } from "./DateRangePicker";
import { useMemo } from "react";
import { FAIXA_LABELS } from "@/lib/normalize";

type Props = {
  data: TransactionNormalized[];
  filters: Filters;
  onChange: (next: Filters) => void;
  onClear: () => void;
};

const NATUREZAS: Natureza[] = ["Gasto", "Pagamento de fatura", "Estorno / crédito"];

export function FiltersBar({ data, filters, onChange, onClear }: Props) {
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

  const hasDateRange = Boolean(filters.dateFrom || filters.dateTo);

  const activeCount =
    (hasDateRange ? 1 : 0) +
    filters.categorias.length +
    filters.naturezas.length +
    filters.faixas.length +
    (filters.search.trim() ? 1 : 0);

  return (
    <div className="card p-4 grid gap-3">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
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
      </div>
      <div className="flex flex-col sm:flex-row gap-3 sm:items-end">
        <div className="flex-1">
          <label className="text-xs subtle">Buscar lançamento/estabelecimento</label>
          <input
            className="input mt-1"
            type="search"
            placeholder="ex: Uber, supermercado, padaria…"
            value={filters.search}
            onChange={(e) => onChange({ ...filters, search: e.target.value })}
          />
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs subtle">
            {activeCount > 0
              ? `${activeCount} filtro(s) ativo(s)`
              : "Sem filtros"}
          </span>
          <button className="btn" onClick={onClear} disabled={activeCount === 0}>
            Limpar
          </button>
        </div>
      </div>
    </div>
  );
}
