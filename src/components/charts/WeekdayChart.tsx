"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { WeekdayAgg } from "@/lib/aggregations";
import { formatBRL, formatBRLAxis } from "@/lib/format";

type Props = { data: WeekdayAgg[] };

export function WeekdayChart({ data }: Props) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={data} margin={{ top: 8, right: 16, bottom: 0, left: 0 }}>
        <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" />
        <XAxis dataKey="diaSemana" stroke="var(--muted)" fontSize={12} />
        <YAxis
          stroke="var(--muted)"
          fontSize={12}
          tickFormatter={formatBRLAxis}
        />
        <Tooltip
          contentStyle={{
            background: "var(--surface)",
            border: "1px solid var(--border)",
            borderRadius: 10,
          }}
          formatter={(v) => formatBRL(Number(v))}
        />
        <Bar dataKey="total" fill="var(--accent)" radius={[6, 6, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}
