import { isoToBr } from "./csv";
import { isoFromParts } from "./dates";
import { isRecurringRaw } from "./edits";
import { RecurringRule, TransactionNormalized, TransactionRaw } from "./types";

export function newRecurringId(): string {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return `rec-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function daysInMonth(year: number, month: number): number {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

function clampDay(year: number, month: number, diaMes: number): number {
  return Math.min(diaMes, daysInMonth(year, month));
}

export function monthsBetween(fromIso: string, toIso: string): string[] {
  const [y1, m1] = fromIso.split("-").map(Number);
  const [y2, m2] = toIso.split("-").map(Number);
  const months: string[] = [];
  let y = y1;
  let m = m1;
  while (y < y2 || (y === y2 && m <= m2)) {
    months.push(`${y}-${String(m).padStart(2, "0")}`);
    m += 1;
    if (m > 12) {
      m = 1;
      y += 1;
    }
  }
  return months;
}

function todayIsoFromDate(today: Date): string {
  return isoFromParts(
    today.getUTCFullYear(),
    today.getUTCMonth() + 1,
    today.getUTCDate(),
  );
}

export function endOfCurrentMonthIso(today: Date = new Date()): string {
  const year = today.getUTCFullYear();
  const month = today.getUTCMonth() + 1;
  const lastDay = daysInMonth(year, month);
  return isoFromParts(year, month, lastDay);
}

function endIsoForRule(rule: RecurringRule, expansionEndIso: string): string {
  if (rule.fim && rule.fim < expansionEndIso) return rule.fim;
  return expansionEndIso;
}

export function countRecurringOccurrences(
  rule: RecurringRule,
  today: Date = new Date(),
): number {
  const todayIso = todayIsoFromDate(today);
  if (!rule.inicio || rule.inicio > todayIso) return 0;
  const end = endIsoForRule(rule, endOfCurrentMonthIso(today));
  if (rule.fim && rule.inicio > rule.fim) return 0;
  return monthsBetween(
    rule.inicio.slice(0, 7),
    end.slice(0, 7),
  ).length;
}

export function expandRecurringRules(
  rules: RecurringRule[],
  today: Date = new Date(),
): TransactionRaw[] {
  const todayIso = todayIsoFromDate(today);
  const expansionEndIso = endOfCurrentMonthIso(today);
  const raws: TransactionRaw[] = [];

  for (const rule of rules) {
    if (!rule.ativo) continue;
    if (!rule.inicio) continue;
    if (rule.inicio > todayIso) continue;
    if (rule.fim && rule.inicio > rule.fim) continue;

    const endIso = endIsoForRule(rule, expansionEndIso);
    const monthKeys = monthsBetween(
      rule.inicio.slice(0, 7),
      endIso.slice(0, 7),
    );

    for (const anoMes of monthKeys) {
      const [y, m] = anoMes.split("-").map(Number);
      const day = clampDay(y, m, rule.diaMes);
      const dataISO = isoFromParts(y, m, day);
      if (dataISO < rule.inicio) continue;
      if (rule.fim && dataISO > rule.fim) continue;

      const tipo = rule.kind === "receita" ? "Receita" : "Despesa fixa";
      const valorOriginal =
        rule.kind === "receita" ? -Math.abs(rule.valor) : Math.abs(rule.valor);

      raws.push({
        id: `manual:${rule.id}:${anoMes}`,
        data: isoToBr(dataISO),
        lancamento: rule.descricao,
        categoria: rule.categoria.trim() || "(sem categoria)",
        tipo,
        valorOriginal,
        fonte: "manual",
        sourceId: `manual:${rule.id}`,
        ...(rule.accountId ? { accountId: rule.accountId } : {}),
      });
    }
  }

  return raws;
}

export function isFutureRecurringRaw(
  tx: Pick<TransactionRaw, "sourceId" | "data"> & { dataISO?: string },
  today: Date = new Date(),
): boolean {
  if (!isRecurringRaw(tx)) return false;
  const todayIso = todayIsoFromDate(today);
  const dataISO =
    tx.dataISO ??
    (() => {
      const [d, m, y] = tx.data.split("/").map(Number);
      return isoFromParts(y, m, d);
    })();
  return dataISO > todayIso;
}

export function isForecastTransaction(
  tx: Pick<TransactionNormalized, "sourceId" | "dataISO" | "installment">,
  today: Date = new Date(),
): boolean {
  const todayIso = todayIsoFromDate(today);
  if (!tx.dataISO || tx.dataISO <= todayIso) return false;
  if (isRecurringRaw(tx)) return true;
  if (tx.installment?.estimated) return true;
  return false;
}

export function previewRecurringRule(
  rule: Omit<RecurringRule, "id" | "criadoEm" | "ativo"> & {
    ativo?: boolean;
  },
  today: Date = new Date(),
): { count: number; total: number } {
  const full: RecurringRule = {
    id: "preview",
    criadoEm: new Date().toISOString(),
    ativo: rule.ativo ?? true,
    kind: rule.kind,
    descricao: rule.descricao,
    categoria: rule.categoria,
    valor: rule.valor,
    diaMes: rule.diaMes,
    inicio: rule.inicio,
    fim: rule.fim,
  };
  const count = countRecurringOccurrences(full, today);
  return { count, total: count * Math.abs(rule.valor) };
}
