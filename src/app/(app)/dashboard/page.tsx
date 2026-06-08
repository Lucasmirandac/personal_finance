"use client";

import { Suspense, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useAppStore } from "@/lib/store";
import { useFilters } from "@/lib/filtersContext";
import { isProjectionReady } from "@/lib/setupStatus";
import {
  applyDayTypeFilter,
  applyFilters,
  buildInsights,
  categoryAggregation,
  computeHabitNarratives,
  computeKpis,
  computeWeekendStats,
  establishmentAggregation,
  expenseComposition,
  monthlySeries,
  weekdayAggregation,
  weekdayCategoryAggregation,
  type DayType,
} from "@/lib/aggregations";
import { EmptyState } from "@/components/EmptyState";
import { FiltersDrawer, FiltersButton } from "@/components/FiltersDrawer";
import { DashboardAlerts } from "@/components/dashboard/DashboardAlerts";
import { HabitOfWeekCard } from "@/components/dashboard/HabitOfWeekCard";
import { WeekendSharePanel } from "@/components/dashboard/WeekendSharePanel";
import { WealthProjectionPanel } from "@/components/saldo/WealthProjectionPanel";
import { ChartCard } from "@/components/charts/ChartCard";
import { MonthlyChart } from "@/components/charts/MonthlyChart";
import { CategoryChart } from "@/components/charts/CategoryChart";
import { WeekdayChart } from "@/components/charts/WeekdayChart";
import { WeekdayCategoryChart } from "@/components/charts/WeekdayCategoryChart";
import { MonthlyCountChart } from "@/components/charts/MonthlyCountChart";
import { InsightsPanel } from "@/components/InsightsPanel";
import { ComparisonPanel } from "@/components/ComparisonPanel";
import { Button } from "@/components/ui/Button";
import { SegmentedControl } from "@/components/ui/SegmentedControl";
import { StatTile } from "@/components/ui/StatTile";
import {
  DataTable,
  DataTableCell,
  DataTableHead,
  DataTableRow,
} from "@/components/ui/DataTable";
import { Num } from "@/components/ui/Num";
import { Panel } from "@/components/ui/Panel";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { SectionTitle } from "@/components/ui/SectionTitle";
import { TableHeaderLabel } from "@/components/ui/TableHeaderLabel";
import {
  formatBRL,
  formatDateRangeCaption,
  formatInt,
  formatPercent,
} from "@/lib/format";
import { exportTreatedCsv, exportWorkbook } from "@/lib/exporters";
import { countActiveFilters } from "@/lib/filters";
import { g } from "@/lib/glossary";
import {
  budgetUsageForMonth,
  currentMonthIso,
} from "@/lib/budgets";
import { BudgetProgressCard } from "@/components/BudgetProgressCard";
import { BudgetsEmptyState } from "@/components/BudgetsEmptyState";
import { FileDown, FileSpreadsheet, List } from "lucide-react";

const DASH_TABS = [
  { id: "geral", label: "Visão geral" },
  { id: "comparar", label: "Comparar" },
  { id: "orcamentos", label: "Orçamentos" },
  { id: "cartao", label: "Cartão" },
  { id: "habitos", label: "Hábitos" },
  { id: "patrimonio", label: "Patrimônio" },
  { id: "categorias", label: "Categorias" },
  { id: "estabelecimentos", label: "Estabelecimentos" },
] as const;

type DashTab = (typeof DASH_TABS)[number]["id"];

function parseDashTab(v: string | null): DashTab {
  if (
    v === "orcamentos" ||
    v === "cartao" ||
    v === "habitos" ||
    v === "patrimonio" ||
    v === "categorias" ||
    v === "estabelecimentos" ||
    v === "comparar" ||
    v === "geral"
  ) {
    return v;
  }
  return "geral";
}

export default function DashboardPage() {
  return (
    <Suspense fallback={<div className="text-muted p-4">Carregando…</div>}>
      <DashboardPageInner />
    </Suspense>
  );
}

