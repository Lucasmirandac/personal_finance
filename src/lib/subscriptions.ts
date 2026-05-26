import { currentMonthIso } from "./budgets";
import { isRecurringRaw } from "./edits";
import { newRecurringId } from "./recurring";
import { RecurringRule, TransactionNormalized } from "./types";

export type SubscriptionSuggestion = {
  key: string;
  estabelecimento: string;
  valorMediano: number;
  diaMediano: number;
  categoria: string;
  meses: string[];
  ultimaData: string;
  variacaoPct: number;
  amostra: Array<{ data: string; valor: number; anoMes: string }>;
};

export type DetectSubscriptionsOptions = {
  months?: number;
  tolerance?: number;
  minOccurrences?: number;
};

function monthRangeEndingAt(endAnoMes: string, count: number): string[] {
  const [y, m] = endAnoMes.split("-").map(Number);
  const out: string[] = [];
  let year = y;
  let month = m;
  for (let i = 0; i < count; i++) {
    out.unshift(`${year}-${String(month).padStart(2, "0")}`);
    month -= 1;
    if (month < 1) {
      month = 12;
      year -= 1;
    }
  }
  return out;
}

function median(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 0) {
    return (sorted[mid - 1] + sorted[mid]) / 2;
  }
  return sorted[mid];
}

function modeString(values: string[]): string {
  const counts = new Map<string, number>();
  for (const v of values) {
    counts.set(v, (counts.get(v) ?? 0) + 1);
  }
  let best = values[0] ?? "";
  let bestCount = 0;
  for (const [k, c] of counts) {
    if (c > bestCount) {
      best = k;
      bestCount = c;
    }
  }
  return best;
}

function medianDayFromIso(dates: string[]): number {
  const days = dates
    .map((d) => {
      const parts = d.split("-");
      return parts.length >= 3 ? Number(parts[2]) : Number.NaN;
    })
    .filter((d) => !Number.isNaN(d) && d >= 1 && d <= 31);
  const med = Math.round(median(days));
  return Math.min(28, Math.max(1, med || 1));
}

function clampRecurringDay(day: unknown): number {
  const n = typeof day === "number" ? day : Number(day);
  if (!Number.isFinite(n)) return 1;
  return Math.min(28, Math.max(1, Math.round(n)));
}

function firstDayOfMonth(anoMes: string | undefined): string {
  if (!anoMes || !/^\d{4}-\d{2}$/.test(anoMes)) {
    return `${currentMonthIso()}-01`;
  }
  return `${anoMes}-01`;
}

function namesMatch(a: string, b: string): boolean {
  const x = a.toLowerCase().trim();
  const y = b.toLowerCase().trim();
  if (!x || !y) return false;
  return x.includes(y) || y.includes(x);
}

function hasEquivalentRecurring(
  estabelecimentoKey: string,
  valorMediano: number,
  rules: RecurringRule[],
): boolean {
  if (valorMediano <= 0) return false;
  return rules.some((r) => {
    if (!r.ativo || r.kind !== "despesa_fixa") return false;
    if (!namesMatch(r.descricao, estabelecimentoKey)) return false;
    return Math.abs(r.valor - valorMediano) / valorMediano <= 0.1;
  });
}

export function suggestionKey(
  estabelecimentoKey: string,
  valorMediano: number,
): string {
  return `${estabelecimentoKey}:${Math.round(valorMediano)}`;
}

export function detectSubscriptions(
  normalized: TransactionNormalized[],
  recurringRules: RecurringRule[],
  dismissals: string[],
  options?: DetectSubscriptionsOptions,
): SubscriptionSuggestion[] {
  const monthsWindow = options?.months ?? 6;
  const tolerance = options?.tolerance ?? 0.05;
  const minOccurrences = options?.minOccurrences ?? 3;
  const dismissed = new Set(dismissals);

  const endMonth = currentMonthIso();
  const allowedMonths = new Set(monthRangeEndingAt(endMonth, monthsWindow));

  const candidates = normalized.filter(
    (t) =>
      t.tipoFluxo === "saida" &&
      allowedMonths.has(t.anoMes) &&
      !isRecurringRaw(t),
  );

  const byEst = new Map<
    string,
    {
      displayNames: string[];
      byMonth: Map<
        string,
        {
          dataISO: string;
          valor: number;
          categoria: string;
          estabelecimento: string;
        }
      >;
    }
  >();

  for (const t of candidates) {
    const key = t.estabelecimento.toLowerCase().trim();
    if (!key) continue;
    let group = byEst.get(key);
    if (!group) {
      group = { displayNames: [], byMonth: new Map() };
      byEst.set(key, group);
    }
    group.displayNames.push(t.estabelecimento);
    const prev = group.byMonth.get(t.anoMes);
    if (!prev || t.dataISO > prev.dataISO) {
      group.byMonth.set(t.anoMes, {
        dataISO: t.dataISO,
        valor: t.valorFluxo,
        categoria: t.categoria,
        estabelecimento: t.estabelecimento,
      });
    }
  }

  const suggestions: SubscriptionSuggestion[] = [];

  for (const [estKey, group] of byEst) {
    const entries = [...group.byMonth.values()].sort((a, b) =>
      a.dataISO.localeCompare(b.dataISO),
    );
    if (entries.length < minOccurrences) continue;

    const valores = entries.map((e) => e.valor);
    const valorMediano = Math.round(median(valores) * 100) / 100;
    if (valorMediano <= 1) continue;

    const min = Math.min(...valores);
    const max = Math.max(...valores);
    const spread = valorMediano > 0 ? (max - min) / valorMediano : 1;
    if (spread > tolerance) continue;

    const key = suggestionKey(estKey, valorMediano);
    if (dismissed.has(key)) continue;
    if (hasEquivalentRecurring(estKey, valorMediano, recurringRules)) continue;

    const meses = [...group.byMonth.keys()].sort();
    const ultima = entries[entries.length - 1];
    const variacaoPct = Math.round(spread * 10000) / 100;

    const amostra = [...group.byMonth.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([anoMes, e]) => ({
        data: e.dataISO,
        valor: e.valor,
        anoMes,
      }));

    suggestions.push({
      key,
      estabelecimento: modeString(group.displayNames),
      valorMediano,
      diaMediano: medianDayFromIso(entries.map((e) => e.dataISO)),
      categoria: modeString(entries.map((e) => e.categoria)),
      meses,
      ultimaData: ultima.dataISO,
      variacaoPct,
      amostra,
    });
  }

  return suggestions.sort((a, b) => b.valorMediano - a.valorMediano);
}

export function suggestionToRecurring(
  s: SubscriptionSuggestion,
  defaults?: { accountId?: string },
): RecurringRule {
  const diaMes = clampRecurringDay(s.diaMediano);
  return {
    id: newRecurringId(),
    kind: "despesa_fixa",
    descricao: s.estabelecimento,
    categoria: s.categoria,
    valor: s.valorMediano,
    diaMes,
    inicio: firstDayOfMonth(s.meses[0]),
    fim: null,
    ativo: true,
    criadoEm: new Date().toISOString(),
    ...(defaults?.accountId ? { accountId: defaults.accountId } : {}),
  };
}
