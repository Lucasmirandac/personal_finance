import { Natureza, TransactionNormalized } from "./types";
import { formatMonthLabel } from "./format";

export type Filters = {
  dateFrom: string | null;
  dateTo: string | null;
  categorias: string[];
  naturezas: Natureza[];
  faixas: string[];
  search: string;
};

export const EMPTY_FILTERS: Filters = {
  dateFrom: null,
  dateTo: null,
  categorias: [],
  naturezas: [],
  faixas: [],
  search: "",
};

export function applyFilters(
  data: TransactionNormalized[],
  filters: Filters,
): TransactionNormalized[] {
  const q = filters.search.trim().toLowerCase();
  return data.filter((t) => {
    if (filters.dateFrom && t.dataISO < filters.dateFrom) return false;
    if (filters.dateTo && t.dataISO > filters.dateTo) return false;
    if (filters.categorias.length && !filters.categorias.includes(t.categoria))
      return false;
    if (filters.naturezas.length && !filters.naturezas.includes(t.natureza))
      return false;
    if (filters.faixas.length && !filters.faixas.includes(t.faixaValor))
      return false;
    if (q) {
      const hay = `${t.lancamento} ${t.estabelecimento} ${t.categoria}`
        .toLowerCase();
      if (!hay.includes(q)) return false;
    }
    return true;
  });
}

export type Kpis = {
  totalGasto: number;
  countConsumo: number;
  ticketMedio: number;
  maiorCompra: { valor: number; estabelecimento: string; data: string } | null;
  countExcluidos: number;
  totalBruto: number;
  totalReceitas: number;
  totalDespesas: number;
  saldo: number;
};

export function computeKpis(
  data: TransactionNormalized[],
  all: TransactionNormalized[],
): Kpis {
  const consumo = data.filter((t) => t.natureza === "Gasto");
  const totalGasto = consumo.reduce((acc, t) => acc + t.valorAnalise, 0);
  const countConsumo = consumo.length;
  const ticketMedio = countConsumo > 0 ? totalGasto / countConsumo : 0;
  const maior = consumo.reduce<TransactionNormalized | null>(
    (best, t) =>
      !best || t.valorAnalise > best.valorAnalise ? t : best,
    null,
  );
  const excluidos = data.filter(
    (t) =>
      t.natureza === "Pagamento de fatura" ||
      t.natureza === "Estorno / crédito",
  ).length;
  const totalBruto = all.reduce((acc, t) => acc + t.valorOriginal, 0);
  const totalReceitas = data
    .filter((t) => t.tipoFluxo === "entrada")
    .reduce((acc, t) => acc + t.valorFluxo, 0);
  const totalDespesas = data
    .filter((t) => t.tipoFluxo === "saida")
    .reduce((acc, t) => acc + t.valorFluxo, 0);
  const saldo = totalReceitas - totalDespesas;
  return {
    totalGasto,
    countConsumo,
    ticketMedio,
    maiorCompra: maior
      ? {
          valor: maior.valorAnalise,
          estabelecimento: maior.estabelecimento,
          data: maior.data,
        }
      : null,
    countExcluidos: excluidos,
    totalBruto,
    totalReceitas,
    totalDespesas,
    saldo,
  };
}

export type MonthlySeriesPoint = {
  anoMes: string;
  label: string;
  despesas: number;
  receitas: number;
  saldo: number;
  count: number;
  /** @deprecated use despesas */
  total: number;
};

