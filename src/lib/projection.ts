import {
  accountsToBalanceAnchor,
  accountsToCardConfigs,
  hasProjectionSetup,
} from "./accounts";
import { isoFromParts, parseIso, todayIso } from "./dates";
import { monthsBetween } from "./recurring";
import {
  Account,
  CardConfig,
  Fonte,
  RecurringRule,
  Settings,
  TransactionNormalized,
} from "./types";

export type CashEventType = "fatura" | "fixa" | "receita" | "ancora";

export type CashEvent = {
  date: string;
  type: CashEventType;
  fonte?: Fonte;
  description: string;
  amount: number;
};

export type DailyBalancePoint = {
  date: string;
  balance: number;
  events: CashEvent[];
};

export type ProjectionSummary = {
  saldoInicial: number;
  saldoFinal: number;
  menorSaldo: number;
  menorSaldoData: string | null;
  proximaFatura: { date: string; amount: number; description: string } | null;
};

function daysInMonth(year: number, month: number): number {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

function clampDay(year: number, month: number, day: number): number {
  return Math.min(Math.max(1, day), daysInMonth(year, month));
}

function addMonths(year: number, month: number, delta: number): [number, number] {
  let m = month + delta;
  let y = year;
  while (m > 12) {
    m -= 12;
    y += 1;
  }
  while (m < 1) {
    m += 12;
    y -= 1;
  }
  return [y, m];
}

/** Payment date for a purchase given card closing/payment days. */
export function cycleFor(dataISO: string, config: CardConfig): string {
  const [y, m, d] = parseIso(dataISO);
  const monthsAfter =
    d <= config.diaFechamento ? 1 : 2;
  const [py, pm] = addMonths(y, m, monthsAfter);
  const payDay = clampDay(py, pm, config.diaPagamento);
  return isoFromParts(py, pm, payDay);
}

function cardConfigMap(cards: CardConfig[]): Map<Fonte, CardConfig> {
  const map = new Map<Fonte, CardConfig>();
  for (const c of cards) {
    if (c.fonte === "inter" || c.fonte === "nubank") {
      map.set(c.fonte, c);
    }
  }
  return map;
}

export function buildFaturaEvents(
  normalized: TransactionNormalized[],
  cards: CardConfig[],
): CashEvent[] {
  const configs = cardConfigMap(cards);
  const groups = new Map<string, { fonte: Fonte; payDate: string; total: number }>();

  for (const t of normalized) {
    if (t.natureza !== "Gasto") continue;
    if (t.fonte !== "inter" && t.fonte !== "nubank") continue;
    const cfg = configs.get(t.fonte);
    if (!cfg || !t.dataISO) continue;

    const payDate = cycleFor(t.dataISO, cfg);
    const key = `${t.fonte}|${payDate}`;
    const cur = groups.get(key) ?? { fonte: t.fonte, payDate, total: 0 };
    cur.total += t.valorAnalise;
    groups.set(key, cur);
  }

  const fonteLabels: Record<Fonte, string> = {
    inter: "Inter",
    nubank: "Nubank",
    manual: "Manual",
  };

  const events: CashEvent[] = [];
  for (const { fonte, payDate, total } of groups.values()) {
    if (total <= 0) continue;
    events.push({
      date: payDate,
      type: "fatura",
      fonte,
      description: `Fatura ${fonteLabels[fonte]}`,
      amount: -round2(total),
    });
  }
  return events;
}

export function buildRecurringEvents(
  rules: RecurringRule[],
  windowFrom: string,
  windowTo: string,
): CashEvent[] {
  const events: CashEvent[] = [];
  const monthKeys = monthsBetween(
    windowFrom.slice(0, 7),
    windowTo.slice(0, 7),
  );

  for (const rule of rules) {
    if (!rule.ativo) continue;
    if (!rule.inicio) continue;

    for (const anoMes of monthKeys) {
      const [y, m] = anoMes.split("-").map(Number);
      const day = clampDay(y, m, rule.diaMes);
      const dataISO = isoFromParts(y, m, day);
      if (dataISO < rule.inicio) continue;
      if (rule.fim && dataISO > rule.fim) continue;
      if (dataISO < windowFrom || dataISO > windowTo) continue;

      const isReceita = rule.kind === "receita";
      events.push({
        date: dataISO,
        type: isReceita ? "receita" : "fixa",
        description: rule.descricao,
        amount: isReceita ? Math.abs(rule.valor) : -Math.abs(rule.valor),
      });
    }
  }
  return events;
}

function iterateDays(from: string, to: string): string[] {
  const days: string[] = [];
  const [y1, m1, d1] = parseIso(from);
  const [y2, m2, d2] = parseIso(to);
  let cur = Date.UTC(y1, m1 - 1, d1);
  const end = Date.UTC(y2, m2 - 1, d2);
  while (cur <= end) {
    const d = new Date(cur);
    days.push(
      isoFromParts(
        d.getUTCFullYear(),
        d.getUTCMonth() + 1,
        d.getUTCDate(),
      ),
    );
    cur += 86400000;
  }
  return days;
}

export type ProjectDailyBalanceInput = {
  normalized: TransactionNormalized[];
  recurringRules: RecurringRule[];
  settings: Settings;
  accounts?: Account[];
  windowFrom?: string;
  windowTo?: string;
};

function resolveProjectionConfig(input: ProjectDailyBalanceInput): {
  anchor: { data: string; valor: number } | null;
  cards: CardConfig[];
  horizonDays: number;
} {
  const accounts = input.accounts ?? [];
  const anchor =
    accounts.length > 0
      ? accountsToBalanceAnchor(accounts)
      : input.settings.balanceAnchor;
  const cards =
    accounts.length > 0
      ? accountsToCardConfigs(accounts)
      : input.settings.cards;
  return {
    anchor,
    cards,
    horizonDays: input.settings.projectionHorizonDays,
  };
}

export function projectDailyBalance(
  input: ProjectDailyBalanceInput,
): { series: DailyBalancePoint[]; summary: ProjectionSummary | null } {
  const { anchor, cards, horizonDays } = resolveProjectionConfig(input);
  if (!anchor) return { series: [], summary: null };

  const today = todayIso();
  const horizonEnd = addDaysIso(today, horizonDays);
  const windowFrom =
    input.windowFrom ?? (anchor.data > today ? anchor.data : today);
  const windowTo = input.windowTo ?? horizonEnd;

  const effectiveFrom =
    anchor.data > windowFrom ? anchor.data : windowFrom;
  if (effectiveFrom > windowTo) {
    return { series: [], summary: null };
  }

  const rollFrom = anchor.data;
  const faturaEvents = buildFaturaEvents(input.normalized, cards);
  const recurringEvents = buildRecurringEvents(
    input.recurringRules,
    rollFrom,
    windowTo,
  );
  const allEvents = [...faturaEvents, ...recurringEvents].filter(
    (e) => e.date >= rollFrom && e.date <= windowTo,
  );

  const eventsByDate = new Map<string, CashEvent[]>();
  for (const e of allEvents) {
    const list = eventsByDate.get(e.date) ?? [];
    list.push(e);
    eventsByDate.set(e.date, list);
  }

  const fullDays = iterateDays(rollFrom, windowTo);
  let balance = anchor.valor;
  const fullSeries: DailyBalancePoint[] = [];

  for (const date of fullDays) {
    const dayEvents = eventsByDate.get(date) ?? [];
    for (const e of dayEvents) {
      balance = round2(balance + e.amount);
    }
    fullSeries.push({ date, balance, events: dayEvents });
  }

  const series = fullSeries.filter((p) => p.date >= effectiveFrom);
  let menorSaldo = series[0]?.balance ?? anchor.valor;
  let menorSaldoData: string | null = series[0]?.date ?? null;
  for (const p of series) {
    if (p.balance < menorSaldo) {
      menorSaldo = p.balance;
      menorSaldoData = p.date;
    }
  }

  const upcoming = allEvents
    .filter((e) => e.date >= today)
    .sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));

  const proximaFaturaEv = upcoming.find((e) => e.type === "fatura");
  const proximaFatura = proximaFaturaEv
    ? {
        date: proximaFaturaEv.date,
        amount: proximaFaturaEv.amount,
        description: proximaFaturaEv.description,
      }
    : null;

  const summary: ProjectionSummary = {
    saldoInicial: anchor.valor,
    saldoFinal: series.length > 0 ? series[series.length - 1].balance : anchor.valor,
    menorSaldo,
    menorSaldoData,
    proximaFatura,
  };

  return { series, summary };
}

