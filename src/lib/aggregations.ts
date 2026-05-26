import { Natureza, TransactionNormalized } from "./types";
import { formatMonthLabel } from "./format";

export type Filters = {
  anosMeses: string[]; // anoMes selected; empty = all
  categorias: string[];
  naturezas: Natureza[];
  faixas: string[];
  search: string;
};

export const EMPTY_FILTERS: Filters = {
  anosMeses: [],
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
    if (filters.anosMeses.length && !filters.anosMeses.includes(t.anoMes))
      return false;
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
  const excluidos = data.filter((t) => t.natureza !== "Gasto").length;
  const totalBruto = all.reduce((acc, t) => acc + t.valorOriginal, 0);
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
  };
}

export type MonthlySeriesPoint = {
  anoMes: string;
  label: string;
  total: number;
  count: number;
};

export function monthlySeries(
  data: TransactionNormalized[],
): MonthlySeriesPoint[] {
  const map = new Map<string, { total: number; count: number }>();
  for (const t of data) {
    if (t.natureza !== "Gasto" || !t.anoMes) continue;
    const cur = map.get(t.anoMes) ?? { total: 0, count: 0 };
    cur.total += t.valorAnalise;
    cur.count += 1;
    map.set(t.anoMes, cur);
  }
  const arr = [...map.entries()].map(([anoMes, v]) => ({
    anoMes,
    label: formatMonthLabel(anoMes),
    total: round2(v.total),
    count: v.count,
  }));
  arr.sort((a, b) => (a.anoMes < b.anoMes ? -1 : 1));
  return arr;
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
    if (t.natureza !== "Gasto") continue;
    const cur = map.get(t.categoria) ?? { total: 0, count: 0 };
    cur.total += t.valorAnalise;
    cur.count += 1;
    map.set(t.categoria, cur);
    totalAll += t.valorAnalise;
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
    if (t.natureza !== "Gasto") continue;
    const cur = map.get(t.diaSemanaIndex) ?? {
      dia: t.diaSemana,
      total: 0,
      count: 0,
    };
    cur.total += t.valorAnalise;
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
  const consumo = data.filter((t) => t.natureza === "Gasto");
  if (consumo.length === 0) return insights;

  const cats = categoryAggregation(data);
  const total = consumo.reduce((acc, t) => acc + t.valorAnalise, 0);

  if (cats[0]) {
    insights.push({
      id: "top-cat",
      title: `Maior categoria: ${cats[0].categoria}`,
      detail: `R$ ${cats[0].total
        .toLocaleString("pt-BR", {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        })} (${cats[0].share.toFixed(1)}% do gasto analisado)`,
      tone: "info",
    });
  }
  if (cats.length >= 2) {
    const share = cats[0].share + cats[1].share;
    insights.push({
      id: "top2-cat",
      title: `Top 2 categorias concentram ${share.toFixed(1)}%`,
      detail: `${cats[0].categoria} + ${cats[1].categoria} representam ${share.toFixed(
        1,
      )}% do consumo.`,
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
      })} em ${ests[0].count} transações.`,
      tone: "info",
    });
  }

  // Average per day across observed days
  const days = new Set<string>();
  for (const t of consumo) {
    if (t.dataISO) days.add(t.dataISO);
  }
  if (days.size > 0) {
    const media = total / days.size;
    insights.push({
      id: "media-dia",
      title: "Média diária",
      detail: `R$ ${media.toLocaleString("pt-BR", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })} em ${days.size} dias com gasto registrado.`,
      tone: "info",
    });
  }

  // Current month pace
  const months = monthlySeries(data);
  if (months.length > 0) {
    const latest = months[months.length - 1];
    if (months.length >= 2) {
      const prev = months[months.length - 2];
      const diff = ((latest.total - prev.total) / prev.total) * 100;
      const sign = diff >= 0 ? "+" : "";
      insights.push({
        id: "ritmo-mes",
        title: `Ritmo de ${latest.label}`,
        detail: `${sign}${diff.toFixed(1)}% vs ${prev.label} (R$ ${latest.total.toLocaleString(
          "pt-BR",
          { minimumFractionDigits: 2, maximumFractionDigits: 2 },
        )} no mês mais recente).`,
        tone: diff > 20 ? "warning" : "info",
      });
    }
  }

  const excluidos = data.filter((t) => t.natureza !== "Gasto").length;
  if (excluidos > 0) {
    insights.push({
      id: "excluidos",
      title: `${excluidos} itens excluídos do gasto`,
      detail:
        "Pagamentos de fatura e estornos/créditos não entram no total analisado. Confira a tabela detalhada se algo parecer fora.",
      tone: "warning",
    });
  }

  return insights;
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
