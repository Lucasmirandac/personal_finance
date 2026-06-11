import {
  accountsToBalanceAnchor,
  accountsToCardConfigs,
  hasProjectionSetup,
} from "./accounts";
import { isInterInstallmentTipo, parseBrDate, parseIsoDate } from "./csv";
import { isoFromParts, parseIso, todayIso, addDaysIso } from "./dates";
import { recurringIncomeRawId } from "./edits";
import { isManualQuickRaw } from "./manualTransactions";
import { monthsBetween } from "./recurring";
import {
  Account,
  CardConfig,
  EditsState,
  Fonte,
  RecurringRule,
  Settings,
  TransactionNormalized,
} from "./types";

export type CashEventType = "fatura" | "fixa" | "receita" | "ancora";

export type CashEventSource =
  | { kind: "recurring"; ruleId: string; rawId: string }
  | { kind: "fatura"; fonte: Fonte; payDate: string }
  | { kind: "manual"; rawId: string };

export type CashEvent = {
  date: string;
  type: CashEventType;
  fonte?: Fonte;
  description: string;
  amount: number;
  source?: CashEventSource;
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

export type ProjectionSnapshot = {
  balance: number
  date: string
  delta: number
  deltaPct: number
} | null

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

export function billPayDateForTransaction(
  tx: Pick<TransactionNormalized, "dataISO" | "fonte" | "tipo" | "installment">,
  config: CardConfig,
): string {
  if (
    tx.fonte === "inter" &&
    (tx.installment || isInterInstallmentTipo(tx.tipo))
  ) {
    return tx.dataISO;
  }
  return cycleFor(tx.dataISO, config);
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

    const payDate = billPayDateForTransaction(t, cfg);
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
      source: { kind: "fatura", fonte, payDate },
    });
  }
  return events;
}

export function buildManualCashEvents(
  normalized: TransactionNormalized[],
  accounts: Account[],
): CashEvent[] {
  if (accounts.length === 0) return [];
  const accountById = new Map(accounts.map((a) => [a.id, a]));
  const events: CashEvent[] = [];
  const cardGroups = new Map<
    string,
    { date: string; total: number; account: Account }
  >();

  for (const t of normalized) {
    if (t.fonte !== "manual") continue;
    if (!isManualQuickRaw({ sourceId: t.sourceId, id: t.id })) continue;
    if (!t.accountId || !t.dataISO) continue;
    const account = accountById.get(t.accountId);
    if (!account?.ativa) continue;

    if (account.kind === "cartao") {
      const fechamento = account.diaFechamento ?? 10;
      const pagamento = account.diaPagamento ?? 20;
      const payDate = cycleFor(t.dataISO, {
        fonte: account.fonteCsv ?? "inter",
        diaFechamento: fechamento,
        diaPagamento: pagamento,
      });
      const key = `${account.id}|${payDate}`;
      const cur = cardGroups.get(key) ?? { date: payDate, total: 0, account };
      if (t.tipoFluxo === "saida") cur.total += t.valorFluxo;
      else if (t.tipoFluxo === "entrada") cur.total -= t.valorFluxo;
      cardGroups.set(key, cur);
      continue;
    }

    if (t.tipoFluxo === "entrada") {
      events.push({
        date: t.dataISO,
        type: "receita",
        description: t.lancamento || "Receita",
        amount: round2(t.valorFluxo),
        source: { kind: "manual", rawId: t.id },
      });
    } else if (t.tipoFluxo === "saida") {
      events.push({
        date: t.dataISO,
        type: "fixa",
        description: t.lancamento || "Saída",
        amount: -round2(t.valorFluxo),
        source: { kind: "manual", rawId: t.id },
      });
    }
  }

  for (const group of cardGroups.values()) {
    if (group.total === 0) continue;
    events.push({
      date: group.date,
      type: "fatura",
      description: `Fatura ${group.account.nome}`,
      amount: -round2(group.total),
      source: {
        kind: "fatura",
        fonte: group.account.fonteCsv ?? "inter",
        payDate: group.date,
      },
    });
  }

  return events;
}

function faturaEventKey(event: CashEvent): string {
  return `${event.date}|${event.description}|${event.amount}`;
}

