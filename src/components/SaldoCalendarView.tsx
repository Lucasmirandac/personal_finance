"use client";

import { useMemo, useState } from "react";
import clsx from "clsx";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Num } from "@/components/ui/Num";
import { Panel } from "@/components/ui/Panel";
import { SectionTitle } from "@/components/ui/SectionTitle";
import {
  CashEvent,
  DailyBalancePoint,
} from "@/lib/projection";
import { formatBRL, formatBRLCompact, formatDateBR } from "@/lib/format";
import {
  addMonthsYyyyMm,
  isoFromParts,
  parseIso,
  todayIso,
  yyyyMmFromIso,
} from "@/lib/dates";
import {
  EventFilter,
  EventIcon,
  EVENT_LABELS,
  eventBadgeVariantFor,
  eventLegendDotClass,
} from "@/components/saldoEventVisual";

const WEEKDAYS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"] as const;

const MONTH_NAMES = [
  "Janeiro",
  "Fevereiro",
  "Março",
  "Abril",
  "Maio",
  "Junho",
  "Julho",
  "Agosto",
  "Setembro",
  "Outubro",
  "Novembro",
  "Dezembro",
] as const;

type GridCell = {
  date: string;
  inMonth: boolean;
};

const eventChipToneClasses: Record<CashEvent["type"], string> = {
  fatura: "text-warning border-[var(--border-warning-soft)]",
  fixa: "text-warning border-[var(--border-warning-soft)]",
  receita: "text-success border-[var(--border-success-soft)]",
  ancora: "text-muted",
};

function monthOverlapsRange(
  yyyyMm: string,
  anchorISO: string,
  horizonEndISO: string,
): boolean {
  const [y, m] = yyyyMm.split("-").map(Number);
  const monthStart = isoFromParts(y, m, 1);
  const lastDay = new Date(Date.UTC(y, m, 0)).getUTCDate();
  const monthEnd = isoFromParts(y, m, lastDay);
  return monthEnd >= anchorISO && monthStart <= horizonEndISO;
}

function buildMonthGrid(yyyyMm: string): GridCell[] {
  const [y, m] = yyyyMm.split("-").map(Number);
  const firstWeekday = new Date(Date.UTC(y, m - 1, 1)).getUTCDay();
  const daysInMonth = new Date(Date.UTC(y, m, 0)).getUTCDate();

  const cells: GridCell[] = [];
  const prevMonth = addMonthsYyyyMm(yyyyMm, -1);
  const [py, pm] = prevMonth.split("-").map(Number);
  const prevDays = new Date(Date.UTC(py, pm, 0)).getUTCDate();

  for (let i = firstWeekday - 1; i >= 0; i--) {
    const day = prevDays - i;
    cells.push({
      date: isoFromParts(py, pm, day),
      inMonth: false,
    });
  }

  for (let d = 1; d <= daysInMonth; d++) {
    cells.push({ date: isoFromParts(y, m, d), inMonth: true });
  }

  const [ny, nm] = addMonthsYyyyMm(yyyyMm, 1).split("-").map(Number);
  let nextDay = 1;
  while (cells.length < 42) {
    cells.push({
      date: isoFromParts(ny, nm, nextDay),
      inMonth: false,
    });
    nextDay += 1;
  }

  return cells;
}

function indexEventsByDate(
  series: DailyBalancePoint[],
  filter: EventFilter,
): Map<string, CashEvent[]> {
  const map = new Map<string, CashEvent[]>();
  for (const point of series) {
    const events =
      filter === "all"
        ? point.events
        : point.events.filter((e) => e.type === filter);
    if (events.length > 0) {
      map.set(point.date, events);
    }
  }
  return map;
}

function balanceByDate(series: DailyBalancePoint[]): Map<string, number> {
  const map = new Map<string, number>();
  for (const point of series) {
    map.set(point.date, point.balance);
  }
  return map;
}