export function monthlySeries(
  data: TransactionNormalized[],
): MonthlySeriesPoint[] {
  const map = new Map<
    string,
    { despesas: number; receitas: number; count: number }
  >();
  for (const t of data) {
    if (!t.anoMes || t.tipoFluxo === "neutro") continue;
    const cur = map.get(t.anoMes) ?? { despesas: 0, receitas: 0, count: 0 };
    if (t.tipoFluxo === "saida") cur.despesas += t.valorFluxo;
    if (t.tipoFluxo === "entrada") cur.receitas += t.valorFluxo;
    cur.count += 1;
    map.set(t.anoMes, cur);
  }
  const arr = [...map.entries()].map(([anoMes, v]) => ({
    anoMes,
    label: formatMonthLabel(anoMes),
    despesas: round2(v.despesas),
    receitas: round2(v.receitas),
    saldo: round2(v.receitas - v.despesas),
    count: v.count,
    total: round2(v.despesas),
  }));
  arr.sort((a, b) => (a.anoMes < b.anoMes ? -1 : 1));
  return arr;
}

export type ExpenseComposition = {
  cartao: { total: number; count: number };
  fixas: { total: number; count: number };
};

export function expenseComposition(
  data: TransactionNormalized[],
): ExpenseComposition {
  let cartaoTotal = 0;
  let cartaoCount = 0;
  let fixasTotal = 0;
  let fixasCount = 0;
  for (const t of data) {
    if (t.natureza === "Gasto") {
      cartaoTotal += t.valorAnalise;
      cartaoCount += 1;
    } else if (t.natureza === "Despesa fixa") {
      fixasTotal += t.valorAnalise;
      fixasCount += 1;
    }
  }
  return {
    cartao: { total: round2(cartaoTotal), count: cartaoCount },
    fixas: { total: round2(fixasTotal), count: fixasCount },
  };
}

export type CategoryAgg = {
  categoria: string;
  total: number;
  count: number;
  share: number;
};

export function categoryAggregation(
  data: TransactionNormalized[],
): CategoryAgg[] {
  const map = new Map<string, { total: number; count: number }>();
  let totalAll = 0;
  for (const t of data) {
    if (t.tipoFluxo !== "saida") continue;
    const cur = map.get(t.categoria) ?? { total: 0, count: 0 };
    cur.total += t.valorFluxo;
    cur.count += 1;
    map.set(t.categoria, cur);
    totalAll += t.valorFluxo;
  }
  const arr: CategoryAgg[] = [...map.entries()].map(([categoria, v]) => ({
    categoria,
    total: round2(v.total),
    count: v.count,
    share: totalAll > 0 ? (v.total / totalAll) * 100 : 0,
  }));
  arr.sort((a, b) => b.total - a.total);
  return arr;
}

export type WeekdayAgg = {
  diaSemana: string;
  diaSemanaIndex: number;
  total: number;
  count: number;
};

export function weekdayAggregation(
  data: TransactionNormalized[],
): WeekdayAgg[] {
  const map = new Map<number, { dia: string; total: number; count: number }>();
  for (const t of data) {
    if (t.tipoFluxo !== "saida") continue;
    const cur = map.get(t.diaSemanaIndex) ?? {
      dia: t.diaSemana,
      total: 0,
      count: 0,
    };
    cur.total += t.valorFluxo;
    cur.count += 1;
    map.set(t.diaSemanaIndex, cur);
  }
  const arr: WeekdayAgg[] = [...map.entries()].map(([idx, v]) => ({
    diaSemanaIndex: idx,
    diaSemana: v.dia,
    total: round2(v.total),
    count: v.count,
  }));
  arr.sort((a, b) => a.diaSemanaIndex - b.diaSemanaIndex);
  return arr;
}

export type WeekdayCategoryRow = {
  diaSemana: string
  diaSemanaIndex: number
  total: number
} & Record<string, number | string>

export type WeekdayCategoryResult = {
  rows: WeekdayCategoryRow[]
  categories: string[]
}

const OTHERS_CATEGORY_LABEL = "Outros"

function rankExpenseCategories(
  data: TransactionNormalized[],
): { categoria: string; total: number }[] {
  const totals = new Map<string, number>()
  for (const t of data) {
    if (t.tipoFluxo !== "saida") continue
    totals.set(t.categoria, (totals.get(t.categoria) ?? 0) + t.valorFluxo)
  }
  return [...totals.entries()]
    .map(([categoria, total]) => ({ categoria, total }))
    .sort((a, b) => b.total - a.total)
}

