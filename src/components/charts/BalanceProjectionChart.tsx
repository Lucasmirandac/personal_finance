"use client";

import {
  CartesianGrid,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { DailyBalancePoint } from "@/lib/projection";
import { formatBRL, formatBRLCompact, formatDateBR } from "@/lib/format";

type Props = { data: DailyBalancePoint[] };

export function BalanceProjectionChart({ data }: Props) {
  const chartData = data.map((p) => ({
    date: p.date,
    label: formatDateBR(p.date).slice(0, 5),
    balance: p.balance,
    events: p.events,
  }));

  return (
    <ResponsiveContainer width="100%" height="100%">
      <LineChart data={chartData} margin={{ top: 8, right: 12, bottom: 0, left: 0 }}>
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
          tickFormatter={formatBRLCompact}
        />
        <ReferenceLine y={0} stroke="var(--danger)" strokeDasharray="4 4" />
        <Tooltip
          contentStyle={{
            background: "var(--surface)",
            border: "1px solid var(--border)",
            borderRadius: 6,
            fontSize: 12,
          }}
          labelFormatter={(_, payload) => {
            const row = payload?.[0]?.payload as { date?: string } | undefined;
            return row?.date ? formatDateBR(row.date) : "";
          }}
          formatter={(value, _name, item) => {
            const row = item.payload as {
              events?: Array<{ description: string; amount: number }>;
            };
            const lines = [formatBRL(Number(value))];
            if (row.events?.length) {
              for (const e of row.events) {
                lines.push(`${e.description}: ${formatBRL(e.amount)}`);
              }
            }
            return [lines.join(" · "), "Saldo"];
          }}
        />
        <Line
          type="monotone"
          dataKey="balance"
          name="Saldo"
          stroke="var(--foreground)"
          strokeWidth={2}
          dot={false}
          activeDot={{ r: 4 }}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
