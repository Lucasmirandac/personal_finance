"use client";

import {
  Area,
  CartesianGrid,
  ComposedChart,
  Line,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { WealthPoint } from "@/lib/wealth";
import { formatBRL, formatBRLAxis } from "@/lib/format";

type Props = {
  data: WealthPoint[];
  patrimonioInicial: number;
};

export function WealthChart({ data, patrimonioInicial }: Readonly<Props>) {
  const chartData = data.map((p) => ({
    ...p,
    baseline: patrimonioInicial,
  }));

  return (
    <ResponsiveContainer width="100%" height="100%">
      <ComposedChart data={chartData} margin={{ top: 8, right: 12, bottom: 0, left: 0 }}>
        <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" />
        <XAxis
          dataKey="label"
          stroke="var(--muted)"
          fontSize={11}
          interval="preserveStartEnd"
        />
        <YAxis
          stroke="var(--muted)"
          fontSize={11}
          tickFormatter={formatBRLAxis}
        />
        <ReferenceLine
          y={patrimonioInicial}
          stroke="var(--muted)"
          strokeDasharray="4 4"
        />
        <Tooltip
          contentStyle={{
            background: "var(--surface)",
            border: "1px solid var(--border)",
            borderRadius: 6,
            fontSize: 12,
          }}
          formatter={(value, name) => {
            if (name === "baseline") return [formatBRL(Number(value)), "Patrimônio inicial"];
            if (name === "patrimonio") return [formatBRL(Number(value)), "Patrimônio"];
            return [String(value), String(name)];
          }}
          labelFormatter={(label) => String(label)}
        />
        <Area
          type="monotone"
          dataKey="patrimonio"
          name="Patrimônio"
          stroke="var(--success)"
          fill="color-mix(in oklab, var(--success) 18%, transparent)"
          strokeWidth={2}
        />
        <Line
          type="monotone"
          dataKey="baseline"
          name="baseline"
          stroke="var(--muted)"
          strokeDasharray="4 4"
          dot={false}
          strokeWidth={1}
        />
      </ComposedChart>
    </ResponsiveContainer>
  );
}