function seedWeekdayRows(
  data: TransactionNormalized[],
  categories: string[],
): Map<number, WeekdayCategoryRow> {
  const rows = new Map<number, WeekdayCategoryRow>()
  for (const t of data) {
    if (t.tipoFluxo !== "saida") continue
    if (rows.has(t.diaSemanaIndex)) continue
    const row: WeekdayCategoryRow = {
      diaSemana: t.diaSemana,
      diaSemanaIndex: t.diaSemanaIndex,
      total: 0,
    }
    for (const c of categories) row[c] = 0
    rows.set(t.diaSemanaIndex, row)
  }
  return rows
}

function accumulateWeekdayCategoryTotals(
  data: TransactionNormalized[],
  rows: Map<number, WeekdayCategoryRow>,
  topSet: Set<string>,
): void {
  for (const t of data) {
    if (t.tipoFluxo !== "saida") continue
    const row = rows.get(t.diaSemanaIndex)
    if (!row) continue
    const bucket = topSet.has(t.categoria) ? t.categoria : OTHERS_CATEGORY_LABEL
    row[bucket] = ((row[bucket] as number | undefined) ?? 0) + t.valorFluxo
    row.total += t.valorFluxo
  }
}

function roundWeekdayCategoryRows(
  rows: Iterable<WeekdayCategoryRow>,
  categories: string[],
): WeekdayCategoryRow[] {
  const list: WeekdayCategoryRow[] = []
  for (const row of rows) {
    const rounded: WeekdayCategoryRow = {
      diaSemana: row.diaSemana,
      diaSemanaIndex: row.diaSemanaIndex,
      total: round2(row.total),
    }
    for (const c of categories) rounded[c] = round2(row[c] as number)
    list.push(rounded)
  }
  return list.sort((a, b) => a.diaSemanaIndex - b.diaSemanaIndex)
}

export function weekdayCategoryAggregation(
  data: TransactionNormalized[],
  topN = 5,
): WeekdayCategoryResult {
  const ranked = rankExpenseCategories(data)
  const topCategories = ranked.slice(0, topN).map((r) => r.categoria)
  const categories =
    ranked.length > topN
      ? [...topCategories, OTHERS_CATEGORY_LABEL]
      : topCategories

  const rowsMap = seedWeekdayRows(data, categories)
  accumulateWeekdayCategoryTotals(data, rowsMap, new Set(topCategories))
  const rows = roundWeekdayCategoryRows(rowsMap.values(), categories)

  return { rows, categories }
}

export type EstablishmentAgg = {
  estabelecimento: string;
  total: number;
  count: number;
};

export function establishmentAggregation(
  data: TransactionNormalized[],
): EstablishmentAgg[] {
  const map = new Map<string, { total: number; count: number }>();
  for (const t of data) {
    if (t.natureza !== "Gasto") continue;
    const cur = map.get(t.estabelecimento) ?? { total: 0, count: 0 };
    cur.total += t.valorAnalise;
    cur.count += 1;
    map.set(t.estabelecimento, cur);
  }
  const arr: EstablishmentAgg[] = [...map.entries()].map(([e, v]) => ({
    estabelecimento: e,
    total: round2(v.total),
    count: v.count,
  }));
  arr.sort((a, b) => b.total - a.total);
  return arr;
}

export type Insight = {
  id: string;
  title: string;
  detail: string;
  tone: "info" | "warning" | "success";
};

