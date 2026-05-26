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
