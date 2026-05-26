"use client";

import { useMemo, useState } from "react";
import clsx from "clsx";
import { useAppStore } from "@/lib/store";
import {
  applyFilters,
  buildInsights,
  categoryAggregation,
  computeKpis,
  EMPTY_FILTERS,
  establishmentAggregation,
  expenseComposition,
  Filters,
  monthlySeries,
  weekdayAggregation,
} from "@/lib/aggregations";
import { EmptyState } from "@/components/EmptyState";
import { FiltersDrawer, FiltersButton } from "@/components/FiltersDrawer";
import { KpiCard, KpiStrip } from "@/components/KpiCard";
import { ChartCard } from "@/components/charts/ChartCard";
import { MonthlyChart } from "@/components/charts/MonthlyChart";
import { CategoryChart } from "@/components/charts/CategoryChart";
import { WeekdayChart } from "@/components/charts/WeekdayChart";
import { MonthlyCountChart } from "@/components/charts/MonthlyCountChart";
import { InsightsPanel } from "@/components/InsightsPanel";
import { Tabs } from "@/components/Tabs";
import {
  formatBRL,
  formatDateRangeCaption,
  formatInt,
  formatPercent,
} from "@/lib/format";
import { exportTreatedCsv, exportWorkbook } from "@/lib/exporters";
import { countActiveFilters } from "@/lib/filters";

const DASH_TABS = [
  { id: "geral", label: "Visão geral" },
  { id: "cartao", label: "Cartão" },
  { id: "categorias", label: "Categorias" },
  { id: "estabelecimentos", label: "Estabelecimentos" },
] as const;

type DashTab = (typeof DASH_TABS)[number]["id"];

