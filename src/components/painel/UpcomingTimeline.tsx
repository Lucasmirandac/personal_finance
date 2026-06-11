"use client"

import { useMemo } from "react"
import clsx from "clsx"
import { Badge } from "@/components/ui/Badge"
import { MetricRow } from "@/components/ui/MetricRow"
import { SegmentedControl } from "@/components/ui/SegmentedControl"
import { Num } from "@/components/ui/Num"
import { formatBRL, formatRelativeDays } from "@/lib/format"
import { todayIso } from "@/lib/dates"
import { CashEvent, DailyBalancePoint } from "@/lib/projection"
import {
  EVENT_FILTER_OPTIONS,
  EventFilter,
  EventIcon,
  eventBadgeVariantFor,
} from "@/components/saldoEventVisual"

type Props = {
  series: DailyBalancePoint[]
  filter: EventFilter
  onFilterChange: (value: EventFilter) => void
  onEventClick?: (event: CashEvent) => void
}

type Group = { id: string; label: string; events: CashEvent[] }

export function UpcomingTimeline({ series, filter, onFilterChange, onEventClick }: Props) {
  const groups = useMemo(() => {
    const today = todayIso()
    const events: CashEvent[] = []
    for (const point of series) {
      if (point.date < today) continue
      for (const event of point.events) {
        if (filter !== "all" && event.type !== filter) continue
        events.push(event)
      }
    }
    return splitByRange(events)
  }, [series, filter])

  const balancesByDate = useMemo(() => {
    const map = new Map<string, number>()
    for (const point of series) map.set(point.date, point.balance)
    return map
  }, [series])

  return (
    <section className="space-y-3">
      <SegmentedControl
        size="sm"
        value={filter}
        onChange={onFilterChange}
        options={EVENT_FILTER_OPTIONS.map(([value, label]) => ({ value, label }))}
      />

      {groups.map((group) => {
        if (group.events.length === 0) return null
        const total = group.events.reduce((sum, event) => sum + event.amount, 0)
        return (
          <div key={group.id} className="overflow-hidden rounded-2xl bg-surface ring-1 ring-border/60">
            <div className="flex items-center justify-between px-4 py-2">
              <p className="text-caption uppercase tracking-wider text-muted">{group.label}</p>
              <Num className={clsx("text-xs font-medium", total >= 0 ? "text-success" : "text-danger")}>
                {formatBRL(total)}
              </Num>
            </div>
            <div className="divide-y divide-border/60">
              {group.events.map((event, index) => {
                const clickable = !!event.source && !!onEventClick
                const row = (
                  <>
                    <MetricRow
                      icon={<EventIcon type={event.type} />}
                      tone={event.amount >= 0 ? "success" : "danger"}
                      label={event.description}
                      sublabel={`${formatRelativeDays(event.date)} · saldo ${formatBRL(balancesByDate.get(event.date))}`}
                      value={formatBRL(event.amount)}
                    />
                    <div className="px-4 pb-2">
                      <Badge variant={eventBadgeVariantFor(event.type)}>{event.type}</Badge>
                    </div>
                  </>
                )
                return (
                <div key={`${group.id}-${event.date}-${event.description}-${index}`}>
                  {clickable ? (
                    <button
                      type="button"
                      className="w-full text-left hover:bg-surface-2/60 transition-colors"
                      onClick={() => onEventClick(event)}
                    >
                      {row}
                    </button>
                  ) : (
                    row
                  )}
                </div>
              )})}
            </div>
          </div>
        )
      })}
    </section>
  )
}

function splitByRange(events: CashEvent[]): Group[] {
  const today = todayIso()
  const tomorrow = plusDays(today, 1)
  const inSeven = plusDays(today, 7)
  const inTwentyEight = plusDays(today, 28)

  const groups: Group[] = [
    { id: "today", label: "Hoje", events: [] },
    { id: "tomorrow", label: "Amanhã", events: [] },
    { id: "week", label: "Próximos 7 dias", events: [] },
    { id: "month", label: "Próximas 4 semanas", events: [] },
    { id: "later", label: "Depois", events: [] },
  ]

  for (const event of events) {
    if (event.date === today) groups[0].events.push(event)
    else if (event.date === tomorrow) groups[1].events.push(event)
    else if (event.date <= inSeven) groups[2].events.push(event)
    else if (event.date <= inTwentyEight) groups[3].events.push(event)
    else groups[4].events.push(event)
  }
  return groups
}

function plusDays(iso: string, days: number) {
  const [y, m, d] = iso.split("-").map(Number)
  const next = new Date(Date.UTC(y, m - 1, d) + days * 86400000)
  return `${next.getUTCFullYear()}-${String(next.getUTCMonth() + 1).padStart(2, "0")}-${String(next.getUTCDate()).padStart(2, "0")}`
}
