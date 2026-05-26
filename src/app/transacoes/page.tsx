"use client";

import { useMemo, useState } from "react";
import {
  ColumnDef,
  flexRender,
  getCoreRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  SortingState,
  useReactTable,
} from "@tanstack/react-table";
import clsx from "clsx";
import { useAppStore } from "@/lib/store";
import {
  applyFilters,
  EMPTY_FILTERS,
  Filters,
} from "@/lib/aggregations";
import { Fonte, TransactionNormalized } from "@/lib/types";
import { EmptyState } from "@/components/EmptyState";
import { FiltersDrawer, FiltersButton } from "@/components/FiltersDrawer";
import { NatureBadge } from "@/components/NatureBadge";
import { formatBRL, formatDateRangeCaption, formatInt } from "@/lib/format";
import { exportTreatedCsv } from "@/lib/exporters";
import { countActiveFilters } from "@/lib/filters";

const FONTE_LABELS: Record<Fonte, string> = {
  inter: "Inter",
  nubank: "Nubank",
  manual: "Manual",
};

const NUM_COLUMNS = new Set(["valorOriginal", "valorAnalise"]);

export default function TransacoesPage() {
  const { loaded, hasAnalysis, normalized } = useAppStore();
  const [filters, setFilters] = useState<Filters>(EMPTY_FILTERS);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [sorting, setSorting] = useState<SortingState>([
    { id: "dataISO", desc: true },
  ]);

  const data = useMemo(
    () => applyFilters(normalized, filters),
    [normalized, filters],
  );

  const columns = useMemo<ColumnDef<TransactionNormalized>[]>(
    () => [
      {
        accessorKey: "dataISO",
        header: "Data",
        cell: ({ row }) => row.original.data,
        sortingFn: "alphanumeric",
      },
      {
        accessorKey: "lancamento",
        header: "Lançamento",
        cell: ({ row }) => (
          <div className="max-w-[240px] truncate" title={row.original.lancamento}>
            {row.original.lancamento}
          </div>
        ),
      },
      {
        accessorKey: "estabelecimento",
        header: "Estabelecimento",
        cell: ({ row }) => (
          <div className="max-w-[160px] truncate">
            {row.original.estabelecimento}
          </div>
        ),
      },
      { accessorKey: "categoria", header: "Categoria" },
      { accessorKey: "tipo", header: "Tipo" },
      {
        accessorKey: "fonte",
        header: "Origem",
        cell: ({ row }) => (
          <span className="badge badge-dot badge-gasto">
            {FONTE_LABELS[row.original.fonte]}
          </span>
        ),
      },
      {
        accessorKey: "natureza",
        header: "Natureza",
        cell: ({ row }) => <NatureBadge natureza={row.original.natureza} />,
      },
      {
        accessorKey: "valorOriginal",
        header: "Valor orig.",
        cell: ({ getValue }) => (
          <span className="num">{formatBRL(getValue<number>())}</span>
        ),
      },
      {
        accessorKey: "valorAnalise",
        header: "Valor análise",
        cell: ({ getValue }) => (
          <span className="num">{formatBRL(getValue<number>())}</span>
        ),
      },
      { accessorKey: "diaSemana", header: "Dia" },
      { accessorKey: "faixaValor", header: "Faixa" },
    ],
    [],
  );

  const table = useReactTable({
    data,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: { pagination: { pageSize: 50 } },
  });

  const activeCount = countActiveFilters(filters);
  const windowCaption = formatDateRangeCaption(
    filters.dateFrom,
    filters.dateTo,
  );

  if (!loaded) return <div className="subtle">Carregando…</div>;
  if (!hasAnalysis) return <EmptyState />;

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-lg font-semibold tracking-tight">Transações</h1>
          <p className="subtle text-xs mt-0.5">
            {formatInt(data.length)} de {formatInt(normalized.length)} linhas
            {windowCaption && <> · {windowCaption}</>}
          </p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <FiltersButton
            activeCount={activeCount}
            onClick={() => setDrawerOpen(true)}
          />
          <button
            className="btn btn-sm"
            onClick={() => exportTreatedCsv(data, "fatura_tratada_filtrada.csv")}
          >
            Exportar CSV
          </button>
        </div>
      </div>

      <FiltersDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        data={normalized}
        filters={filters}
        onChange={setFilters}
        onClear={() => setFilters(EMPTY_FILTERS)}
      />

      <div className="panel overflow-hidden">
        <div className="table-wrap max-h-[calc(100dvh-14rem)] overflow-auto">
          <table className="dt">
            <thead>
              {table.getHeaderGroups().map((hg) => (
                <tr key={hg.id}>
                  {hg.headers.map((h) => {
                    const canSort = h.column.getCanSort();
                    const sort = h.column.getIsSorted();
                    const isNum = NUM_COLUMNS.has(h.column.id);
                    return (
                      <th
                        key={h.id}
                        className={isNum ? "num" : undefined}
                        onClick={
                          canSort ? h.column.getToggleSortingHandler() : undefined
                        }
                      >
                        <span className="inline-flex items-center gap-1">
                          {flexRender(h.column.columnDef.header, h.getContext())}
                          {sort === "asc" && <span className="text-[10px]">▲</span>}
                          {sort === "desc" && <span className="text-[10px]">▼</span>}
                        </span>
                      </th>
                    );
                  })}
                </tr>
              ))}
            </thead>
            <tbody>
              {table.getRowModel().rows.map((row) => {
                const n = row.original.natureza;
                return (
                  <tr
                    key={row.id}
                    className={clsx(
                      n === "Pagamento de fatura" && "row-pay",
                      n === "Estorno / crédito" && "row-est",
                      n === "Despesa fixa" && "row-fixa",
                      n === "Receita" && "row-receita",
                    )}
                  >
                    {row.getVisibleCells().map((cell) => {
                      const isNum = NUM_COLUMNS.has(cell.column.id);
                      return (
                        <td key={cell.id} className={isNum ? "num" : undefined}>
                          {flexRender(
                            cell.column.columnDef.cell,
                            cell.getContext(),
                          )}
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
              {table.getRowModel().rows.length === 0 && (
                <tr>
                  <td colSpan={columns.length} className="subtle text-center py-6">
                    Nenhuma transação corresponde aos filtros.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <div className="flex items-center justify-between gap-3 px-3 py-2 border-t border-[var(--border)]">
          <div className="text-[11px] subtle">
            Pág. {table.getState().pagination.pageIndex + 1} /{" "}
            {table.getPageCount() || 1}
          </div>
          <div className="flex items-center gap-2">
            <select
              className="select w-auto text-xs py-1"
              value={table.getState().pagination.pageSize}
              onChange={(e) => table.setPageSize(Number(e.target.value))}
            >
              {[25, 50, 100, 200].map((s) => (
                <option key={s} value={s}>
                  {s}/pág
                </option>
              ))}
            </select>
            <button
              className="btn btn-sm"
              onClick={() => table.previousPage()}
              disabled={!table.getCanPreviousPage()}
            >
              ←
            </button>
            <button
              className="btn btn-sm"
              onClick={() => table.nextPage()}
              disabled={!table.getCanNextPage()}
            >
              →
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