function calendarCellLabel(
  date: string,
  events: CashEvent[],
  balance?: number,
): string {
  const parts = [formatDateBR(date)];
  if (events.length > 0) {
    parts.push(
      `${events.length} evento${events.length === 1 ? "" : "s"}`,
    );
  } else {
    parts.push("nenhum evento");
  }
  if (balance != null) {
    parts.push(`saldo ${formatBRLCompact(balance)}`);
  }
  return parts.join(", ");
}

type Props = {
  series: DailyBalancePoint[];
  anchorISO: string;
  horizonEndISO: string;
  filter: EventFilter;
};

export function SaldoCalendarView({
  series,
  anchorISO,
  horizonEndISO,
  filter,
}: Props) {
  const today = todayIso();
  const initialMonth = useMemo(() => {
    const target = today >= anchorISO && today <= horizonEndISO ? today : anchorISO;
    return yyyyMmFromIso(target);
  }, [today, anchorISO, horizonEndISO]);

  const [viewMonth, setViewMonth] = useState(initialMonth);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  const eventsByDate = useMemo(
    () => indexEventsByDate(series, filter),
    [series, filter],
  );
  const balances = useMemo(() => balanceByDate(series), [series]);
  const grid = useMemo(() => buildMonthGrid(viewMonth), [viewMonth]);

  const [vy, vm] = viewMonth.split("-").map(Number);
  const monthLabel = `${MONTH_NAMES[vm - 1]} ${vy}`;

  const canPrev = monthOverlapsRange(
    addMonthsYyyyMm(viewMonth, -1),
    anchorISO,
    horizonEndISO,
  );
  const canNext = monthOverlapsRange(
    addMonthsYyyyMm(viewMonth, 1),
    anchorISO,
    horizonEndISO,
  );

  const selectedEvents = selectedDate
    ? (eventsByDate.get(selectedDate) ?? [])
    : [];

  function isInHorizon(date: string): boolean {
    return date >= anchorISO && date <= horizonEndISO;
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-1">
          <Button
            size="sm"
            disabled={!canPrev}
            onClick={() => setViewMonth(addMonthsYyyyMm(viewMonth, -1))}
            aria-label="Mês anterior"
          >
            <ChevronLeft size={14} />
          </Button>
          <span className="text-[15px] font-semibold min-w-40 text-center">
            {monthLabel}
          </span>
          <Button
            size="sm"
            disabled={!canNext}
            onClick={() => setViewMonth(addMonthsYyyyMm(viewMonth, 1))}
            aria-label="Próximo mês"
          >
            <ChevronRight size={14} />
          </Button>
        </div>
        <Button
          size="sm"
          onClick={() => {
            setViewMonth(yyyyMmFromIso(today));
            setSelectedDate(today);
          }}
        >
          Hoje
        </Button>
      </div>

      <div className="flex flex-wrap gap-x-4 gap-y-3 text-caption text-muted">
        {(["fatura", "fixa", "receita"] as const).map((type) => (
          <span key={type} className="inline-flex items-center gap-1.5">
            <span className={eventLegendDotClass(type)} />
            {EVENT_LABELS[type]}
          </span>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-px mb-px">
        {WEEKDAYS.map((d) => (
          <span
            key={d}
            className="text-center text-[10px] font-medium text-muted uppercase tracking-wide py-1"
          >
            {d}
          </span>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-px bg-border border border-border rounded-md overflow-hidden">
        {grid.map((cell) => {
          const events = eventsByDate.get(cell.date) ?? [];
          const balance = balances.get(cell.date);
          const inHorizon = isInHorizon(cell.date);
          const isToday = cell.date === today;
          const isSelected = cell.date === selectedDate;

          return (
            <button
              key={cell.date}
              type="button"
              className={clsx(
                "flex flex-col gap-0.5 min-h-[5.5rem] sm:min-h-[4.25rem] p-1 sm:p-1.5 bg-surface text-left cursor-pointer border-0 hover:bg-surface-2 disabled:cursor-default disabled:opacity-45",
                "data-[selected=true]:outline data-[selected=true]:outline-2 data-[selected=true]:outline-accent data-[selected=true]:-outline-offset-2 data-[selected=true]:z-[1]",
                "data-[outside=true]:bg-[var(--bg-surface-alt)] data-[outside=true]:[&_.calendar-day-num]:text-muted data-[outside=true]:[&_.calendar-day-num]:opacity-55",
                "data-[today=true]:[&_.calendar-day-num]:font-bold data-[today=true]:[&_.calendar-day-num]:text-accent",
              )}
              data-outside={!cell.inMonth || undefined}
              data-today={isToday || undefined}
              data-selected={isSelected || undefined}
              disabled={!inHorizon}
              aria-label={calendarCellLabel(cell.date, events, balance)}
              aria-pressed={isSelected}
              onClick={() =>
                setSelectedDate((prev) =>
                  prev === cell.date ? null : cell.date,
                )
              }
            >
              <span className="calendar-day-num text-caption leading-none">
                {parseIso(cell.date)[2]}
              </span>
              <div className="flex flex-col gap-px flex-1 min-h-0 overflow-hidden">
                {events.slice(0, 3).map((e, i) => (
                  <div
                    key={`${e.type}-${e.description}-${i}`}
                    className={clsx(
                      "flex items-center gap-0.5 px-0.5 py-px rounded-sm text-[9px] leading-tight whitespace-nowrap overflow-hidden text-ellipsis border bg-surface-2",
                      eventChipToneClasses[e.type],
                    )}
                    title={e.description}
                  >
                    <EventIcon type={e.type} />
                    <Num className="ml-auto shrink-0 font-semibold">
                      {formatBRLCompact(e.amount)}
                    </Num>
                  </div>
                ))}
                {events.length > 3 && (
                  <span className="text-[9px] text-muted pl-0.5">
                    +{events.length - 3}
                  </span>
                )}
              </div>
              {inHorizon && balance != null && (
                <Num
                  className={clsx(
                    "mt-auto text-[9px] font-semibold whitespace-nowrap overflow-hidden text-ellipsis",
                    balance >= 0 ? "text-success" : "text-danger",
                  )}
                >
                  {formatBRLCompact(balance)}
                </Num>
              )}
            </button>
          );
        })}
      </div>

      {selectedDate && (
        <Panel className="mt-3 p-3">
          <div className="flex items-center justify-between gap-2 mb-2">
            <SectionTitle className="text-sm">
              Eventos de {formatDateBR(selectedDate)}
            </SectionTitle>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setSelectedDate(null)}
              aria-label="Fechar"
            >
              <X size={14} />
            </Button>
          </div>
          {selectedEvents.length > 0 ? (
            <div className="divide-y">
              {selectedEvents.map((e, i) => (
                <div
                  key={`${e.type}-${e.description}-${i}`}
                  className="flex items-center justify-between gap-2 py-2 text-sm"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <Badge
                      variant={eventBadgeVariantFor(e.type)}
                      className="gap-1 shrink-0"
                    >
                      <EventIcon type={e.type} />
                      {EVENT_LABELS[e.type]}
                    </Badge>
                    <span className="truncate text-xs">{e.description}</span>
                  </div>
                  <Num
                    className={clsx(
                      "text-xs font-medium shrink-0",
                      e.amount >= 0 ? "text-success" : "text-danger",
                    )}
                  >
                    {formatBRL(e.amount)}
                  </Num>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-muted">Nenhum evento neste dia.</p>
          )}
          {balances.has(selectedDate) && (
            <p className="text-xs text-muted mt-2 pt-2 border-t border-border">
              Saldo projetado:{" "}
              <Num
                className={clsx(
                  "font-medium",
                  (balances.get(selectedDate) ?? 0) >= 0
                    ? "text-success"
                    : "text-danger",
                )}
              >
                {formatBRL(balances.get(selectedDate))}
              </Num>
            </p>
          )}
        </Panel>
      )}
    </div>
  );
}
