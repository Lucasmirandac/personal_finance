"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useAppStore } from "@/lib/store";
import { useFilters } from "@/lib/filtersContext";
import { isProjectionReady } from "@/lib/setupStatus";
import {
  applyFilters,
  buildInsights,
  categoryAggregation,
  computeKpis,
  establishmentAggregation,
  expenseComposition,
  monthlySeries,
  weekdayAggregation,
} from "@/lib/aggregations";
import { EmptyState } from "@/components/EmptyState";
import { FiltersDrawer, FiltersButton } from "@/components/FiltersDrawer";
import { NextEventPeek } from "@/components/NextEventPeek";
import { KpiCard, KpiStrip } from "@/components/KpiCard";
import { ChartCard } from "@/components/charts/ChartCard";
import { MonthlyChart } from "@/components/charts/MonthlyChart";
import { CategoryChart } from "@/components/charts/CategoryChart";
import { WeekdayChart } from "@/components/charts/WeekdayChart";
import { MonthlyCountChart } from "@/components/charts/MonthlyCountChart";
import { InsightsPanel } from "@/components/InsightsPanel";
import { ComparisonPanel } from "@/components/ComparisonPanel";
import { Tabs } from "@/components/Tabs";
import { Button } from "@/components/ui/Button";
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
import {
  formatBRL,
  formatDateRangeCaption,
  formatInt,
  formatPercent,
} from "@/lib/format";
import { exportTreatedCsv, exportWorkbook } from "@/lib/exporters";
import { countActiveFilters } from "@/lib/filters";
import {
  budgetAlertSummary,
  budgetUsageForMonth,
  currentMonthIso,
} from "@/lib/budgets";
import { BudgetProgressCard } from "@/components/BudgetProgressCard";
import { FileDown, FileSpreadsheet, List, ArrowRight } from "lucide-react";

const DASH_TABS = [
  { id: "geral", label: "Visão geral" },
  { id: "comparar", label: "Comparar" },
  { id: "orcamentos", label: "Orçamentos" },
  { id: "cartao", label: "Cartão" },
  { id: "categorias", label: "Categorias" },
  { id: "estabelecimentos", label: "Estabelecimentos" },
] as const;

type DashTab = (typeof DASH_TABS)[number]["id"];

