"use client";

import { useEffect, useState } from "react";
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
import { categoryColor, resolveCategoryColors } from "@/lib/chartColors";
import { formatBRL, formatBRLAxis } from "@/lib/format";

type Props = { data: CategoryAgg[] };

export function CategoryChart({ data }: Props) {
  const slice = data.slice(0, 10);
  const [colors, setColors] = useState<string[]>(() =>
    slice.map((_, i) => categoryColor(i)),
  );

  useEffect(() => {
    setColors(resolveCategoryColors(slice.length));
  }, [slice.length]);

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
          tickFormatter={formatBRLAxis}
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
            borderRadius: 6,
          }}
          formatter={(value) => formatBRL(Number(value))}
        />
        <Bar dataKey="total" radius={[0, 6, 6, 0]}>
          {slice.map((_, i) => (
            <Cell key={i} fill={colors[i] ?? categoryColor(i)} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
