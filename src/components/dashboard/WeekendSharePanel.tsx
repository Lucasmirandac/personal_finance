"use client";

import type { DayType, WeekendStats } from "@/lib/aggregations";
import { formatBRL, formatPercent } from "@/lib/format";
import { Num } from "@/components/ui/Num";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { StatTile } from "@/components/ui/StatTile";

type Props = Readonly<{
  stats: WeekendStats;
  dayType: DayType;
}>;

function hasWeekendData(stats: WeekendStats): boolean {
  return stats.weekendWeekCount > 0 || stats.weekendTotal > 0;
}

function hasWeekdayData(stats: WeekendStats): boolean {
  return stats.weekdayDayCount > 0 || stats.weekdayTotal > 0;
}

export function WeekendSharePanel({ stats, dayType }: Props) {
  const isWeekdayMode = dayType === "weekday";

  const costLabel = isWeekdayMode
    ? "Custo médio do dia útil"
    : "Custo médio do fim de semana";

  const costValue = isWeekdayMode
    ? hasWeekdayData(stats)
      ? formatBRL(stats.avgPerWeekday)
      : "—"
    : hasWeekendData(stats)
      ? formatBRL(stats.avgPerWeekend)
      : "—";

  const costHint = isWeekdayMode
    ? stats.weekdayDayCount > 0
      ? `${stats.weekdayDayCount} dias úteis com gasto`
      : "Sem dados no período"
    : stats.weekendWeekCount > 0
      ? `${stats.weekendWeekCount} fim${stats.weekendWeekCount > 1 ? "s" : ""} de semana no período`
      : "Sem dados no período";

  const sharePct = isWeekdayMode
    ? Math.max(0, 100 - stats.weekendShare)
    : stats.weekendShare;

  const shareLabel = isWeekdayMode
    ? `Dias úteis representam ${formatPercent(sharePct)} do seu gasto`
    : `Fim de semana representa ${formatPercent(sharePct)} do seu gasto`;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      <StatTile
        label={costLabel}
        value={costValue}
        hint={costHint}
        tone={isWeekdayMode ? "info" : "warning"}
      />
      <div className="rounded-2xl bg-surface p-4 ring-1 ring-border/60 shadow-[var(--shadow-card)] flex flex-col justify-center gap-3">
        <p className="text-[10px] uppercase tracking-wider text-muted">
          {isWeekdayMode ? "Share dias úteis" : "Share fim de semana"}
        </p>
        <Num className="text-2xl font-semibold tracking-tight num-display text-foreground">
          {stats.weekendTotal + stats.weekdayTotal > 0
            ? formatPercent(sharePct)
            : "—"}
        </Num>
        <ProgressBar value={sharePct} className="h-1.5" />
        <p className="text-xs text-muted leading-snug">{shareLabel}</p>
      </div>
    </div>
  );
}
