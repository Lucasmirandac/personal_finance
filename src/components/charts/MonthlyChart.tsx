"use client";

import {
  Bar,
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { MonthlySeriesPoint } from "@/lib/aggregations";
import { formatBRL, formatBRLCompact } from "@/lib/format";

type Props = { data: MonthlySeriesPoint[] };

export function MonthlyChart({ data }: Props) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <ComposedChart data={data} margin={{ top: 10, right: 16, bottom: 0, left: 0 }}>
        <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" />
        <XAxis dataKey="label" stroke="var(--muted)" fontSize={12} />
        <YAxis
          yAxisId="left"
          stroke="var(--muted)"
          fontSize={12}
          tickFormatter={formatBRLCompact}
        />
        <Tooltip
          contentStyle={{
            background: "var(--surface)",
            border: "1px solid var(--border)",
            borderRadius: 10,
          }}
          formatter={(value, name) => [formatBRL(Number(value)), String(name)]}
        />
        <Legend />
        <Bar
          yAxisId="left"
          dataKey="receitas"
          name="Receitas"
          fill="var(--success)"
          radius={[4, 4, 0, 0]}
        />
        <Bar
          yAxisId="left"
          dataKey="despesas"
          name="Despesas"
          fill="var(--accent)"
          radius={[4, 4, 0, 0]}
        />
        <Line
          yAxisId="left"
          type="monotone"
          dataKey="saldo"
          name="Saldo"
          stroke="var(--warning)"
          strokeWidth={2}
          dot={{ r: 3 }}
        />
      </ComposedChart>
    </ResponsiveContainer>
  );
}
