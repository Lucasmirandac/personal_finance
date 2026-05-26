"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { CategoryAgg } from "@/lib/aggregations";
import { formatBRL, formatBRLCompact } from "@/lib/format";

const PALETTE = [
  "#6366f1",
  "#22c55e",
  "#f59e0b",
  "#ec4899",
  "#06b6d4",
  "#a855f7",
  "#ef4444",
  "#14b8a6",
  "#84cc16",
  "#f97316",
  "#0ea5e9",
  "#eab308",
];

type Props = { data: CategoryAgg[] };

export function CategoryChart({ data }: Props) {
  const slice = data.slice(0, 10);
  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart
        layout="vertical"
        data={slice}
        margin={{ top: 8, right: 16, bottom: 0, left: 4 }}
      >
        <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" />
        <XAxis
          type="number"
          stroke="var(--muted)"
          fontSize={12}
          tickFormatter={formatBRLCompact}
        />
        <YAxis
          type="category"
          dataKey="categoria"
          stroke="var(--muted)"
          width={120}
          fontSize={12}
        />
        <Tooltip
          contentStyle={{
            background: "var(--surface)",
            border: "1px solid var(--border)",
            borderRadius: 10,
          }}
          formatter={(value) => formatBRL(Number(value))}
        />
        <Bar dataKey="total" radius={[0, 6, 6, 0]}>
          {slice.map((_, i) => (
            <Cell key={i} fill={PALETTE[i % PALETTE.length]} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