function parseDashTab(v: string | null): DashTab {
  if (
    v === "orcamentos" ||
    v === "cartao" ||
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
  const { loaded, dataset, hasAnalysis, normalized, settings, accounts, budgets } =
    useAppStore();
  const { filters, setFilters, clearFilters } = useFilters();
  const searchParams = useSearchParams();
  const router = useRouter();
  const tabParam = searchParams.get("tab");
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [tab, setTab] = useState<DashTab>(() => parseDashTab(tabParam));
  const [estView, setEstView] = useState<"top" | "recurring">("top");

  useEffect(() => {
    setTab(parseDashTab(tabParam));
  }, [tabParam]);

  function onTabChange(id: string) {
    const next = id as DashTab;
    setTab(next);
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
  const projectionReady = isProjectionReady(dataset, settings, accounts);

  const monthIso = currentMonthIso();
  const budgetUsages = useMemo(
    () => budgetUsageForMonth(normalized, budgets, monthIso),
    [normalized, budgets, monthIso],
  );
  const budgetAlerts = useMemo(
    () => budgetAlertSummary(budgetUsages),
    [budgetUsages],
  );

  if (!loaded) return <div className="text-muted">Carregando…</div>;
  if (!hasAnalysis) return <EmptyState />;

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-lg font-semibold tracking-tight">Análise</h1>
          <p className="text-muted text-xs mt-0.5">
            {dataset.sources.length} fonte(s) · {formatInt(normalized.length)} linhas
            {windowCaption && <> · {windowCaption}</>}
          </p>
        </div>
        <div className="flex gap-2 flex-wrap items-center">
          <Link
            href="/transacoes"
            className="inline-flex items-center justify-center gap-1.5 font-medium rounded-md border whitespace-nowrap border-border bg-surface text-foreground hover:bg-surface-2 hover:border-border-strong text-xs px-2 py-1"
          >
            <List size={13} />
            Transações
          </Link>
          <FiltersButton
            activeCount={activeCount}
            onClick={() => setDrawerOpen(true)}
          />
          <Button size="sm" onClick={() => exportTreatedCsv(filtered)}>
            <FileDown size={13} />
            CSV
          </Button>
          <Button
            variant="primary"
            size="sm"
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

      {!projectionReady && (
        <Panel className="px-3 py-2 flex items-center justify-between gap-3 flex-wrap text-sm border-warning/30">
          <p className="text-xs">
            Configure cartões e saldo inicial para ver sua{" "}
            <strong>projeção de saldo</strong>.
          </p>
          <Link
            href="/config?tab=cartoes"
            className="shrink-0 inline-flex items-center justify-center gap-1.5 font-medium rounded-md border whitespace-nowrap border-foreground bg-foreground text-surface hover:opacity-90 text-xs px-2 py-1"
          >
            Configurar
            <ArrowRight size={13} />
          </Link>
        </Panel>
      )}

      {projectionReady && <NextEventPeek />}

      {budgetAlerts.warning + budgetAlerts.danger > 0 && (
        <Panel className="px-3 py-2 flex items-center justify-between gap-3 flex-wrap text-sm border-warning/30">
          <p className="text-xs">
            {budgetAlerts.danger > 0 && (
              <span className="text-danger font-medium">
                {budgetAlerts.danger} categoria
                {budgetAlerts.danger > 1 ? "s" : ""} estourada
                {budgetAlerts.danger > 1 ? "s" : ""}
              </span>
            )}
            {budgetAlerts.danger > 0 && budgetAlerts.warning > 0 && " · "}
            {budgetAlerts.warning > 0 && (
              <span className="text-warning">
                {budgetAlerts.warning} perto do limite
              </span>
            )}
          </p>
          <Button
            size="sm"
            className="shrink-0"
            onClick={() => onTabChange("orcamentos")}
          >
            Ver orçamentos
            <ArrowRight size={13} />
          </Button>
        </Panel>
      )}

      <KpiStrip>
        <KpiCard label="Receitas" value={formatBRL(kpis.totalReceitas)} tone="success" />
        <KpiCard
          label="Despesas"
          value={formatBRL(kpis.totalDespesas)}
          hint={`Cartão ${formatBRL(expenseComp.cartao.total)} · Fixas ${formatBRL(expenseComp.fixas.total)}`}
          tone="danger"
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

      <Tabs tabs={[...DASH_TABS]} active={tab} onChange={onTabChange}>
        {tab === "geral" && (
          <div className="space-y-4">
            <ChartCard
              title="Evolução mensal"
              subtitle="Receitas, despesas e saldo"
            >
              <MonthlyChart data={months} />
            </ChartCard>

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-px bg-border border border-border rounded-lg overflow-hidden">
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
                <div key={k.label} className="bg-surface p-3">
                  <KpiCard label={k.label} value={k.value} hint={k.hint} compact />
                </div>
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
              <Panel className="p-4 space-y-2">
                <p className="text-sm text-muted">
                  Nenhum orçamento ativo. Crie limites em Configurações.
                </p>
                <Link
                  href="/config?tab=orcamentos"
                  className="inline-flex items-center justify-center gap-1.5 font-medium rounded-md border whitespace-nowrap border-foreground bg-foreground text-surface hover:opacity-90 text-xs px-2 py-1"
                >
                  Configurar orçamentos
                </Link>
              </Panel>
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
              <ChartCard title="Transações por mês" subtitle="Contagem de consumo">
                <MonthlyCountChart data={months} />
              </ChartCard>
              <ChartCard title="Por dia da semana" subtitle="Distribuição de gastos">
                <WeekdayChart data={weekdays} />
              </ChartCard>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <SectionTitle>Maiores compras</SectionTitle>
                <span className="text-[11px] text-muted">Top 10</span>
              </div>
              <div className="border border-border rounded-lg overflow-x-auto">
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

        {tab === "categorias" && (
          <div className="space-y-4">
            <ChartCard title="Gastos por categoria" subtitle="Top 10">
              <CategoryChart data={cats} />
            </ChartCard>

            <div className="border border-border rounded-lg overflow-x-auto">
              <DataTable>
                <thead>
                  <tr>
                    <DataTableHead>Categoria</DataTableHead>
                    <DataTableHead align="right">Total</DataTableHead>
                    <DataTableHead align="right">Tx</DataTableHead>
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
                          <Num className="text-[11px] w-10 text-right">
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
            <div className="flex gap-1">
              <Button
                size="sm"
                variant={estView === "top" ? "primary" : "default"}
                onClick={() => setEstView("top")}
              >
                Top por valor
              </Button>
              <Button
                size="sm"
                variant={estView === "recurring" ? "primary" : "default"}
                onClick={() => setEstView("recurring")}
              >
                Recorrentes (3+)
              </Button>
            </div>

            <div className="border border-border rounded-lg overflow-x-auto">
              <DataTable>
                <thead>
                  <tr>
                    <DataTableHead>Estabelecimento</DataTableHead>
                    {estView === "recurring" ? (
                      <>
                        <DataTableHead align="right">Tx</DataTableHead>
                        <DataTableHead align="right">Total</DataTableHead>
                      </>
                    ) : (
                      <>
                        <DataTableHead align="right">Total</DataTableHead>
                        <DataTableHead align="right">Tx</DataTableHead>
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
      </Tabs>
    </div>
  );
}
