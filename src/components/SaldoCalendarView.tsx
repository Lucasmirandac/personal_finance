"use client";

import { useMemo, useState } from "react";
import clsx from "clsx";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import {
  CashEvent,
  DailyBalancePoint,
} from "@/lib/projection";
import { formatBRL, formatBRLCompact, formatDateBR } from "@/lib/format";
import {
  EventFilter,
  EventIcon,
  EVENT_LABELS,
  eventBadgeClass,
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

function todayIso(): string {
  const t = new Date();
  return `${t.getUTCFullYear()}-${String(t.getUTCMonth() + 1).padStart(2, "0")}-${String(t.getUTCDate()).padStart(2, "0")}`;
}

function parseIso(iso: string): [number, number, number] {
  const [y, m, d] = iso.split("-").map(Number);
  return [y, m, d];
}

function isoFromParts(year: number, month: number, day: number): string {
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function addMonthsYyyyMm(yyyyMm: string, delta: number): string {
  const [y, m] = yyyyMm.split("-").map(Number);
  let month = m + delta;
  let year = y;
  while (month > 12) {
    month -= 12;
    year += 1;
  }
  while (month < 1) {
    month += 12;
    year -= 1;
  }
  return `${year}-${String(month).padStart(2, "0")}`;
}

function yyyyMmFromIso(iso: string): string {
  return iso.slice(0, 7);
}

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

function eventChipClass(type: CashEvent["type"]): string {
  return `calendar-event-chip calendar-event-chip--${type}`;
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
      <div className="calendar-nav">
        <div className="flex items-center gap-1">
          <button
            type="button"
            className="btn btn-sm"
            disabled={!canPrev}
            onClick={() => setViewMonth(addMonthsYyyyMm(viewMonth, -1))}
            aria-label="Mês anterior"
          >
            <ChevronLeft size={14} />
          </button>
          <span className="calendar-nav-month">{monthLabel}</span>
          <button
            type="button"
            className="btn btn-sm"
            disabled={!canNext}
            onClick={() => setViewMonth(addMonthsYyyyMm(viewMonth, 1))}
            aria-label="Próximo mês"
          >
            <ChevronRight size={14} />
          </button>
        </div>
        <button
          type="button"
          className="btn btn-sm"
          onClick={() => {
            setViewMonth(yyyyMmFromIso(today));
            setSelectedDate(today);
          }}
        >
          Hoje
        </button>
      </div>

      <div className="calendar-legend">
        {(["fatura", "fixa", "receita"] as const).map((type) => (
          <span key={type} className="calendar-legend-item">
            <span className={eventLegendDotClass(type)} />
            {EVENT_LABELS[type]}
          </span>
        ))}
      </div>

      <div className="calendar-week-header">
        {WEEKDAYS.map((d) => (
          <span key={d}>{d}</span>
        ))}
      </div>

      <div className="calendar-grid">
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
                "calendar-cell",
                !cell.inMonth && "is-outside",
                !inHorizon && "is-disabled",
                isToday && "is-today",
                isSelected && "is-selected",
              )}
              disabled={!inHorizon}
              onClick={() =>
                setSelectedDate((prev) =>
                  prev === cell.date ? null : cell.date,
                )
              }
            >
              <span className="calendar-day-num">
                {parseIso(cell.date)[2]}
              </span>
              <div className="calendar-events">
                {events.slice(0, 3).map((e, i) => (
                  <div
                    key={`${e.type}-${e.description}-${i}`}
                    className={eventChipClass(e.type)}
                    title={e.description}
                  >
                    <EventIcon type={e.type} />
                    <span className="num">{formatBRLCompact(e.amount)}</span>
                  </div>
                ))}
                {events.length > 3 && (
                  <span className="calendar-more">+{events.length - 3}</span>
                )}
              </div>
              {inHorizon && balance != null && (
                <span
                  className={clsx(
                    "calendar-balance num",
                    balance >= 0 ? "calendar-balance--pos" : "calendar-balance--neg",
                  )}
                >
                  {formatBRLCompact(balance)}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {selectedDate && (
        <div className="calendar-day-detail panel p-3">
          <div className="calendar-day-detail-header">
            <span className="section-title text-sm">
              Eventos de {formatDateBR(selectedDate)}
            </span>
            <button
              type="button"
              className="btn btn-sm"
              onClick={() => setSelectedDate(null)}
              aria-label="Fechar"
            >
              <X size={14} />
            </button>
          </div>
          {selectedEvents.length > 0 ? (
            <div className="divide-y">
              {selectedEvents.map((e, i) => (
                <div
                  key={`${e.type}-${e.description}-${i}`}
                  className="flex items-center justify-between gap-2 py-2 text-sm"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <span
                      className={clsx(eventBadgeClass(e.type), "gap-1 shrink-0")}
                    >
                      <EventIcon type={e.type} />
                      {EVENT_LABELS[e.type]}
                    </span>
                    <span className="truncate text-xs">{e.description}</span>
                  </div>
                  <span
                    className={clsx(
                      "num text-xs font-medium shrink-0",
                      e.amount >= 0
                        ? "text-[var(--success)]"
                        : "text-[var(--danger)]",
                    )}
                  >
                    {formatBRL(e.amount)}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs subtle">Nenhum evento neste dia.</p>
          )}
          {balances.has(selectedDate) && (
            <p className="text-xs subtle mt-2 pt-2 border-t border-[var(--border)]">
              Saldo projetado:{" "}
              <span
                className={clsx(
                  "num font-medium",
                  (balances.get(selectedDate) ?? 0) >= 0
                    ? "text-[var(--success)]"
                    : "text-[var(--danger)]",
                )}
              >
                {formatBRL(balances.get(selectedDate))}
              </span>
            </p>
          )}
        </div>
      )}
    </div>
  );
}
