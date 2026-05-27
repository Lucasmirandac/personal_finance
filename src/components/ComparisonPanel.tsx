"use client";

import { useEffect, useMemo, useState } from "react";
import clsx from "clsx";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { ArrowDown, ArrowUp, Minus } from "lucide-react";
import {
  availableComparisonMonths,
  compareMonths,
  ComparisonDelta,
  latestMonthWithData,
} from "@/lib/aggregations";
import { TransactionNormalized } from "@/lib/types";
import { formatBRL, formatBRLAxis, formatMonthLabel, formatPercent } from "@/lib/format";
import { KpiCard, KpiStrip } from "@/components/KpiCard";
import { ChartCard } from "@/components/charts/ChartCard";
import {
  DataTable,
  DataTableCell,
  DataTableHead,
  DataTableRow,
} from "@/components/ui/DataTable";
import { Num } from "@/components/ui/Num";
import { Panel } from "@/components/ui/Panel";
import { SectionTitle } from "@/components/ui/SectionTitle";
import { Select } from "@/components/ui/Input";

type Props = {
  data: TransactionNormalized[];
};

function DeltaBadge({
  delta,
  compact = false,
}: {
  delta: ComparisonDelta;
  compact?: boolean;
}) {
  if (delta.direction === "new") {
    return (
      <span className="text-[11px] font-medium text-info">novo</span>
    );
  }
  if (delta.direction === "flat" && delta.pct === 0) {
    return (
      <span className="text-[11px] text-muted inline-flex items-center gap-0.5">
        <Minus size={compact ? 11 : 12} />
        0%
      </span>
    );
  }

  const isUp = delta.direction === "up";
  const Icon = isUp ? ArrowUp : delta.direction === "down" ? ArrowDown : Minus;
  const color = isUp
    ? "text-danger"
    : delta.direction === "down"
      ? "text-success"
      : "text-muted";

  const label =
    delta.pct != null
      ? `${delta.pct > 0 ? "+" : ""}${formatPercent(delta.pct)}`
      : "—";

  return (
    <Num
      className={clsx(
        "inline-flex items-center gap-0.5 font-medium",
        compact ? "text-[11px]" : "text-xs",
        color,
      )}
    >
      <Icon size={compact ? 11 : 12} />
      {label}
    </Num>
  );
}

