"use client"

import { Area, AreaChart, ReferenceDot, ResponsiveContainer } from "recharts"
import { DailyBalancePoint } from "@/lib/projection"
import { todayIso } from "@/lib/dates"

type Props = {
  data: DailyBalancePoint[]
}

export function BalanceSparkline({ data }: Props) {
  if (data.length === 0) return null
  const today = todayIso()
  const rowToday = data.find((point) => point.date >= today) ?? data[data.length - 1]
  const toneVar = rowToday.balance >= 0 ? "var(--system-green)" : "var(--system-red)"

  return (
    <div className="h-20 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data}>
          <defs>
            <linearGradient id="sparkFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={toneVar} stopOpacity={0.32} />
              <stop offset="100%" stopColor={toneVar} stopOpacity={0} />
            </linearGradient>
          </defs>
          <Area
            type="monotone"
            dataKey="balance"
            stroke={toneVar}
            strokeWidth={2}
            fill="url(#sparkFill)"
          />
          <ReferenceDot
            x={rowToday.date}
            y={rowToday.balance}
            r={4}
            fill="var(--surface)"
            stroke={toneVar}
            strokeWidth={2}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}
