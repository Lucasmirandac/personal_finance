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
import { formatBRL, formatBRLAxis, formatInt } from "@/lib/format";

type Props = Readonly<{ data: WeekdayAgg[]; metric?: "total" | "count" }>;

export function WeekdayChart({ data, metric = "total" }: Props) {
  const isCountMetric = metric === "count";

  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={data} margin={{ top: 8, right: 16, bottom: 0, left: 0 }}>
        <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" />
        <XAxis dataKey="diaSemana" stroke="var(--muted)" fontSize={12} />
        <YAxis
          stroke="var(--muted)"
          fontSize={12}
          tickFormatter={(value) =>
            isCountMetric ? formatInt(Number(value)) : formatBRLAxis(Number(value))
          }
        />
        <Tooltip
          contentStyle={{
            background: "var(--surface)",
            border: "1px solid var(--border)",
            borderRadius: 10,
          }}
          formatter={(value) =>
            isCountMetric ? formatInt(Number(value)) : formatBRL(Number(value))
          }
        />
        <Bar dataKey={metric} fill="var(--accent)" radius={[6, 6, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}
