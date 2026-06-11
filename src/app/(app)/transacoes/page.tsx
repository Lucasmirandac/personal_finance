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
import { applyFilters } from "@/lib/aggregations";
import { buildAutoCategorySuggestions } from "@/lib/autoCategorize";
import { useFilters } from "@/lib/filtersContext";
import { defaultAccount } from "@/lib/accounts";
import { isEdited, canRevertTransaction, installmentDeleteConfirmMessage, allowsPerMonthRecurringEdit, recurringMonthlyDeleteConfirmMessage } from "@/lib/edits";
import { isForecastTransaction } from "@/lib/recurring";
import { Fonte, TransactionNormalized } from "@/lib/types";
import { EmptyState } from "@/components/EmptyState";
import { AutoCategorizeModal } from "@/components/AutoCategorizeModal";
import { FiltersDrawer, FiltersButton } from "@/components/FiltersDrawer";
import { NatureBadge } from "@/components/NatureBadge";
import { QuickAddModal } from "@/components/QuickAddModal";
import {
  canEditTransaction,
  resolveEditCurrent,
  TransactionEditHost,
} from "@/components/transaction/TransactionEditHost";
import { Badge } from "@/components/ui/Badge";
import { TableHeaderLabel } from "@/components/ui/TableHeaderLabel";
import { g } from "@/lib/glossary";
import { Button } from "@/components/ui/Button";
import {
  DataTable,
  DataTableCell,
  DataTableHead,
  DataTableRow,
  DataTableRowTone,
} from "@/components/ui/DataTable";
import { Num } from "@/components/ui/Num";
import { Panel } from "@/components/ui/Panel";
import { Select } from "@/components/ui/Input";
import { useAppStore, QuickAddDraft } from "@/lib/store";
import { formatBRL, formatDateRangeCaption, formatInt } from "@/lib/format";
import { exportTreatedCsv } from "@/lib/exporters";
import { countActiveFilters } from "@/lib/filters";
import {
  ArrowDown,
  ArrowUp,
  ChevronLeft,
  ChevronRight,
  Copy,
  Download,
  Eye,
  EyeOff,
  Pencil,
  RotateCcw,
  Trash2,
  Undo2,
  Wand2,
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
    installmentGroupEdits,
    rules,
    accounts,
    findOriginalRaw,
    editTransaction,
    revertTransaction,
    deleteTransaction,
    restoreTransaction,
    paymentStatus,
    setPaymentStatus,
  } = useAppStore();

  const { filters, setFilters, clearFilters } = useFilters();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [showDeleted, setShowDeleted] = useState(false);
  const [editRow, setEditRow] = useState<TransactionNormalized | null>(null);
  const [repeatDraft, setRepeatDraft] = useState<QuickAddDraft | null>(null);
  const [quickAddOpen, setQuickAddOpen] = useState(false);
  const [autoCategorizeOpen, setAutoCategorizeOpen] = useState(false);
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

  const autoSuggestions = useMemo(
    () => buildAutoCategorySuggestions(normalized, rules),
    [normalized, rules],
  );

  const transactionsById = useMemo(
    () => new Map(normalized.map((t) => [t.id, t])),
    [normalized],
  );

  const suggestionsById = useMemo(
    () => new Map(autoSuggestions.map((s) => [s.rawId, s])),
    [autoSuggestions],
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
          <Badge variant="gasto" dot>
            {FONTE_LABELS[row.original.fonte]}
          </Badge>
        ),
      },
      {
        accessorKey: "natureza",
        header: () => <TableHeaderLabel infoKey="natureza">Natureza</TableHeaderLabel>,
        cell: ({ row }) => (
          <span className="inline-flex items-center gap-1.5 flex-wrap">
            <NatureBadge natureza={row.original.natureza} />
            {isEdited(row.original.id, edits, installmentGroupEdits, row.original) && (
              <Badge className="text-[10px]" info={g("editado")}>editado</Badge>
            )}
            {isForecastTransaction(row.original) && (
              <Badge className="text-[10px]" info={g("previsto")}>previsto</Badge>
            )}
          </span>
        ),
      },
      {
        accessorKey: "valorOriginal",
        header: () => <TableHeaderLabel infoKey="valorOriginal">Valor orig.</TableHeaderLabel>,
        cell: ({ getValue, row }) => (
          <Num
            className={clsx(
              row.original._isDeleted && "line-through opacity-60",
            )}
          >
            {formatBRL(getValue<number>())}
          </Num>
        ),
      },
      {
        accessorKey: "valorAnalise",
        header: () => <TableHeaderLabel infoKey="valorAnalise">Valor análise</TableHeaderLabel>,
        cell: ({ getValue, row }) => (
          <Num
            className={clsx(
              row.original._isDeleted && "line-through opacity-60",
            )}
          >
            {formatBRL(getValue<number>())}
          </Num>
        ),
      },
      { accessorKey: "diaSemana", header: "Dia" },
      {
        accessorKey: "faixaValor",
        header: () => <TableHeaderLabel infoKey="faixaValor">Faixa</TableHeaderLabel>,
      },
      {
        id: "actions",
        header: "Ações",
        enableSorting: false,
        cell: ({ row }) => {
          const tx = row.original;
          const original = findOriginalRaw(tx.id);
          const recurringMonthly = original && allowsPerMonthRecurringEdit(original);
          const canEditTx = canEditTransaction(original);
          if (!canEditTx && !tx._isDeleted) {
            return (
              <span
                className="text-muted text-[10px]"
                title="Edição não disponível"
              >
                —
              </span>
            );
          }
          if (tx._isDeleted) {
            return (
              <Button
                variant="ghost"
                size="sm"
                aria-label="Restaurar transação"
                title="Restaurar"
                onClick={() => restoreTransaction(tx.id)}
              >
                <Undo2 size={13} />
              </Button>
            );
          }
          return (
            <span className="inline-flex items-center gap-0.5">
              {!recurringMonthly && (
              <Button
                variant="ghost"
                size="sm"
                aria-label="Repetir esta transação"
                title="Repetir esta"
                onClick={() => {
                  const def = defaultAccount(accounts);
                  setRepeatDraft({
                    valorOriginal: Math.abs(tx.valorOriginal),
                    lancamento: tx.lancamento,
                    categoria: tx.categoria,
                    tipo: tx.tipo === "Receita" ? "Receita" : "Avulso",
                    accountId: tx.accountId ?? def?.id,
                  });
                  setQuickAddOpen(true);
                }}
              >
                <Copy size={13} />
              </Button>
              )}
              <Button
                variant="ghost"
                size="sm"
                aria-label="Editar transação"
                title="Editar"
                onClick={() => setEditRow(tx)}
              >
                <Pencil size={13} />
              </Button>
              {canRevertTransaction(tx.id, edits, installmentGroupEdits, original ?? tx) && (
                <Button
                  variant="ghost"
                  size="sm"
                  aria-label="Reverter edição"
                  title="Reverter para original"
                  onClick={() => revertTransaction(tx.id)}
                >
                  <RotateCcw size={13} />
                </Button>
              )}
              <Button
                variant="ghost"
                size="sm"
                aria-label="Excluir transação"
                title="Excluir"
                onClick={() => {
                  const message =
                    original && allowsPerMonthRecurringEdit(original)
                      ? recurringMonthlyDeleteConfirmMessage(original)
                      : installmentDeleteConfirmMessage(
                          original?.installment ?? tx.installment,
                          "Excluir esta transação da análise? Você pode restaurá-la depois.",
                        );
                  if (window.confirm(message)) {
                    deleteTransaction(tx.id);
                  }
                }}
              >
                <Trash2 size={13} />
              </Button>
            </span>
          );
        },
      },
    ],
    [accounts, edits, installmentGroupEdits, findOriginalRaw, deleteTransaction, restoreTransaction, revertTransaction],
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

  const { original: editOriginal, current: editCurrent } = resolveEditCurrent(
    editRow,
    findOriginalRaw,
    edits,
    installmentGroupEdits,
  );

  async function applyAutoCategorize(selectedRawIds: string[]) {
    for (const id of selectedRawIds) {
      const sug = suggestionsById.get(id);
      if (sug) {
        await editTransaction(id, { categoria: sug.suggestion });
      }
    }
  }

  if (!loaded) return <div className="text-muted">Carregando…</div>;
  if (!hasAnalysis) return <EmptyState />;

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-lg font-semibold tracking-tight">Transações — visão completa</h1>
          <p className="text-muted text-xs mt-0.5">
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
            <Button
              size="sm"
              variant={showDeleted ? "primary" : "default"}
              onClick={() => setShowDeleted((v) => !v)}
              aria-pressed={showDeleted}
            >
              {showDeleted ? <Eye size={13} /> : <EyeOff size={13} />}
              {showDeleted ? "Ocultar excluídas" : "Mostrar excluídas"}
            </Button>
          )}
          <FiltersButton
            activeCount={activeCount}
            onClick={() => setDrawerOpen(true)}
          />
          {autoSuggestions.length > 0 && (
            <Button
              variant="primary"
              size="sm"
              onClick={() => setAutoCategorizeOpen(true)}
            >
              <Wand2 size={13} />
              Auto-categorizar {formatInt(autoSuggestions.length)} linhas
            </Button>
          )}
          <Button
            size="sm"
            onClick={() => exportTreatedCsv(filteredActive, "fatura_tratada_filtrada.csv")}
          >
            <Download size={13} />
            Exportar CSV
          </Button>
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

      {editRow && (
        <TransactionEditHost
          editRow={editRow}
          editOriginal={editOriginal}
          editCurrent={editCurrent}
          edits={edits}
          installmentGroupEdits={installmentGroupEdits}
          paymentStatus={paymentStatus}
          onSave={(id, patch) => editTransaction(id, patch)}
          onRevert={revertTransaction}
          onHideMonth={deleteTransaction}
          onPaymentToggle={(id, status) => void setPaymentStatus(id, status)}
          onClose={() => setEditRow(null)}
        />
      )}

      <QuickAddModal
        open={quickAddOpen}
        draft={repeatDraft}
        onClose={() => {
          setQuickAddOpen(false);
          setRepeatDraft(null);
        }}
      />

      <AutoCategorizeModal
        open={autoCategorizeOpen}
        suggestions={autoSuggestions}
        transactionsById={transactionsById}
        edits={edits}
        installmentGroupEdits={installmentGroupEdits}
        onClose={() => setAutoCategorizeOpen(false)}
        onApply={applyAutoCategorize}
      />

      <Panel className="overflow-hidden">
        <div className="max-h-[calc(100dvh-14rem)] overflow-auto">
          <DataTable>
            <thead>
              {table.getHeaderGroups().map((hg) => (
                <tr key={hg.id}>
                  {hg.headers.map((h) => {
                    const canSort = h.column.getCanSort();
                    const sort = h.column.getIsSorted();
                    const isNum = NUM_COLUMNS.has(h.column.id);
                    return (
                      <DataTableHead
                        key={h.id}
                        className={clsx(isNum && "font-mono tabular-nums")}
                        onClick={
                          canSort ? h.column.getToggleSortingHandler() : undefined
                        }
                      >
                        <span className="inline-flex items-center gap-1">
                          {flexRender(h.column.columnDef.header, h.getContext())}
                          {sort === "asc" && <ArrowUp size={10} />}
                          {sort === "desc" && <ArrowDown size={10} />}
                        </span>
                      </DataTableHead>
                    );
                  })}
                </tr>
              ))}
            </thead>
            <tbody>
              {table.getRowModel().rows.map((row) => {
                const n = row.original.natureza;
                const deleted = row.original._isDeleted;
                let tone: DataTableRowTone | undefined;
                if (!deleted) {
                  if (n === "Pagamento de fatura") tone = "pay";
                  else if (n === "Estorno / crédito") tone = "est";
                  else if (n === "Despesa fixa") tone = "fixa";
                  else if (n === "Receita") tone = "receita";
                }
                return (
                  <DataTableRow
                    key={row.id}
                    tone={tone}
                    className={clsx(deleted && "opacity-50")}
                  >
                    {row.getVisibleCells().map((cell) => {
                      const isNum = NUM_COLUMNS.has(cell.column.id);
                      return (
                        <DataTableCell
                          key={cell.id}
                          className={clsx(isNum && "font-mono tabular-nums")}
                        >
                          {flexRender(
                            cell.column.columnDef.cell,
                            cell.getContext(),
                          )}
                        </DataTableCell>
                      );
                    })}
                  </DataTableRow>
                );
              })}
              {table.getRowModel().rows.length === 0 && (
                <tr>
                  <DataTableCell
                    colSpan={columns.length}
                    className="text-muted text-center py-6"
                  >
                    Nenhuma transação corresponde aos filtros.
                  </DataTableCell>
                </tr>
              )}
            </tbody>
          </DataTable>
        </div>
        <div className="flex items-center justify-between gap-3 px-3 py-2 border-t border-border">
          <div className="text-caption text-muted">
            Pág. {table.getState().pagination.pageIndex + 1} /{" "}
            {table.getPageCount() || 1}
          </div>
          <div className="flex items-center gap-2">
            <Select
              className="w-auto text-xs py-1"
              value={table.getState().pagination.pageSize}
              onChange={(e) => table.setPageSize(Number(e.target.value))}
            >
              {[25, 50, 100, 200].map((s) => (
                <option key={s} value={s}>
                  {s}/pág
                </option>
              ))}
            </Select>
            <Button
              size="sm"
              onClick={() => table.previousPage()}
              disabled={!table.getCanPreviousPage()}
              aria-label="Página anterior"
            >
              <ChevronLeft size={14} />
            </Button>
            <Button
              size="sm"
              onClick={() => table.nextPage()}
              disabled={!table.getCanNextPage()}
              aria-label="Próxima página"
            >
              <ChevronRight size={14} />
            </Button>
          </div>
        </div>
      </Panel>
    </div>
  );
}
