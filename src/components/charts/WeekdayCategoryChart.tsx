"use client"

import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"
import type { WeekdayCategoryResult } from "@/lib/aggregations"
import { categoryColor } from "@/lib/chartColors"
import { formatBRL, formatBRLAxis } from "@/lib/format"

type Props = Readonly<{ data: WeekdayCategoryResult }>

const OTHERS_FILL = "var(--muted)"
const OTHERS_LABEL = "Outros"

export function WeekdayCategoryChart({ data }: Props) {
  const { rows, categories } = data

  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={rows} margin={{ top: 8, right: 16, bottom: 0, left: 0 }}>
        <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" />
        <XAxis dataKey="diaSemana" stroke="var(--muted)" fontSize={12} />
        <YAxis
          stroke="var(--muted)"
          fontSize={12}
          tickFormatter={(value) => formatBRLAxis(Number(value))}
        />
        <Tooltip
          contentStyle={{
            background: "var(--surface)",
            border: "1px solid var(--border)",
            borderRadius: 10,
          }}
          formatter={(value) => formatBRL(Number(value))}
        />
        <Legend
          wrapperStyle={{ fontSize: 12, paddingTop: 8 }}
          iconType="circle"
        />
        {categories.map((categoria, index) => {
          const isOthers = categoria === OTHERS_LABEL
          return (
            <Bar
              key={categoria}
              dataKey={categoria}
              stackId="a"
              fill={isOthers ? OTHERS_FILL : categoryColor(index)}
              radius={
                index === categories.length - 1 ? [6, 6, 0, 0] : [0, 0, 0, 0]
              }
            />
          )
        })}
      </BarChart>
    </ResponsiveContainer>
  )
}
