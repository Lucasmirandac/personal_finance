import { isoToBr, parseIsoDate } from "./csv";
import { RecurringRule, TransactionRaw } from "./types";

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

function isoFromParts(year: number, month: number, day: number): string {
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
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

function endIsoForRule(rule: RecurringRule, todayIso: string): string {
  if (rule.fim && rule.fim < todayIso) return rule.fim;
  return todayIso;
}

export function countRecurringOccurrences(
  rule: RecurringRule,
  today: Date = new Date(),
): number {
  const todayIso = isoFromParts(
    today.getUTCFullYear(),
    today.getUTCMonth() + 1,
    today.getUTCDate(),
  );
  if (!rule.inicio || rule.inicio > todayIso) return 0;
  const end = endIsoForRule(rule, todayIso);
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
  const todayIso = isoFromParts(
    today.getUTCFullYear(),
    today.getUTCMonth() + 1,
    today.getUTCDate(),
  );
  const raws: TransactionRaw[] = [];

  for (const rule of rules) {
    if (!rule.ativo) continue;
    if (!rule.inicio) continue;
    if (rule.inicio > todayIso) continue;
    if (rule.fim && rule.inicio > rule.fim) continue;

    const endIso = endIsoForRule(rule, todayIso);
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
      if (dataISO > todayIso) continue;

      const tipo = rule.kind === "receita" ? "Receita" : "Despesa fixa";
      const valorOriginal =
        rule.kind === "receita" ? -Math.abs(rule.valor) : Math.abs(rule.valor);

      raws.push({
        data: isoToBr(dataISO),
        lancamento: rule.descricao,
        categoria: rule.categoria.trim() || "(sem categoria)",
        tipo,
        valorOriginal,
        fonte: "manual",
        sourceId: `manual:${rule.id}`,
      });
    }
  }

  return raws;
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