function DashboardPageInner() {
  const { loaded, dataset, hasAnalysis, normalized, settings, accounts, budgets, recurringRules } =
    useAppStore();
  const { filters, setFilters, clearFilters } = useFilters();
  const searchParams = useSearchParams();
  const router = useRouter();
  const tabParam = searchParams.get("tab");
  const [drawerOpen, setDrawerOpen] = useState(false);
  const tab = parseDashTab(tabParam);
  const [estView, setEstView] = useState<"top" | "recurring">("top");
  const [dayType, setDayType] = useState<DayType>("all");

  const handleTabChange = (next: DashTab) => {
    router.replace(`/dashboard?tab=${next}`, { scroll: false });
  }

  const filtered = useMemo(
    () => applyFilters(normalized, filters),
    [normalized, filters],
  );

  const kpis = useMemo(() => computeKpis(filtered, normalized), [filtered, normalized]);
  const months = useMemo(() => monthlySeries(filtered), [filtered]);
  const cats = useMemo(() => categoryAggregation(filtered), [filtered]);
  const weekdays = useMemo(() => weekdayAggregation(filtered), [filtered]);
  const habitData = useMemo(
    () => applyDayTypeFilter(filtered, dayType),
    [filtered, dayType],
  );
  const habitWeekdays = useMemo(
    () => weekdayAggregation(habitData),
    [habitData],
  );
  const habitWeekdayCategories = useMemo(
    () => weekdayCategoryAggregation(habitData, 5),
    [habitData],
  );
  const weekendStats = useMemo(
    () => computeWeekendStats(filtered),
    [filtered],
  );
  const habitNarratives = useMemo(
    () => computeHabitNarratives(habitData, dayType).slice(0, 3),
    [habitData, dayType],
  );
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
  const habitWeekdaysWithData = useMemo(
    () => habitWeekdays.filter((day) => day.count > 0),
    [habitWeekdays],
  );
  const mostExpensiveWeekday = useMemo(
    () =>
      habitWeekdaysWithData.reduce<
        (typeof habitWeekdaysWithData)[number] | null
      >(
        (best, day) => (best === null || day.total > best.total ? day : best),
        null,
      ),
    [habitWeekdaysWithData],
  );
  const lightestWeekday = useMemo(
    () =>
      habitWeekdaysWithData.reduce<
        (typeof habitWeekdaysWithData)[number] | null
      >(
        (best, day) => (best === null || day.total < best.total ? day : best),
        null,
      ),
    [habitWeekdaysWithData],
  );
  const highestAverageTicketWeekday = useMemo(
    () =>
      habitWeekdaysWithData.reduce<
        (typeof habitWeekdaysWithData)[number] | null
      >(
        (best, day) => {
          if (best === null) return day;
          const dayAverage = day.total / day.count;
          const bestAverage = best.total / best.count;
          return dayAverage > bestAverage ? day : best;
        },
        null,
      ),
    [habitWeekdaysWithData],
  );

  const maxCatTotal = cats[0]?.total ?? 1;
  const projectionReady = isProjectionReady(dataset, settings, accounts);

  const monthIso = currentMonthIso();
  const budgetUsages = useMemo(
    () => budgetUsageForMonth(normalized, budgets, monthIso),
    [normalized, budgets, monthIso],
  );
  if (!loaded) return <div className="text-muted">Carregando…</div>;
  if (!hasAnalysis) return <EmptyState />;

  return (
    <div className="space-y-6 lg:space-y-8">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Análise</h1>
          <p className="text-muted text-sm mt-0.5">
            {dataset.sources.length} fonte(s) · {formatInt(normalized.length)} linhas
            {windowCaption && <> · {windowCaption}</>}
          </p>
        </div>
        <div className="flex gap-2 flex-wrap items-center">
          <Link
            href="/transacoes"
            className="inline-flex items-center justify-center gap-1.5 font-medium rounded-full border whitespace-nowrap border-border bg-surface text-foreground hover:bg-surface-2 hover:border-border-strong text-xs px-3 py-1.5"
          >
            <List size={13} />
            Transações
          </Link>
          <FiltersButton
            activeCount={activeCount}
            onClick={() => setDrawerOpen(true)}
          />
          <Button size="sm" className="rounded-full" onClick={() => exportTreatedCsv(filtered)}>
            <FileDown size={13} />
            CSV
          </Button>
          <Button
            variant="primary"
            size="sm"
            className="rounded-full"
            onClick={() => exportWorkbook(filtered, budgets, budgetUsages)}
          >
            <FileSpreadsheet size={13} />
            Excel
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

      <DashboardAlerts
        dataset={dataset}
        projectionReady={projectionReady}
        normalized={normalized}
        recurringRules={recurringRules}
        settings={settings}
        accounts={accounts}
        budgets={budgets}
      />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatTile label="Receitas" value={formatBRL(kpis.totalReceitas)} tone="success" info={g("receita")} />
        <StatTile
          label="Despesas"
          value={formatBRL(kpis.totalDespesas)}
          hint={`Cartão ${formatBRL(expenseComp.cartao.total)} · Fixas ${formatBRL(expenseComp.fixas.total)}`}
          tone="danger"
          info={g("gasto")}
        />
        <StatTile
          label="Saldo"
          value={formatBRL(kpis.saldo)}
          tone={kpis.saldo >= 0 ? "success" : "warning"}
          info={g("saldoExtrato")}
        />
        <StatTile
          label="Gasto no cartão"
          value={formatBRL(kpis.totalGasto)}
          hint={`${formatInt(kpis.countConsumo)} transações`}
          info={g("gastoCartao")}
        />
      </div>

      <div className="overflow-x-auto no-scrollbar">
        <SegmentedControl<DashTab>
          value={tab}
          onChange={handleTabChange}
          options={DASH_TABS.map((item) => ({ value: item.id, label: item.label }))}
        />
      </div>

      <div>
        {tab === "geral" && (
          <div className="space-y-4">
            <ChartCard
              title="Evolução mensal"
              subtitle="Receitas, despesas e saldo"
              info={g("evolucaoMensal")}
            >
              <MonthlyChart data={months} />
            </ChartCard>

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              {[
                { label: "Ticket médio", value: formatBRL(kpis.ticketMedio), info: g("ticketMedio") },
                {
                  label: "Maior compra",
                  value: kpis.maiorCompra ? formatBRL(kpis.maiorCompra.valor) : "—",
                  hint: kpis.maiorCompra?.estabelecimento,
                },
                {
                  label: "Excluídos",
                  value: formatInt(kpis.countExcluidos),
                  info: g("excluidos"),
                },
                { label: "Total bruto", value: formatBRL(kpis.totalBruto), info: g("totalBruto") },
              ].map((k) => (
                <StatTile key={k.label} label={k.label} value={k.value} hint={k.hint} info={k.info} />
              ))}
            </div>

            <div>
              <SectionTitle className="block mb-2">Insights</SectionTitle>
              <InsightsPanel insights={insights} max={4} />
            </div>
          </div>
        )}

        {tab === "comparar" && <ComparisonPanel data={normalized} />}

        {tab === "orcamentos" && (
          <div className="space-y-4">
            {budgetUsages.length === 0 ? (
              <BudgetsEmptyState
                variant="dashboard"
                onManualCreate={() => router.push("/config?tab=orcamentos")}
              />
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {budgetUsages.map((u) => (
                  <BudgetProgressCard key={u.budgetId} usage={u} />
                ))}
              </div>
            )}
          </div>
        )}

        {tab === "cartao" && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
              <ChartCard title="Transações por mês" subtitle="Contagem de consumo" info={g("transacoesPorMes")}>
                <MonthlyCountChart data={months} />
              </ChartCard>
              <ChartCard title="Por dia da semana" subtitle="Distribuição de gastos" info={g("gastosPorDiaSemana")}>
                <WeekdayChart data={weekdays} />
              </ChartCard>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <SectionTitle>Maiores compras</SectionTitle>
                <span className="text-caption text-muted">Top 10</span>
              </div>
              <div className="rounded-2xl ring-1 ring-border/60 overflow-x-auto">
                <DataTable>
                  <thead>
                    <tr>
                      <DataTableHead>Data</DataTableHead>
                      <DataTableHead>Estabelecimento</DataTableHead>
                      <DataTableHead>Categoria</DataTableHead>
                      <DataTableHead align="right">Valor</DataTableHead>
                    </tr>
                  </thead>
                  <tbody>
                    {topPurchases.map((t) => (
                      <DataTableRow key={t.id}>
                        <DataTableCell>{t.data}</DataTableCell>
                        <DataTableCell className="max-w-[220px] truncate">
                          {t.estabelecimento}
                        </DataTableCell>
                        <DataTableCell>{t.categoria}</DataTableCell>
                        <DataTableCell align="right" className="font-mono tabular-nums">
                          {formatBRL(t.valorAnalise)}
                        </DataTableCell>
                      </DataTableRow>
                    ))}
                  </tbody>
                </DataTable>
              </div>
            </div>
          </div>
        )}

        {tab === "habitos" && (
          <div className="space-y-4">
            <HabitOfWeekCard narratives={habitNarratives} />

            <WeekendSharePanel stats={weekendStats} dayType={dayType} />

            <div className="overflow-x-auto no-scrollbar">
              <SegmentedControl<DayType>
                value={dayType}
                onChange={setDayType}
                options={[
                  { value: "all", label: "Tudo" },
                  { value: "weekday", label: "Dias úteis" },
                  { value: "weekend", label: "Fim de semana" },
                ]}
              />
            </div>

            <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
              <StatTile
                label="Dia mais caro"
                value={mostExpensiveWeekday?.diaSemana ?? "—"}
                hint={
                  mostExpensiveWeekday
                    ? formatBRL(mostExpensiveWeekday.total)
                    : "Sem dados no período"
                }
              />
              <StatTile
                label="Dia mais leve"
                value={lightestWeekday?.diaSemana ?? "—"}
                hint={
                  lightestWeekday
                    ? formatBRL(lightestWeekday.total)
                    : "Sem dados no período"
                }
              />
              <StatTile
                label="Ticket médio mais alto"
                value={highestAverageTicketWeekday?.diaSemana ?? "—"}
                hint={
                  highestAverageTicketWeekday
                    ? formatBRL(
                        highestAverageTicketWeekday.total /
                          highestAverageTicketWeekday.count,
                      )
                    : "Sem dados no período"
                }
              />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
              <ChartCard
                title="Gastos por dia da semana"
                subtitle="Total no período filtrado"
                info={g("gastosPorDiaSemana")}
              >
                <WeekdayChart data={habitWeekdays} />
              </ChartCard>
              <ChartCard
                title="Transações por dia da semana"
                subtitle="Contagem de saídas"
              >
                <WeekdayChart data={habitWeekdays} metric="count" />
              </ChartCard>
            </div>

            <ChartCard
              title="Categoria por dia da semana"
              subtitle="Top 5 categorias + Outros, empilhadas por dia"
            >
              {habitWeekdayCategories.categories.length === 0 ? (
                <div className="flex h-full items-center justify-center text-sm text-muted">
                  Sem dados no período
                </div>
              ) : (
                <WeekdayCategoryChart data={habitWeekdayCategories} />
              )}
            </ChartCard>
          </div>
        )}

        {tab === "patrimonio" && <WealthProjectionPanel />}

        {tab === "categorias" && (
          <div className="space-y-4">
            <ChartCard title="Gastos por categoria" subtitle="Top 10" info={g("gastosPorCategoria")}>
              <CategoryChart data={cats} />
            </ChartCard>

            <div className="rounded-2xl ring-1 ring-border/60 overflow-x-auto">
              <DataTable>
                <thead>
                  <tr>
                    <DataTableHead>Categoria</DataTableHead>
                    <DataTableHead align="right">Total</DataTableHead>
                    <DataTableHead align="right">
                      <TableHeaderLabel infoKey="tx">Tx</TableHeaderLabel>
                    </DataTableHead>
                    <DataTableHead>%</DataTableHead>
                  </tr>
                </thead>
                <tbody>
                  {cats.slice(0, 15).map((c) => (
                    <DataTableRow key={c.categoria}>
                      <DataTableCell>{c.categoria}</DataTableCell>
                      <DataTableCell align="right" className="font-mono tabular-nums">
                        {formatBRL(c.total)}
                      </DataTableCell>
                      <DataTableCell align="right" className="font-mono tabular-nums">
                        {formatInt(c.count)}
                      </DataTableCell>
                      <DataTableCell>
                        <div className="flex items-center gap-2 min-w-[100px]">
                          <ProgressBar
                            value={(c.total / maxCatTotal) * 100}
                            className="flex-1"
                          />
                          <Num className="text-caption w-10 text-right">
                            {formatPercent(c.share)}
                          </Num>
                        </div>
                      </DataTableCell>
                    </DataTableRow>
                  ))}
                </tbody>
              </DataTable>
            </div>
          </div>
        )}

        {tab === "estabelecimentos" && (
          <div className="space-y-3">
            <div className="overflow-x-auto no-scrollbar">
              <SegmentedControl<"top" | "recurring">
                size="sm"
                value={estView}
                onChange={setEstView}
                options={[
                  { value: "top", label: "Top por valor" },
                  { value: "recurring", label: "Recorrentes (3+)" },
                ]}
              />
            </div>

            <div className="rounded-2xl ring-1 ring-border/60 overflow-x-auto">
              <DataTable>
                <thead>
                  <tr>
                    <DataTableHead>Estabelecimento</DataTableHead>
                    {estView === "recurring" ? (
                      <>
                        <DataTableHead align="right">
                      <TableHeaderLabel infoKey="tx">Tx</TableHeaderLabel>
                    </DataTableHead>
                        <DataTableHead align="right">Total</DataTableHead>
                      </>
                    ) : (
                      <>
                        <DataTableHead align="right">Total</DataTableHead>
                        <DataTableHead align="right">
                      <TableHeaderLabel infoKey="tx">Tx</TableHeaderLabel>
                    </DataTableHead>
                      </>
                    )}
                  </tr>
                </thead>
                <tbody>
                  {(estView === "top" ? ests.slice(0, 15) : recurringEsts).map(
                    (e) => (
                      <DataTableRow key={e.estabelecimento}>
                        <DataTableCell className="max-w-[280px] truncate">
                          {e.estabelecimento}
                        </DataTableCell>
                        {estView === "recurring" ? (
                          <>
                            <DataTableCell align="right" className="font-mono tabular-nums">
                              {formatInt(e.count)}
                            </DataTableCell>
                            <DataTableCell align="right" className="font-mono tabular-nums">
                              {formatBRL(e.total)}
                            </DataTableCell>
                          </>
                        ) : (
                          <>
                            <DataTableCell align="right" className="font-mono tabular-nums">
                              {formatBRL(e.total)}
                            </DataTableCell>
                            <DataTableCell align="right" className="font-mono tabular-nums">
                              {formatInt(e.count)}
                            </DataTableCell>
                          </>
                        )}
                      </DataTableRow>
                    ),
                  )}
                  {estView === "recurring" && recurringEsts.length === 0 && (
                    <tr>
                      <DataTableCell colSpan={3} className="text-muted py-4 text-center">
                        Nenhum estabelecimento com 3+ compras nos filtros atuais.
                      </DataTableCell>
                    </tr>
                  )}
                </tbody>
              </DataTable>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