export function faturaCashEventsForMonth(
  monthYyyyMm: string,
  normalized: TransactionNormalized[],
  accounts: Account[],
): CashEvent[] {
  const cards = accountsToCardConfigs(accounts);
  const imported = buildFaturaEvents(normalized, cards);
  const manual = buildManualCashEvents(normalized, accounts).filter(
    (e) => e.type === "fatura",
  );
  const seen = new Set<string>();
  const events: CashEvent[] = [];
  for (const event of [...imported, ...manual]) {
    if (event.date.slice(0, 7) !== monthYyyyMm) continue;
    const key = faturaEventKey(event);
    if (seen.has(key)) continue;
    seen.add(key);
    events.push(event);
  }
  return events.sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0));
}

export function buildRecurringEvents(
  rules: RecurringRule[],
  windowFrom: string,
  windowTo: string,
  edits: EditsState = {},
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
      let dataISO = isoFromParts(y, m, day);
      if (dataISO < rule.inicio) continue;
      if (rule.fim && dataISO > rule.fim) continue;

      const isReceita = rule.kind === "receita";
      const rawId = recurringIncomeRawId(rule.id, anoMes);
      const edit = edits[rawId];

      if (edit?.deleted) continue;

      if (edit?.data) {
        const parsed = parseBrDate(edit.data) ?? parseIsoDate(edit.data);
        if (parsed) dataISO = parsed;
      }

      if (dataISO < windowFrom || dataISO > windowTo) continue;

      let amount = isReceita ? Math.abs(rule.valor) : -Math.abs(rule.valor);
      if (edit?.valorOriginal !== undefined) {
        amount = isReceita
          ? Math.abs(edit.valorOriginal)
          : -Math.abs(edit.valorOriginal);
      }

      events.push({
        date: dataISO,
        type: isReceita ? "receita" : "fixa",
        description: rule.descricao,
        amount,
        source: { kind: "recurring", ruleId: rule.id, rawId },
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
  edits?: EditsState;
  windowFrom?: string;
  windowTo?: string;
  /** Synthetic events for what-if simulation (e.g. Afford modal). */
  extraEvents?: CashEvent[];
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
    input.edits,
  );
  const manualEvents = buildManualCashEvents(
    input.normalized,
    input.accounts ?? [],
  );
  const preAnchorManual = manualEvents.filter(
    (e) => e.date < rollFrom && e.date <= windowTo,
  );
  const preAnchorAdjustment = round2(
    preAnchorManual.reduce((sum, e) => sum + e.amount, 0),
  );
  const adjustedSaldoInicial = round2(anchor.valor + preAnchorAdjustment);
  const allEvents = [
    ...faturaEvents,
    ...recurringEvents,
    ...manualEvents,
    ...(input.extraEvents ?? []),
  ].filter((e) => e.date >= rollFrom && e.date <= windowTo);

  const eventsByDate = new Map<string, CashEvent[]>();
  for (const e of allEvents) {
    const list = eventsByDate.get(e.date) ?? [];
    list.push(e);
    eventsByDate.set(e.date, list);
  }

  const fullDays = iterateDays(rollFrom, windowTo);
  let balance = adjustedSaldoInicial;
  const fullSeries: DailyBalancePoint[] = [];

  for (const date of fullDays) {
    const dayEvents = eventsByDate.get(date) ?? [];
    for (const e of dayEvents) {
      balance = round2(balance + e.amount);
    }
    fullSeries.push({ date, balance, events: dayEvents });
  }

  const series = fullSeries.filter((p) => p.date >= effectiveFrom);
  let menorSaldo = series[0]?.balance ?? adjustedSaldoInicial;
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
    saldoInicial: adjustedSaldoInicial,
    saldoFinal:
      series.length > 0 ? series[series.length - 1].balance : adjustedSaldoInicial,
    menorSaldo,
    menorSaldoData,
    proximaFatura,
  };

  return { series, summary };
}

export function projectionSnapshot(
  series: DailyBalancePoint[],
  anchorValue: number,
  daysAhead: number,
): ProjectionSnapshot {
  if (series.length === 0) return null
  const target = addDaysIso(todayIso(), daysAhead)
  let snapshot = series[series.length - 1]
  for (const point of series) {
    if (point.date <= target) {
      snapshot = point
    } else {
      break
    }
  }
  const delta = round2(snapshot.balance - anchorValue)
  const base = Math.abs(anchorValue)
  const deltaPct = base > 0 ? round2((delta / base) * 100) : 0
  return {
    balance: snapshot.balance,
    date: snapshot.date,
    delta,
    deltaPct,
  }
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