export function buildInsights(
  data: TransactionNormalized[],
): Insight[] {
  const insights: Insight[] = [];
  const saidas = data.filter((t) => t.tipoFluxo === "saida");
  if (saidas.length === 0 && data.filter((t) => t.tipoFluxo === "entrada").length === 0) {
    return insights;
  }

  const kpis = computeKpis(data, data);
  insights.push({
    id: "saldo",
    title: `Saldo do período: ${kpis.saldo >= 0 ? "positivo" : "negativo"}`,
    detail: `Receitas R$ ${kpis.totalReceitas.toLocaleString("pt-BR", { minimumFractionDigits: 2 })} · Despesas R$ ${kpis.totalDespesas.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`,
    tone: kpis.saldo >= 0 ? "success" : "warning",
  });

  const cats = categoryAggregation(data);
  const consumo = data.filter((t) => t.natureza === "Gasto");
  const totalCartao = consumo.reduce((acc, t) => acc + t.valorAnalise, 0);

  if (cats[0]) {
    insights.push({
      id: "top-cat",
      title: `Maior categoria: ${cats[0].categoria}`,
      detail: `R$ ${cats[0].total.toLocaleString("pt-BR", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })} (${cats[0].share.toFixed(1)}% das despesas)`,
      tone: "info",
    });
  }
  if (cats.length >= 2) {
    const share = cats[0].share + cats[1].share;
    insights.push({
      id: "top2-cat",
      title: `Top 2 categorias concentram ${share.toFixed(1)}%`,
      detail: `${cats[0].categoria} + ${cats[1].categoria}`,
      tone: share > 50 ? "warning" : "info",
    });
  }

  const ests = establishmentAggregation(data);
  if (ests[0]) {
    insights.push({
      id: "top-est",
      title: `Estabelecimento líder: ${ests[0].estabelecimento}`,
      detail: `R$ ${ests[0].total.toLocaleString("pt-BR", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })} em ${ests[0].count} transações (cartão).`,
      tone: "info",
    });
  }

  const days = new Set<string>();
  for (const t of consumo) {
    if (t.dataISO) days.add(t.dataISO);
  }
  if (days.size > 0 && totalCartao > 0) {
    const media = totalCartao / days.size;
    insights.push({
      id: "media-dia",
      title: "Média diária (cartão)",
      detail: `R$ ${media.toLocaleString("pt-BR", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })} em ${days.size} dias com gasto.`,
      tone: "info",
    });
  }

  const months = monthlySeries(data);
  if (months.length >= 2) {
    const latest = months[months.length - 1];
    const prev = months[months.length - 2];
    if (prev.despesas > 0) {
      const diff = ((latest.despesas - prev.despesas) / prev.despesas) * 100;
      const sign = diff >= 0 ? "+" : "";
      insights.push({
        id: "ritmo-mes",
        title: `Ritmo de despesas em ${latest.label}`,
        detail: `${sign}${diff.toFixed(1)}% vs ${prev.label}`,
        tone: diff > 20 ? "warning" : "info",
      });
    }
  }

  const comp = expenseComposition(data);
  if (comp.fixas.count > 0) {
    insights.push({
      id: "fixas",
      title: `${comp.fixas.count} despesas fixas no período`,
      detail: `R$ ${comp.fixas.total.toLocaleString("pt-BR", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })} em aluguel, boletos e similares.`,
      tone: "info",
    });
  }

  const excluidos = data.filter(
    (t) =>
      t.natureza === "Pagamento de fatura" ||
      t.natureza === "Estorno / crédito",
  ).length;
  if (excluidos > 0) {
    insights.push({
      id: "excluidos",
      title: `${excluidos} pagamentos/estornos excluídos`,
      detail: "Não entram nas despesas de cartão analisadas.",
      tone: "warning",
    });
  }

  return insights;
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

// --- Hábitos / weekend insights ---

export type DayType = "all" | "weekday" | "weekend";

export function applyDayTypeFilter(
  data: TransactionNormalized[],
  dayType: DayType,
): TransactionNormalized[] {
  if (dayType === "all") return data;
  if (dayType === "weekend") return data.filter((t) => t.fimSemana);
  return data.filter((t) => !t.fimSemana);
}

export type WeekendStats = {
  weekendTotal: number;
  weekdayTotal: number;
  weekendDayCount: number;
  weekdayDayCount: number;
  weekendWeekCount: number;
  avgPerWeekend: number;
  avgPerWeekday: number;
  weekendShare: number;
};

export function computeWeekendStats(
  data: TransactionNormalized[],
): WeekendStats {
  let weekendTotal = 0;
  let weekdayTotal = 0;
  const weekendDays = new Set<string>();
  const weekdayDays = new Set<string>();
  const weekendWeeks = new Set<string>();

  for (const t of data) {
    if (t.tipoFluxo !== "saida" || !t.dataISO) continue;
    if (t.fimSemana) {
      weekendTotal += t.valorFluxo;
      weekendDays.add(t.dataISO);
      if (t.semana) weekendWeeks.add(t.semana);
    } else {
      weekdayTotal += t.valorFluxo;
      weekdayDays.add(t.dataISO);
    }
  }

  const total = weekendTotal + weekdayTotal;
  const weekendWeekCount = weekendWeeks.size;
  const weekendDayCount = weekendDays.size;
  const weekdayDayCount = weekdayDays.size;

  return {
    weekendTotal: round2(weekendTotal),
    weekdayTotal: round2(weekdayTotal),
    weekendDayCount,
    weekdayDayCount,
    weekendWeekCount,
    avgPerWeekend:
      weekendWeekCount > 0 ? round2(weekendTotal / weekendWeekCount) : 0,
    avgPerWeekday:
      weekdayDayCount > 0 ? round2(weekdayTotal / weekdayDayCount) : 0,
    weekendShare: total > 0 ? round2((weekendTotal / total) * 100) : 0,
  };
}

export type HabitNarrativeId =
  | "peak-day"
  | "top-cat-dominance"
  | "small-tx-30d"
  | "weekday-avg-gap"
  | "weekday-volatility";

export type HabitNarrative = {
  id: HabitNarrativeId;
  text: string;
  score: number;
};

function habitScopeLabel(dayType: DayType): string {
  if (dayType === "weekday") return "dos dias úteis";
  if (dayType === "weekend") return "do fim de semana";
  return "semanal";
}

function habitScopeSuffix(dayType: DayType): string {
  if (dayType === "weekday") return " úteis";
  if (dayType === "weekend") return " de fim de semana";
  return "";
}

function habitTotalDays(dayType: DayType): number {
  if (dayType === "weekday") return 5;
  if (dayType === "weekend") return 2;
  return 7;
}

function shiftIsoDays(iso: string, delta: number): string {
  const [y, m, d] = iso.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d + delta));
  const yy = dt.getUTCFullYear();
  const mm = String(dt.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(dt.getUTCDate()).padStart(2, "0");
  return `${yy}-${mm}-${dd}`;
}