export default function DashboardPage() {
  const { loaded, dataset, hasAnalysis, normalized } = useAppStore();
  const [filters, setFilters] = useState<Filters>(EMPTY_FILTERS);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [tab, setTab] = useState<DashTab>("geral");
  const [estView, setEstView] = useState<"top" | "recurring">("top");

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
  const expenseComp = useMemo(() => expenseComposition(filtered), [filtered]);
  const activeCount = countActiveFilters(filters);
  const windowCaption = formatDateRangeCaption(
    filters.dateFrom,
    filters.dateTo,
  );

  const topPurchases = useMemo(
    () =>
      [...filtered]
        .filter((t) => t.natureza === "Gasto")
        .sort((a, b) => b.valorAnalise - a.valorAnalise)
        .slice(0, 10),
    [filtered],
  );

  const recurringEsts = useMemo(
    () =>
      [...ests]
        .filter((e) => e.count >= 3)
        .sort((a, b) => b.count - a.count)
        .slice(0, 15),
    [ests],
  );

  const maxCatTotal = cats[0]?.total ?? 1;

  if (!loaded) return <div className="subtle">Carregando…</div>;
  if (!hasAnalysis) return <EmptyState />;

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-lg font-semibold tracking-tight">Dashboard</h1>
          <p className="subtle text-xs mt-0.5">
            {dataset.sources.length} fonte(s) · {formatInt(normalized.length)} linhas
            {windowCaption && <> · {windowCaption}</>}
          </p>
        </div>
        <div className="flex gap-2 flex-wrap items-center">
          <FiltersButton
            activeCount={activeCount}
            onClick={() => setDrawerOpen(true)}
          />
          <button className="btn btn-sm" onClick={() => exportTreatedCsv(filtered)}>
            CSV
          </button>
          <button
            className="btn btn-primary btn-sm"
            onClick={() => exportWorkbook(filtered)}
          >
            Excel
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

      <KpiStrip>
        <KpiCard label="Receitas" value={formatBRL(kpis.totalReceitas)} tone="success" />
        <KpiCard
          label="Despesas"
          value={formatBRL(kpis.totalDespesas)}
          hint={`Cartão ${formatBRL(expenseComp.cartao.total)} · Fixas ${formatBRL(expenseComp.fixas.total)}`}
          tone="accent"
        />
        <KpiCard
          label="Saldo"
          value={formatBRL(kpis.saldo)}
          tone={kpis.saldo >= 0 ? "success" : "warning"}
        />
        <KpiCard
          label="Gasto no cartão"
          value={formatBRL(kpis.totalGasto)}
          hint={`${formatInt(kpis.countConsumo)} transações`}
        />
      </KpiStrip>

      <Tabs tabs={[...DASH_TABS]} active={tab} onChange={(id) => setTab(id as DashTab)}>
        {tab === "geral" && (
          <div className="space-y-4">
            <ChartCard
              title="Evolução mensal"
              subtitle="Receitas, despesas e saldo"
            >
              <MonthlyChart data={months} />
            </ChartCard>

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-px bg-[var(--border)] border border-[var(--border)] rounded-lg overflow-hidden">
              {[
                { label: "Ticket médio", value: formatBRL(kpis.ticketMedio) },
                {
                  label: "Maior compra",
                  value: kpis.maiorCompra ? formatBRL(kpis.maiorCompra.valor) : "—",
                  hint: kpis.maiorCompra?.estabelecimento,
                },
                {
                  label: "Excluídos",
                  value: formatInt(kpis.countExcluidos),
                },
                { label: "Total bruto", value: formatBRL(kpis.totalBruto) },
              ].map((k) => (
                <div key={k.label} className="bg-[var(--surface)] p-3">
                  <KpiCard label={k.label} value={k.value} hint={k.hint} compact />
                </div>
              ))}
            </div>

            <div>
              <div className="section-title mb-2">Insights</div>
              <InsightsPanel insights={insights} max={4} />
            </div>
          </div>
        )}

        {tab === "cartao" && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
              <ChartCard title="Transações por mês" subtitle="Contagem de consumo">
                <MonthlyCountChart data={months} />
              </ChartCard>
              <ChartCard title="Por dia da semana" subtitle="Distribuição de gastos">
                <WeekdayChart data={weekdays} />
              </ChartCard>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="section-title">Maiores compras</span>
                <span className="text-[11px] subtle">Top 10</span>
              </div>
              <div className="table-wrap border border-[var(--border)] rounded-lg">
                <table className="dt">
                  <thead>
                    <tr>
                      <th>Data</th>
                      <th>Estabelecimento</th>
                      <th>Categoria</th>
                      <th className="num">Valor</th>
                    </tr>
                  </thead>
                  <tbody>
                    {topPurchases.map((t) => (
                      <tr key={t.id}>
                        <td>{t.data}</td>
                        <td className="max-w-[220px] truncate">{t.estabelecimento}</td>
                        <td>{t.categoria}</td>
                        <td className="num">{formatBRL(t.valorAnalise)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {tab === "categorias" && (
          <div className="space-y-4">
            <ChartCard title="Gastos por categoria" subtitle="Top 10">
              <CategoryChart data={cats} />
            </ChartCard>

            <div className="table-wrap border border-[var(--border)] rounded-lg">
              <table className="dt">
                <thead>
                  <tr>
                    <th>Categoria</th>
                    <th className="num">Total</th>
                    <th className="num">Tx</th>
                    <th>%</th>
                  </tr>
                </thead>
                <tbody>
                  {cats.slice(0, 15).map((c) => (
                    <tr key={c.categoria}>
                      <td>{c.categoria}</td>
                      <td className="num">{formatBRL(c.total)}</td>
                      <td className="num">{formatInt(c.count)}</td>
                      <td>
                        <div className="flex items-center gap-2 min-w-[100px]">
                          <div className="progress-bar flex-1">
                            <div
                              className="progress-bar-fill"
                              style={{ width: `${(c.total / maxCatTotal) * 100}%` }}
                            />
                          </div>
                          <span className="text-[11px] num w-10 text-right">
                            {formatPercent(c.share)}
                          </span>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {tab === "estabelecimentos" && (
          <div className="space-y-3">
            <div className="flex gap-1">
              <button
                type="button"
                className={clsx(
                  "btn btn-sm",
                  estView === "top" && "btn-primary",
                )}
                onClick={() => setEstView("top")}
              >
                Top por valor
              </button>
              <button
                type="button"
                className={clsx(
                  "btn btn-sm",
                  estView === "recurring" && "btn-primary",
                )}
                onClick={() => setEstView("recurring")}
              >
                Recorrentes (3+)
              </button>
            </div>

            <div className="table-wrap border border-[var(--border)] rounded-lg">
              <table className="dt">
                <thead>
                  <tr>
                    <th>Estabelecimento</th>
                    {estView === "recurring" ? (
                      <>
                        <th className="num">Tx</th>
                        <th className="num">Total</th>
                      </>
                    ) : (
                      <>
                        <th className="num">Total</th>
                        <th className="num">Tx</th>
                      </>
                    )}
                  </tr>
                </thead>
                <tbody>
                  {(estView === "top" ? ests.slice(0, 15) : recurringEsts).map(
                    (e) => (
                      <tr key={e.estabelecimento}>
                        <td className="max-w-[280px] truncate">
                          {e.estabelecimento}
                        </td>
                        {estView === "recurring" ? (
                          <>
                            <td className="num">{formatInt(e.count)}</td>
                            <td className="num">{formatBRL(e.total)}</td>
                          </>
                        ) : (
                          <>
                            <td className="num">{formatBRL(e.total)}</td>
                            <td className="num">{formatInt(e.count)}</td>
                          </>
                        )}
                      </tr>
                    ),
                  )}
                  {estView === "recurring" && recurringEsts.length === 0 && (
                    <tr>
                      <td colSpan={3} className="subtle py-4 text-center">
                        Nenhum estabelecimento com 3+ compras nos filtros atuais.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </Tabs>
    </div>
  );
}
