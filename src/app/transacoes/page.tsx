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
import { applyFilters } from "@/lib/aggregations";
import { useFilters } from "@/lib/filtersContext";
import { isEdited, isRecurringRaw, mergeRawWithEdit } from "@/lib/edits";
import { Fonte, TransactionNormalized } from "@/lib/types";
import { EmptyState } from "@/components/EmptyState";
import { FiltersDrawer, FiltersButton } from "@/components/FiltersDrawer";
import { NatureBadge } from "@/components/NatureBadge";
import { TransactionEditModal } from "@/components/TransactionEditModal";
import { formatBRL, formatDateRangeCaption, formatInt } from "@/lib/format";
import { exportTreatedCsv } from "@/lib/exporters";
import { countActiveFilters } from "@/lib/filters";
import {
  ArrowDown,
  ArrowUp,
  ChevronLeft,
  ChevronRight,
  Download,
  Eye,
  EyeOff,
  Pencil,
  RotateCcw,
  Trash2,
  Undo2,
} from "lucide-react";

const FONTE_LABELS: Record<Fonte, string> = {
  inter: "Inter",
  nubank: "Nubank",
  manual: "Manual",
};

const NUM_COLUMNS = new Set(["valorOriginal", "valorAnalise"]);

type TableRow = TransactionNormalized & { _isDeleted: boolean };

