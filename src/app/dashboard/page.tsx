"use client";

import { useMemo, useState } from "react";
import { useAppStore } from "@/lib/store";
import {
  applyFilters,
  buildInsights,
  categoryAggregation,
  computeKpis,
  EMPTY_FILTERS,
  establishmentAggregation,
  Filters,
  monthlySeries,
  weekdayAggregation,
} from "@/lib/aggregations";
import { EmptyState } from "@/components/EmptyState";
import { FiltersBar } from "@/components/FiltersBar";
import { KpiCard } from "@/components/KpiCard";
import { ChartCard } from "@/components/charts/ChartCard";
import { MonthlyChart } from "@/components/charts/MonthlyChart";
import { CategoryChart } from "@/components/charts/CategoryChart";
import { WeekdayChart } from "@/components/charts/WeekdayChart";
import { MonthlyCountChart } from "@/components/charts/MonthlyCountChart";
import { InsightsPanel } from "@/components/InsightsPanel";
import { formatBRL, formatDateRangeCaption, formatInt, formatPercent } from "@/lib/format";
import { exportTreatedCsv, exportWorkbook } from "@/lib/exporters";

export default function DashboardPage() {
  const { loaded, dataset, normalized } = useAppStore();
  const [filters, setFilters] = useState<Filters>(EMPTY_FILTERS);

  const filtered = useMemo(
    () => applyFilters(normalized, filters),
    [normalized, filters],
  );

  const kpis = useMemo(() => computeKpis(filtered, normalized), [filtered, normalized]);
  const months = useMemo(() => monthlySeries(filtered), [filtered]);
  const cats = useMemo(() => categoryAggregation(filtered), [filtered]);
  const weekdays = useMemo(() => weekdayAggregation(filtered), [filtered]);
  const ests = useMemo(() => establishmentAggregation(filtered), [filtered]);
  const insights = useMemo(() => buildInsights(filtered), [filtered]);
  const windowCaption = formatDateRangeCaption(
    filters.dateFrom,
    filters.dateTo,
  );

  if (!loaded) return <div className="subtle">Carregando…</div>;
  if (!dataset) return <EmptyState />;

  const topPurchases = [...filtered]
    .filter((t) => t.natureza === "Gasto")
    .sort((a, b) => b.valorAnalise - a.valorAnalise)
    .slice(0, 10);

  const recurringEsts = [...ests]
    .filter((e) => e.count >= 3)
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
          <p className="subtle text-sm">
            {dataset.fileName} · {formatInt(normalized.length)} linhas no
            dataset
          </p>
          {windowCaption && (
            <p className="text-sm mt-1 text-[var(--accent)]">
              Janela: {windowCaption}
            </p>
          )}
        </div>
        <div className="flex gap-2 flex-wrap">
          <button className="btn" onClick={() => exportTreatedCsv(filtered)}>
            Baixar CSV tratado
          </button>
          <button className="btn btn-primary" onClick={() => exportWorkbook(filtered)}>
            Baixar Excel
          </button>
        </div>
      </div>

      <FiltersBar
        data={normalized}
        filters={filters}
        onChange={setFilters}
        onClear={() => setFilters(EMPTY_FILTERS)}
      />

      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3">
        <KpiCard
          label="Gasto analisado"
          value={formatBRL(kpis.totalGasto)}
          hint={`${formatInt(kpis.countConsumo)} transações`}
          tone="accent"
        />
        <KpiCard
          label="Transações de consumo"
          value={formatInt(kpis.countConsumo)}
        />
        <KpiCard
          label="Ticket médio"
          value={formatBRL(kpis.ticketMedio)}
        />
        <KpiCard
          label="Maior compra"
          value={
            kpis.maiorCompra ? formatBRL(kpis.maiorCompra.valor) : "—"
          }
          hint={
            kpis.maiorCompra
              ? `${kpis.maiorCompra.estabelecimento} · ${kpis.maiorCompra.data}`
              : undefined
          }
        />
        <KpiCard
          label="Excluídos (pag./estornos)"
          value={formatInt(kpis.countExcluidos)}
          hint="Pagamentos de fatura e estornos não entram no total"
          tone="warning"
        />
        <KpiCard
          label="Total bruto do CSV"
          value={formatBRL(kpis.totalBruto)}
          hint="Inclui pagamentos e estornos"
        />
      </div>

      <InsightsPanel insights={insights} />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <ChartCard title="Evolução mensal" subtitle="Gasto e número de transações por mês">
          <MonthlyChart data={months} />
        </ChartCard>
        <ChartCard
          title="Gastos por categoria"
          subtitle="Top categorias por valor (até 10)"
        >
          <CategoryChart data={cats} />
        </ChartCard>
        <ChartCard
          title="Transações por mês"
          subtitle="Contagem de transações de consumo"
        >
          <MonthlyCountChart data={months} />
        </ChartCard>
        <ChartCard
          title="Gasto por dia da semana"
          subtitle="Distribuição total por dia"
        >
          <WeekdayChart data={weekdays} />
        </ChartCard>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="card p-4">
          <div className="flex items-center justify-between">
            <div className="font-semibold">Top categorias</div>
            <div className="text-xs subtle">{cats.length} categorias</div>
          </div>
          <div className="table-wrap mt-3">
            <table className="dt">
              <thead>
                <tr>
                  <th>Categoria</th>
                  <th>Total</th>
                  <th>Tx</th>
                  <th>%</th>
                </tr>
              </thead>
              <tbody>
                {cats.slice(0, 10).map((c) => (
                  <tr key={c.categoria}>
                    <td>{c.categoria}</td>
                    <td>{formatBRL(c.total)}</td>
                    <td>{formatInt(c.count)}</td>
                    <td>{formatPercent(c.share)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="card p-4">
          <div className="flex items-center justify-between">
            <div className="font-semibold">Top estabelecimentos</div>
            <div className="text-xs subtle">{ests.length} estabelecimentos</div>
          </div>
          <div className="table-wrap mt-3">
            <table className="dt">
              <thead>
                <tr>
                  <th>Estabelecimento</th>
                  <th>Total</th>
                  <th>Tx</th>
                </tr>
              </thead>
              <tbody>
                {ests.slice(0, 10).map((e) => (
                  <tr key={e.estabelecimento}>
                    <td>{e.estabelecimento}</td>
                    <td>{formatBRL(e.total)}</td>
                    <td>{formatInt(e.count)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="card p-4">
          <div className="flex items-center justify-between">
            <div className="font-semibold">Maiores compras</div>
            <div className="text-xs subtle">Top 10</div>
          </div>
          <div className="table-wrap mt-3">
            <table className="dt">
              <thead>
                <tr>
                  <th>Data</th>
                  <th>Estabelecimento</th>
                  <th>Categoria</th>
                  <th>Valor</th>
                </tr>
              </thead>
              <tbody>
                {topPurchases.map((t) => (
                  <tr key={t.id}>
                    <td>{t.data}</td>
                    <td className="max-w-[260px] truncate">{t.estabelecimento}</td>
                    <td>{t.categoria}</td>
                    <td>{formatBRL(t.valorAnalise)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="card p-4">
          <div className="flex items-center justify-between">
            <div className="font-semibold">Estabelecimentos recorrentes</div>
            <div className="text-xs subtle">3+ compras</div>
          </div>
          <div className="table-wrap mt-3">
            <table className="dt">
              <thead>
                <tr>
                  <th>Estabelecimento</th>
                  <th>Tx</th>
                  <th>Total</th>
                </tr>
              </thead>
              <tbody>
                {recurringEsts.map((e) => (
                  <tr key={e.estabelecimento}>
                    <td className="max-w-[260px] truncate">{e.estabelecimento}</td>
                    <td>{formatInt(e.count)}</td>
                    <td>{formatBRL(e.total)}</td>
                  </tr>
                ))}
                {recurringEsts.length === 0 && (
                  <tr>
                    <td colSpan={3} className="subtle">
                      Nenhum estabelecimento com 3 ou mais compras nos filtros
                      atuais.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
