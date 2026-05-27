"use client"

import { Area, AreaChart, ReferenceDot, ResponsiveContainer } from "recharts"
import { DailyBalancePoint } from "@/lib/projection"
import { todayIso } from "@/lib/dates"

type Props = {
  data: DailyBalancePoint[]
}

const GREEN = "var(--system-green)"
const RED = "var(--system-red)"

export function BalanceSparkline({ data }: Props) {
  if (data.length === 0) return null
  const today = todayIso()
  const rowToday = data.find((point) => point.date >= today) ?? data[data.length - 1]

  const balances = data.map((point) => point.balance)
  const dataMin = Math.min(...balances)
  const dataMax = Math.max(...balances)
  // baseValue={0} stretches the y-domain to include 0, so the gradient must
  // map to [min(0, dataMin), max(0, dataMax)] — not the raw [dataMin, dataMax].
  const effectiveMax = Math.max(0, dataMax)
  const effectiveMin = Math.min(0, dataMin)
  const span = effectiveMax - effectiveMin
  const zeroOffset = span === 0 ? 0 : effectiveMax / span

  const dotColor = rowToday.balance >= 0 ? GREEN : RED

  return (
    <div className="h-20 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data}>
          <defs>
            <linearGradient id="sparkStroke" x1="0" y1="0" x2="0" y2="1">
              <stop offset={0} stopColor={GREEN} />
              <stop offset={zeroOffset} stopColor={GREEN} />
              <stop offset={zeroOffset} stopColor={RED} />
              <stop offset={1} stopColor={RED} />
            </linearGradient>
            <linearGradient id="sparkFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset={0} stopColor={GREEN} stopOpacity={0.32} />
              <stop offset={zeroOffset} stopColor={GREEN} stopOpacity={0} />
              <stop offset={zeroOffset} stopColor={RED} stopOpacity={0} />
              <stop offset={1} stopColor={RED} stopOpacity={0.32} />
            </linearGradient>
          </defs>
          <Area
            type="monotone"
            dataKey="balance"
            stroke="url(#sparkStroke)"
            strokeWidth={2}
            fill="url(#sparkFill)"
            baseValue={0}
          />
          <ReferenceDot
            x={rowToday.date}
            y={rowToday.balance}
            r={4}
            fill="var(--surface)"
            stroke={dotColor}
            strokeWidth={2}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}