function dailyTotalsByWeekday(
  data: TransactionNormalized[],
): Map<number, number[]> {
  const byDate = new Map<string, { index: number; total: number }>();
  for (const t of data) {
    if (t.tipoFluxo !== "saida" || !t.dataISO) continue;
    const cur = byDate.get(t.dataISO) ?? {
      index: t.diaSemanaIndex,
      total: 0,
    };
    cur.total += t.valorFluxo;
    byDate.set(t.dataISO, cur);
  }
  const byWeekday = new Map<number, number[]>();
  for (const { index, total } of byDate.values()) {
    const list = byWeekday.get(index) ?? [];
    list.push(total);
    byWeekday.set(index, list);
  }
  return byWeekday;
}

function weekdayLabelFromIndex(index: number): string {
  const labels = [
    "domingos",
    "segundas",
    "terças",
    "quartas",
    "quintas",
    "sextas",
    "sábados",
  ];
  return labels[index] ?? "esse dia";
}

function narrativePeakDay(
  data: TransactionNormalized[],
  dayType: DayType,
): HabitNarrative | null {
  const byWeekday = dailyTotalsByWeekday(data);
  if (byWeekday.size === 0) return null;

  let peakIndex = -1;
  let peakAvg = 0;
  const avgs: number[] = [];

  for (const [index, totals] of byWeekday) {
    const avg = totals.reduce((a, b) => a + b, 0) / totals.length;
    avgs.push(avg);
    if (avg > peakAvg) {
      peakAvg = avg;
      peakIndex = index;
    }
  }

  const overallAvg = avgs.reduce((a, b) => a + b, 0) / avgs.length;
  if (peakIndex < 0 || overallAvg <= 0) return null;

  const pct = round2(((peakAvg - overallAvg) / overallAvg) * 100);
  if (Math.abs(pct) < 5) return null;

  const scope = habitScopeLabel(dayType);
  const moreLess = pct >= 0 ? "mais" : "menos";
  const absPct = Math.abs(pct);

  return {
    id: "peak-day",
    text: `Você gasta ${absPct}% ${moreLess} às ${weekdayLabelFromIndex(peakIndex)} do que a média ${scope}.`,
    score: absPct,
  };
}