export default function TransacoesPage() {
  const {
    loaded,
    hasAnalysis,
    normalized,
    deletedNormalized,
    deletedCount,
    edits,
    findOriginalRaw,
    editTransaction,
    revertTransaction,
    deleteTransaction,
    restoreTransaction,
  } = useAppStore();

  const { filters, setFilters, clearFilters } = useFilters();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [showDeleted, setShowDeleted] = useState(false);
  const [editRow, setEditRow] = useState<TransactionNormalized | null>(null);
  const [sorting, setSorting] = useState<SortingState>([
    { id: "dataISO", desc: true },
  ]);

  const filteredActive = useMemo(
    () => applyFilters(normalized, filters),
    [normalized, filters],
  );

  const filteredDeleted = useMemo(
    () => applyFilters(deletedNormalized, filters),
    [deletedNormalized, filters],
  );

  const tableData = useMemo<TableRow[]>(() => {
    const active: TableRow[] = filteredActive.map((r) => ({
      ...r,
      _isDeleted: false,
    }));
    if (!showDeleted) return active;
    const deleted: TableRow[] = filteredDeleted.map((r) => ({
      ...r,
      _isDeleted: true,
    }));
    return [...active, ...deleted];
  }, [filteredActive, filteredDeleted, showDeleted]);

  const columns = useMemo<ColumnDef<TableRow>[]>(
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
          <div
            className={clsx(
              "max-w-[240px] truncate",
              row.original._isDeleted && "line-through opacity-60",
            )}
            title={row.original.lancamento}
          >
            {row.original.lancamento}
          </div>
        ),
      },
      {
        accessorKey: "estabelecimento",
        header: "Estabelecimento",
        cell: ({ row }) => (
          <div
            className={clsx(
              "max-w-[160px] truncate",
              row.original._isDeleted && "line-through opacity-60",
            )}
          >
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
        cell: ({ row }) => (
          <span className="inline-flex items-center gap-1.5 flex-wrap">
            <NatureBadge natureza={row.original.natureza} />
            {isEdited(row.original.id, edits) && (
              <span className="badge text-[10px]">editado</span>
            )}
          </span>
        ),
      },
      {
        accessorKey: "valorOriginal",
        header: "Valor orig.",
        cell: ({ getValue, row }) => (
          <span
            className={clsx(
              "num",
              row.original._isDeleted && "line-through opacity-60",
            )}
          >
            {formatBRL(getValue<number>())}
          </span>
        ),
      },
      {
        accessorKey: "valorAnalise",
        header: "Valor análise",
        cell: ({ getValue, row }) => (
          <span
            className={clsx(
              "num",
              row.original._isDeleted && "line-through opacity-60",
            )}
          >
            {formatBRL(getValue<number>())}
          </span>
        ),
      },
      { accessorKey: "diaSemana", header: "Dia" },
      { accessorKey: "faixaValor", header: "Faixa" },
      {
        id: "actions",
        header: "Ações",
        enableSorting: false,
        cell: ({ row }) => {
          const tx = row.original;
          const recurring = isRecurringRaw(tx);
          if (recurring) {
            return (
              <span
                className="subtle text-[10px]"
                title="Editar regra em Recorrentes"
              >
                —
              </span>
            );
          }
          if (tx._isDeleted) {
            return (
              <button
                type="button"
                className="btn btn-sm btn-ghost"
                aria-label="Restaurar transação"
                title="Restaurar"
                onClick={() => restoreTransaction(tx.id)}
              >
                <Undo2 size={13} />
              </button>
            );
          }
          return (
            <span className="inline-flex items-center gap-0.5">
              <button
                type="button"
                className="btn btn-sm btn-ghost"
                aria-label="Editar transação"
                title="Editar"
                onClick={() => setEditRow(tx)}
              >
                <Pencil size={13} />
              </button>
              {isEdited(tx.id, edits) && (
                <button
                  type="button"
                  className="btn btn-sm btn-ghost"
                  aria-label="Reverter edição"
                  title="Reverter para original"
                  onClick={() => revertTransaction(tx.id)}
                >
                  <RotateCcw size={13} />
                </button>
              )}
              <button
                type="button"
                className="btn btn-sm btn-ghost"
                aria-label="Excluir transação"
                title="Excluir"
                onClick={() => {
                  if (
                    window.confirm(
                      "Excluir esta transação da análise? Você pode restaurá-la depois.",
                    )
                  ) {
                    deleteTransaction(tx.id);
                  }
                }}
              >
                <Trash2 size={13} />
              </button>
            </span>
          );
        },
      },
    ],
    [edits, deleteTransaction, restoreTransaction, revertTransaction],
  );

  const table = useReactTable({
    data: tableData,
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

  const editOriginal = editRow ? findOriginalRaw(editRow.id) : undefined;
  const editCurrent =
    editRow && editOriginal
      ? mergeRawWithEdit(editOriginal, edits[editRow.id])
      : undefined;

  if (!loaded) return <div className="subtle">Carregando…</div>;
  if (!hasAnalysis) return <EmptyState />;

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-lg font-semibold tracking-tight">Transações</h1>
          <p className="subtle text-xs mt-0.5">
            {formatInt(filteredActive.length)} visíveis ·{" "}
            {formatInt(normalized.length)} total
            {deletedCount > 0 && (
              <> · {formatInt(deletedCount)} excluídas</>
            )}
            {windowCaption && <> · {windowCaption}</>}
          </p>
        </div>
        <div className="flex gap-2 flex-wrap">
          {deletedCount > 0 && (
            <button
              type="button"
              className={clsx("btn btn-sm", showDeleted && "btn-primary")}
              onClick={() => setShowDeleted((v) => !v)}
              aria-pressed={showDeleted}
            >
              {showDeleted ? <Eye size={13} /> : <EyeOff size={13} />}
              {showDeleted ? "Ocultar excluídas" : "Mostrar excluídas"}
            </button>
          )}
          <FiltersButton
            activeCount={activeCount}
            onClick={() => setDrawerOpen(true)}
          />
          <button
            className="btn btn-sm"
            onClick={() => exportTreatedCsv(filteredActive, "fatura_tratada_filtrada.csv")}
          >
            <Download size={13} />
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
        onClear={clearFilters}
      />

      {editRow && editOriginal && editCurrent && (
        <TransactionEditModal
          open
          original={editOriginal}
          current={editCurrent}
          canRevert={isEdited(editRow.id, edits)}
          onSave={(patch) => editTransaction(editRow.id, patch)}
          onRevert={() => revertTransaction(editRow.id)}
          onClose={() => setEditRow(null)}
        />
      )}

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
                          {sort === "asc" && <ArrowUp size={10} />}
                          {sort === "desc" && <ArrowDown size={10} />}
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
                const deleted = row.original._isDeleted;
                return (
                  <tr
                    key={row.id}
                    className={clsx(
                      deleted && "opacity-50",
                      !deleted && n === "Pagamento de fatura" && "row-pay",
                      !deleted && n === "Estorno / crédito" && "row-est",
                      !deleted && n === "Despesa fixa" && "row-fixa",
                      !deleted && n === "Receita" && "row-receita",
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
              aria-label="Página anterior"
            >
              <ChevronLeft size={14} />
            </button>
            <button
              className="btn btn-sm"
              onClick={() => table.nextPage()}
              disabled={!table.getCanNextPage()}
              aria-label="Próxima página"
            >
              <ChevronRight size={14} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
