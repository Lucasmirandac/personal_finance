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
import { TransactionNormalized } from "@/lib/types";
import { EmptyState } from "@/components/EmptyState";
import { FiltersBar } from "@/components/FiltersBar";
import { formatBRL, formatInt } from "@/lib/format";
import { exportTreatedCsv } from "@/lib/exporters";

export default function TransacoesPage() {
  const { loaded, dataset, normalized } = useAppStore();
  const [filters, setFilters] = useState<Filters>(EMPTY_FILTERS);
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
          <div className="max-w-[280px] truncate" title={row.original.lancamento}>
            {row.original.lancamento}
          </div>
        ),
      },
      {
        accessorKey: "estabelecimento",
        header: "Estabelecimento",
        cell: ({ row }) => (
          <div className="max-w-[200px] truncate">
            {row.original.estabelecimento}
          </div>
        ),
      },
      {
        accessorKey: "categoria",
        header: "Categoria",
      },
      {
        accessorKey: "tipo",
        header: "Tipo",
      },
      {
        accessorKey: "natureza",
        header: "Natureza",
        cell: ({ row }) => {
          const n = row.original.natureza;
          const cls =
            n === "Pagamento de fatura"
              ? "badge badge-pay"
              : n === "Estorno / crédito"
                ? "badge badge-est"
                : "badge badge-gasto";
          return <span className={cls}>{n}</span>;
        },
      },
      {
        accessorKey: "valorOriginal",
        header: "Valor original",
        cell: ({ getValue }) => formatBRL(getValue<number>()),
      },
      {
        accessorKey: "valorAnalise",
        header: "Valor análise",
        cell: ({ getValue }) => formatBRL(getValue<number>()),
      },
      {
        accessorKey: "diaSemana",
        header: "Dia",
      },
      {
        accessorKey: "faixaValor",
        header: "Faixa",
      },
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

  if (!loaded) return <div className="subtle">Carregando…</div>;
  if (!dataset) return <EmptyState />;

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Transações</h1>
          <p className="subtle text-sm">
            {formatInt(data.length)} de {formatInt(normalized.length)} linhas após filtros
          </p>
        </div>
        <div className="flex gap-2">
          <button
            className="btn"
            onClick={() => exportTreatedCsv(data, "fatura_tratada_filtrada.csv")}
          >
            Exportar visão filtrada (CSV)
          </button>
        </div>
      </div>

      <FiltersBar
        data={normalized}
        filters={filters}
        onChange={setFilters}
        onClear={() => setFilters(EMPTY_FILTERS)}
      />

      <div className="card">
        <div className="table-wrap">
          <table className="dt">
            <thead>
              {table.getHeaderGroups().map((hg) => (
                <tr key={hg.id}>
                  {hg.headers.map((h) => {
                    const canSort = h.column.getCanSort();
                    const sort = h.column.getIsSorted();
                    return (
                      <th
                        key={h.id}
                        onClick={canSort ? h.column.getToggleSortingHandler() : undefined}
                      >
                        <span className="inline-flex items-center gap-1">
                          {flexRender(h.column.columnDef.header, h.getContext())}
                          {sort === "asc" && <span>▲</span>}
                          {sort === "desc" && <span>▼</span>}
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
                    )}
                  >
                    {row.getVisibleCells().map((cell) => (
                      <td key={cell.id}>
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </td>
                    ))}
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
        <div className="flex items-center justify-between gap-3 p-3 border-t border-[var(--border)]">
          <div className="text-xs subtle">
            Página {table.getState().pagination.pageIndex + 1} de{" "}
            {table.getPageCount() || 1}
          </div>
          <div className="flex items-center gap-2">
            <select
              className="select w-auto text-sm"
              value={table.getState().pagination.pageSize}
              onChange={(e) => table.setPageSize(Number(e.target.value))}
            >
              {[25, 50, 100, 200].map((s) => (
                <option key={s} value={s}>
                  {s} por página
                </option>
              ))}
            </select>
            <button
              className="btn"
              onClick={() => table.previousPage()}
              disabled={!table.getCanPreviousPage()}
            >
              ←
            </button>
            <button
              className="btn"
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