function narrativeTopCatDominance(
  data: TransactionNormalized[],
  dayType: DayType,
): HabitNarrative | null {
  const { rows, categories } = weekdayCategoryAggregation(data, 5);
  if (rows.length === 0 || categories.length === 0) return null;

  const dominance = new Map<string, number>();
  for (const row of rows) {
    let topCat = "";
    let topVal = 0;
    for (const cat of categories) {
      const v = (row[cat] as number) ?? 0;
      if (v > topVal) {
        topVal = v;
        topCat = cat;
      }
    }
    if (topCat && topVal > 0) {
      dominance.set(topCat, (dominance.get(topCat) ?? 0) + 1);
    }
  }

  let bestCat = "";
  let bestDays = 0;
  for (const [cat, days] of dominance) {
    if (days > bestDays) {
      bestDays = days;
      bestCat = cat;
    }
  }

  if (!bestCat || bestDays < 2) return null;

  const totalDias = habitTotalDays(dayType);
  const scope = habitScopeLabel(dayType);

  return {
    id: "top-cat-dominance",
    text: `${bestCat} domina ${bestDays} dos ${totalDias} dias ${scope}.`,
    score: (bestDays / totalDias) * 100,
  };
}

function narrativeSmallTx30d(
  data: TransactionNormalized[],
  dayType: DayType,
): HabitNarrative | null {
  let maxIso = "";
  for (const t of data) {
    if (t.tipoFluxo !== "saida" || !t.dataISO) continue;
    if (!maxIso || t.dataISO > maxIso) maxIso = t.dataISO;
  }
  if (!maxIso) return null;

  const fromIso = shiftIsoDays(maxIso, -29);
  let smallCount = 0;
  let totalInWindow = 0;

  for (const t of data) {
    if (t.tipoFluxo !== "saida" || !t.dataISO) continue;
    if (t.dataISO < fromIso || t.dataISO > maxIso) continue;
    totalInWindow += 1;
    if (t.valorFluxo < 30) smallCount += 1;
  }

  if (smallCount === 0) return null;

  const suffix = habitScopeSuffix(dayType);
  const score = totalInWindow > 0 ? (smallCount / totalInWindow) * 100 : smallCount;

  return {
    id: "small-tx-30d",
    text: `Você teve ${smallCount} transações abaixo de R$ 30 nos últimos 30 dias${suffix}.`,
    score,
  };
}

