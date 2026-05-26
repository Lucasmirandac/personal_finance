import { Filters } from "./aggregations";

export function countActiveFilters(filters: Filters): number {
  const hasDateRange = Boolean(filters.dateFrom || filters.dateTo);
  return (
    (hasDateRange ? 1 : 0) +
    filters.categorias.length +
    filters.naturezas.length +
    filters.faixas.length +
    (filters.search.trim() ? 1 : 0)
  );
}