export function ComparisonPanel({ data }: Props) {
  const months = useMemo(() => availableComparisonMonths(data), [data]);
  const defaultAnchor = useMemo(() => latestMonthWithData(data), [data]);
  const [anchor, setAnchor] = useState<string | null>(defaultAnchor);

  useEffect(() => {
    setAnchor(defaultAnchor);
  }, [defaultAnchor]);

  const comparison = useMemo(() => {
    if (!anchor) return null;
    return compareMonths(data, anchor);
  }, [data, anchor]);

  if (months.length === 0 || !comparison || !anchor) {
    return (
      <Panel className="p-4">
        <p className="text-sm text-muted">
          Sem dados suficientes para comparar. Importe transações com despesas.
        </p>
      </Panel>
    );
  }

  const { totals, rows, hasPrev, hasPrevYear } = comparison;
  const anchorLabel = formatMonthLabel(anchor);
  const prevLabel = formatMonthLabel(comparison.prev);
  const prevYearLabel = formatMonthLabel(comparison.prevYear);

  const chartData = rows.slice(0, 10).map((r) => ({
    categoria: r.categoria,
    atual: r.current,
    anterior: r.prev,
    anoPassado: r.prevYear,
  }));

  const showPartialWarning = !hasPrev && !hasPrevYear;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <label
            htmlFor="comparison-anchor"
            className="text-[11px] font-semibold tracking-wider uppercase text-muted block mb-1"
          >
            Mês de referência
          </label>
          <Select
            id="comparison-anchor"
            className="w-auto min-w-[140px]"
            value={anchor}
            onChange={(e) => setAnchor(e.target.value)}
          >
            {months.map((m) => (
              <option key={m} value={m}>
                {formatMonthLabel(m)}
              </option>
            ))}
          </Select>
          <p className="text-[11px] text-muted mt-1">
            Comparando {anchorLabel}
            {hasPrev && <> vs {prevLabel}</>}
            {hasPrevYear && <> vs {prevYearLabel}</>}
          </p>
        </div>
      </div>

      {showPartialWarning && (
        <Panel className="px-3 py-2 border-warning/30">
          <p className="text-xs text-muted">
            Sem despesas no mês anterior nem no mesmo mês do ano passado. Mostrando
            apenas o período de referência.
          </p>
        </Panel>
      )}

      <KpiStrip>
        <KpiCard label={anchorLabel} value={formatBRL(totals.current)} tone="danger" />
        <KpiCard
          label={hasPrev ? prevLabel : "Mês anterior"}
          value={hasPrev ? formatBRL(totals.prev) : "—"}
          hint={
            hasPrev ? (
              <span className="inline-flex items-center gap-1">
                vs {anchorLabel}: <DeltaBadge delta={totals.deltaPrev} compact />
              </span>
            ) : undefined
          }
        />
        <KpiCard
          label={hasPrevYear ? prevYearLabel : "Mesmo mês ano passado"}
          value={hasPrevYear ? formatBRL(totals.prevYear) : "—"}
          hint={
            hasPrevYear ? (
              <span className="inline-flex items-center gap-1">
                vs {anchorLabel}:{" "}
                <DeltaBadge delta={totals.deltaPrevYear} compact />
              </span>
            ) : undefined
          }
        />
      </KpiStrip>

      {chartData.length > 0 && (hasPrev || hasPrevYear) && (
        <ChartCard title="Top categorias" subtitle="Top 10 por gasto no mês de referência">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={chartData}
              margin={{ top: 8, right: 16, bottom: 0, left: 0 }}
            >
              <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" />
              <XAxis
                dataKey="categoria"
                stroke="var(--muted)"
                fontSize={11}
                interval={0}
                angle={-25}
                textAnchor="end"
                height={72}
              />
              <YAxis
                stroke="var(--muted)"
                fontSize={12}
                tickFormatter={formatBRLAxis}
              />
              <Tooltip
                contentStyle={{
                  background: "var(--surface)",
                  border: "1px solid var(--border)",
                  borderRadius: 6,
                }}
                formatter={(value) => formatBRL(Number(value))}
              />
              <Legend />
              <Bar
                dataKey="atual"
                name={anchorLabel}
                fill="var(--danger)"
                radius={[4, 4, 0, 0]}
              />
              {hasPrev && (
                <Bar
                  dataKey="anterior"
                  name={prevLabel}
                  fill="var(--muted)"
                  radius={[4, 4, 0, 0]}
                />
              )}
              {hasPrevYear && (
                <Bar
                  dataKey="anoPassado"
                  name={prevYearLabel}
                  fill="var(--info)"
                  radius={[4, 4, 0, 0]}
                />
              )}
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      )}

      <div>
        <SectionTitle className="block mb-2">Por categoria</SectionTitle>
        <div className="border border-border rounded-lg overflow-x-auto">
          <DataTable>
            <thead>
              <tr>
                <DataTableHead>Categoria</DataTableHead>
                <DataTableHead align="right">{anchorLabel}</DataTableHead>
                {hasPrev && (
                  <DataTableHead align="right">{prevLabel}</DataTableHead>
                )}
                {hasPrev && (
                  <DataTableHead align="right">Δ anterior</DataTableHead>
                )}
                {hasPrevYear && (
                  <DataTableHead align="right">{prevYearLabel}</DataTableHead>
                )}
                {hasPrevYear && (
                  <DataTableHead align="right">Δ ano passado</DataTableHead>
                )}
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <DataTableRow key={r.categoria}>
                  <DataTableCell>{r.categoria}</DataTableCell>
                  <DataTableCell align="right" className="font-mono tabular-nums">
                    {formatBRL(r.current)}
                  </DataTableCell>
                  {hasPrev && (
                    <DataTableCell align="right" className="font-mono tabular-nums">
                      {formatBRL(r.prev)}
                    </DataTableCell>
                  )}
                  {hasPrev && (
                    <DataTableCell align="right" className="font-mono tabular-nums">
                      <DeltaBadge delta={r.deltaPrev} />
                    </DataTableCell>
                  )}
                  {hasPrevYear && (
                    <DataTableCell align="right" className="font-mono tabular-nums">
                      {formatBRL(r.prevYear)}
                    </DataTableCell>
                  )}
                  {hasPrevYear && (
                    <DataTableCell align="right" className="font-mono tabular-nums">
                      <DeltaBadge delta={r.deltaPrevYear} />
                    </DataTableCell>
                  )}
                </DataTableRow>
              ))}
            </tbody>
          </DataTable>
        </div>
      </div>
    </div>
  );
}