function narrativeWeekdayAvgGap(
  data: TransactionNormalized[],
): HabitNarrative | null {
  const stats = computeWeekendStats(data);
  if (stats.weekendDayCount === 0 || stats.weekdayDayCount === 0) return null;

  const weekendPerDay = stats.weekendTotal / stats.weekendDayCount;
  const weekdayPerDay = stats.weekdayTotal / stats.weekdayDayCount;
  if (weekdayPerDay <= 0) return null;

  const pct = round2(((weekendPerDay - weekdayPerDay) / weekdayPerDay) * 100);
  if (Math.abs(pct) < 5) return null;

  const moreLess = pct >= 0 ? "mais" : "menos";
  const absPct = Math.abs(pct);

  return {
    id: "weekday-avg-gap",
    text: `Fins de semana custam ${absPct}% ${moreLess} por dia do que dias úteis.`,
    score: absPct,
  };
}

function narrativeWeekdayVolatility(
  data: TransactionNormalized[],
): HabitNarrative | null {
  const byWeekday = dailyTotalsByWeekday(data);
  if (byWeekday.size < 2) return null;

  let peakIndex = -1;
  let peakCv = 0;

  for (const [index, totals] of byWeekday) {
    if (totals.length < 2) continue;
    const mean = totals.reduce((a, b) => a + b, 0) / totals.length;
    if (mean <= 0) continue;
    const variance =
      totals.reduce((acc, v) => acc + (v - mean) ** 2, 0) / totals.length;
    const cv = Math.sqrt(variance) / mean;
    if (cv > peakCv) {
      peakCv = cv;
      peakIndex = index;
    }
  }

  if (peakIndex < 0 || peakCv < 0.15) return null;

  const dayName = weekdayLabelFromIndex(peakIndex).replace(/s$/, "");
  return {
    id: "weekday-volatility",
    text: `Seus gastos de ${dayName} variam mais que qualquer outro dia.`,
    score: peakCv * 100,
  };
}

export function computeHabitNarratives(
  data: TransactionNormalized[],
  dayType: DayType,
): HabitNarrative[] {
  const candidates: HabitNarrative[] = [];

  const peak = narrativePeakDay(data, dayType);
  if (peak) candidates.push(peak);

  const dominance = narrativeTopCatDominance(data, dayType);
  if (dominance) candidates.push(dominance);

  const smallTx = narrativeSmallTx30d(data, dayType);
  if (smallTx) candidates.push(smallTx);

  if (dayType === "all") {
    const gap = narrativeWeekdayAvgGap(data);
    if (gap) candidates.push(gap);
  }

  const volatility = narrativeWeekdayVolatility(data);
  if (volatility) candidates.push(volatility);

  return candidates.sort((a, b) => b.score - a.score);
}

// --- Month comparison ---

export function shiftMonth(anoMes: string, deltaMonths: number): string {
  const [y, m] = anoMes.split("-").map(Number);
  if (!y || !m) return anoMes;
  let year = y;
  let month = m + deltaMonths;
  while (month < 1) {
    month += 12;
    year -= 1;
  }
  while (month > 12) {
    month -= 12;
    year += 1;
  }
  return `${year}-${String(month).padStart(2, "0")}`;
}

export function latestMonthWithData(
  data: TransactionNormalized[],
): string | null {
  let latest: string | null = null;
  for (const t of data) {
    if (t.tipoFluxo !== "saida" || !t.anoMes) continue;
    if (!latest || t.anoMes > latest) latest = t.anoMes;
  }
  return latest;
}

export function availableComparisonMonths(
  data: TransactionNormalized[],
): string[] {
  const set = new Set<string>();
  for (const t of data) {
    if (t.tipoFluxo === "saida" && t.anoMes) set.add(t.anoMes);
  }
  return [...set].sort((a, b) => (a < b ? 1 : -1));
}

export function monthlyCategoryTotals(
  data: TransactionNormalized[],
  anoMes: string,
): Map<string, number> {
  const map = new Map<string, number>();
  for (const t of data) {
    if (t.anoMes !== anoMes || t.tipoFluxo !== "saida") continue;
    map.set(t.categoria, (map.get(t.categoria) ?? 0) + t.valorFluxo);
  }
  for (const [k, v] of map) {
    map.set(k, round2(v));
  }
  return map;
}