function addDaysIso(iso: string, days: number): string {
  const [y, m, d] = parseIso(iso);
  const t = Date.UTC(y, m - 1, d) + days * 86400000;
  const dt = new Date(t);
  return isoFromParts(
    dt.getUTCFullYear(),
    dt.getUTCMonth() + 1,
    dt.getUTCDate(),
  );
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

export function isSettingsComplete(
  settings: Settings,
  sourcesInDataset: Fonte[],
  accounts: Account[] = [],
): boolean {
  if (accounts.length > 0) {
    return hasProjectionSetup(accounts, sourcesInDataset);
  }
  if (!settings.balanceAnchor) return false;
  const cardSources = sourcesInDataset.filter(
    (f) => f === "inter" || f === "nubank",
  );
  if (cardSources.length === 0) return true;
  const configured = new Set(settings.cards.map((c) => c.fonte));
  return cardSources.every((f) => configured.has(f));
}

export function defaultCardsForSources(sources: Fonte[]): CardConfig[] {
  const seen = new Set<Fonte>();
  const cards: CardConfig[] = [];
  for (const f of sources) {
    if ((f === "inter" || f === "nubank") && !seen.has(f)) {
      seen.add(f);
      cards.push({
        fonte: f,
        diaFechamento: 10,
        diaPagamento: 20,
      });
    }
  }
  return cards;
}
