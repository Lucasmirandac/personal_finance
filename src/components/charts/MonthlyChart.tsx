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
import { formatBRL, formatBRLCompact, formatInt } from "@/lib/format";

type Props = { data: MonthlySeriesPoint[] };

export function MonthlyChart({ data }: Props) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <ComposedChart data={data} margin={{ top: 10, right: 16, bottom: 0, left: 0 }}>
        <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" />
        <XAxis
          dataKey="label"
          stroke="var(--muted)"
          fontSize={12}
        />
        <YAxis
          yAxisId="left"
          stroke="var(--muted)"
          fontSize={12}
          tickFormatter={formatBRLCompact}
        />
        <YAxis
          yAxisId="right"
          orientation="right"
          stroke="var(--muted)"
          fontSize={12}
          tickFormatter={(v) => `${v}`}
        />
        <Tooltip
          contentStyle={{
            background: "var(--surface)",
            border: "1px solid var(--border)",
            borderRadius: 10,
          }}
          formatter={(value, name) => {
            const n = Number(value);
            if (name === "Total") return [formatBRL(n), name];
            return [formatInt(n), name];
          }}
        />
        <Legend />
        <Bar
          yAxisId="left"
          dataKey="total"
          name="Total"
          fill="var(--accent)"
          radius={[6, 6, 0, 0]}
        />
        <Line
          yAxisId="right"
          type="monotone"
          dataKey="count"
          name="Transações"
          stroke="var(--warning)"
          strokeWidth={2}
          dot={{ r: 3 }}
        />
      </ComposedChart>
    </ResponsiveContainer>
  );
}