export type ComparisonDelta = {
  abs: number;
  pct: number | null;
  direction: "up" | "down" | "flat" | "new";
};

export type CategoryComparisonRow = {
  categoria: string;
  current: number;
  prev: number;
  prevYear: number;
  deltaPrev: ComparisonDelta;
  deltaPrevYear: ComparisonDelta;
};

export type MonthComparison = {
  anchor: string;
  prev: string;
  prevYear: string;
  hasPrev: boolean;
  hasPrevYear: boolean;
  totals: {
    current: number;
    prev: number;
    prevYear: number;
    deltaPrev: ComparisonDelta;
    deltaPrevYear: ComparisonDelta;
  };
  rows: CategoryComparisonRow[];
};

export function computeComparisonDelta(
  current: number,
  other: number,
): ComparisonDelta {
  const abs = round2(current - other);
  if (current === 0 && other === 0) {
    return { abs, pct: 0, direction: "flat" };
  }
  if (other === 0 && current > 0) {
    return { abs, pct: null, direction: "new" };
  }
  if (current === 0 && other > 0) {
    return { abs, pct: -100, direction: "down" };
  }
  const pct = round2(((current - other) / other) * 100);
  const direction =
    Math.abs(pct) < 0.5 ? "flat" : pct > 0 ? "up" : "down";
  return { abs, pct, direction };
}

function sumMapValues(map: Map<string, number>): number {
  let total = 0;
  for (const v of map.values()) total += v;
  return round2(total);
}

function monthHasExpense(
  data: TransactionNormalized[],
  anoMes: string,
): boolean {
  for (const t of data) {
    if (t.anoMes === anoMes && t.tipoFluxo === "saida") return true;
  }
  return false;
}

export function compareMonths(
  data: TransactionNormalized[],
  anchor: string,
): MonthComparison {
  const prev = shiftMonth(anchor, -1);
  const prevYear = shiftMonth(anchor, -12);

  const currentMap = monthlyCategoryTotals(data, anchor);
  const prevMap = monthlyCategoryTotals(data, prev);
  const prevYearMap = monthlyCategoryTotals(data, prevYear);

  const categories = new Set<string>([
    ...currentMap.keys(),
    ...prevMap.keys(),
    ...prevYearMap.keys(),
  ]);

  const rows: CategoryComparisonRow[] = [...categories].map((categoria) => {
    const current = currentMap.get(categoria) ?? 0;
    const prevVal = prevMap.get(categoria) ?? 0;
    const prevYearVal = prevYearMap.get(categoria) ?? 0;
    return {
      categoria,
      current,
      prev: prevVal,
      prevYear: prevYearVal,
      deltaPrev: computeComparisonDelta(current, prevVal),
      deltaPrevYear: computeComparisonDelta(current, prevYearVal),
    };
  });

  rows.sort((a, b) => {
    if (b.current !== a.current) return b.current - a.current;
    const maxA = Math.max(a.prev, a.prevYear);
    const maxB = Math.max(b.prev, b.prevYear);
    return maxB - maxA;
  });

  const totalCurrent = sumMapValues(currentMap);
  const totalPrev = sumMapValues(prevMap);
  const totalPrevYear = sumMapValues(prevYearMap);

  return {
    anchor,
    prev,
    prevYear,
    hasPrev: monthHasExpense(data, prev),
    hasPrevYear: monthHasExpense(data, prevYear),
    totals: {
      current: totalCurrent,
      prev: totalPrev,
      prevYear: totalPrevYear,
      deltaPrev: computeComparisonDelta(totalCurrent, totalPrev),
      deltaPrevYear: computeComparisonDelta(totalCurrent, totalPrevYear),
    },
    rows,
  };
}
