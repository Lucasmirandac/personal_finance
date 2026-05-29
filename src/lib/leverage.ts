import { normalizeBudgetCategory, currentMonthIso } from "./budgets";
import { addMonthsYyyyMm } from "./dates";
import { SEM_CATEGORIA } from "./normalize";
import { RecurringRule, TransactionNormalized } from "./types";

export const LEVERAGE_THRESHOLD_HEALTHY = 0.3;
export const LEVERAGE_THRESHOLD_WARNING = 0.5;
export const LEVERAGE_THRESHOLD_CRITICAL = 0.7;

export const LEVERAGE_ALERT_COPY =
  "Seu custo de vida fixo está muito alto para a sua renda atual. Para se reestruturar rápido, avalie negociar esses contratos ou reduzir a estrutura.";

export type LeverageBand = "saudavel" | "atenta" | "alta" | "critica";

export type LeverageBreakdownLine = {
  origem: "regra" | "csv";
  categoria: string;
  descricao: string;
  valorMensal: number;
  detalhe: string;
};

export type LeverageRatio = {
  rendaMensal: number;
  custoFixoMensal: number;
  custoFixoRegras: number;
  custoFixoCsv: number;
  ratio: number;
  ratioPercent: number;
  band: LeverageBand;
  alert: boolean;
  breakdown: LeverageBreakdownLine[];
};

export type LeverageMessage = {
  tone: "info" | "warning" | "critical";
  title: string;
  detail: string;
};

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

function median(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 0) {
    return round2((sorted[mid - 1] + sorted[mid]) / 2);
  }
  return round2(sorted[mid]);
}

function resolveBand(ratio: number): LeverageBand {
  if (!Number.isFinite(ratio) || ratio >= LEVERAGE_THRESHOLD_CRITICAL) return "critica";
  if (ratio >= LEVERAGE_THRESHOLD_WARNING) return "alta";
  if (ratio >= LEVERAGE_THRESHOLD_HEALTHY) return "atenta";
  return "saudavel";
}

export function lastClosedMonths(count: number, today: Date = new Date()): string[] {
  const current = currentMonthIso(today);
  const months: string[] = [];
  for (let i = 1; i <= count; i += 1) {
    months.push(addMonthsYyyyMm(current, -i));
  }
  return months;
}

export function monthlyCategorySpending(
  normalized: TransactionNormalized[],
  categoria: string,
  anoMes: string,
  csvOnly = false,
): number {
  const cat = normalizeBudgetCategory(categoria);
  let total = 0;
  for (const t of normalized) {
    if (t.anoMes !== anoMes || t.tipoFluxo !== "saida") continue;
    if (csvOnly && t.fonte !== "inter" && t.fonte !== "nubank") continue;
    if (normalizeBudgetCategory(t.categoria) !== cat) continue;
    total += t.valorFluxo;
  }
  return round2(total);
}

export function medianCategorySpending(
  normalized: TransactionNormalized[],
  categoria: string,
  months: string[],
  csvOnly = false,
): number {
  if (months.length === 0) return 0;
  const totals = months.map((m) =>
    monthlyCategorySpending(normalized, categoria, m, csvOnly),
  );
  return median(totals);
}

export type CategoryCsvCandidate = {
  categoria: string;
  mediana3m: number;
  mesesComDado: number;
};

export function rankCategoryCsvCandidates(
  normalized: TransactionNormalized[],
  today: Date = new Date(),
  topN = 8,
): CategoryCsvCandidate[] {
  const months = lastClosedMonths(3, today);
  const totals = new Map<string, { sum: number; monthsWithData: number }>();

  for (const t of normalized) {
    if (t.tipoFluxo !== "saida" || !t.anoMes) continue;
    if (t.fonte !== "inter" && t.fonte !== "nubank") continue;
    const cat = normalizeBudgetCategory(t.categoria);
    if (cat === SEM_CATEGORIA) continue;
    if (!totals.has(cat)) {
      totals.set(cat, { sum: 0, monthsWithData: 0 });
    }
  }

  for (const [cat] of totals) {
    const monthTotals = months.map((m) =>
      monthlyCategorySpending(normalized, cat, m, true),
    );
    const monthsWithData = monthTotals.filter((v) => v > 0).length;
    totals.set(cat, {
      sum: median(monthTotals),
      monthsWithData,
    });
  }

  return [...totals.entries()]
    .map(([categoria, v]) => ({
      categoria,
      mediana3m: v.sum,
      mesesComDado: v.monthsWithData,
    }))
    .filter((c) => c.mediana3m > 0)
    .sort((a, b) => b.mediana3m - a.mediana3m)
    .slice(0, topN);
}

export function computeLeverageRatio(input: {
  recurringRules: RecurringRule[];
  normalized: TransactionNormalized[];
  structuralCategories: string[];
  today?: Date;
}): LeverageRatio {
  const today = input.today ?? new Date();
  const activeRules = input.recurringRules.filter((r) => r.ativo);
  const breakdown: LeverageBreakdownLine[] = [];

  const rendaMensal = round2(
    activeRules
      .filter((r) => r.kind === "receita")
      .reduce((acc, r) => acc + Math.abs(r.valor), 0),
  );

  const fixedRules = activeRules.filter((r) => r.kind === "despesa_fixa");
  const categoriasComRegra = new Set(
    fixedRules.map((r) => normalizeBudgetCategory(r.categoria)),
  );

  let custoFixoRegras = 0;
  for (const rule of fixedRules) {
    const valor = Math.abs(rule.valor);
    custoFixoRegras += valor;
    breakdown.push({
      origem: "regra",
      categoria: normalizeBudgetCategory(rule.categoria),
      descricao: rule.descricao,
      valorMensal: round2(valor),
      detalhe: "regra mensal",
    });
  }
  custoFixoRegras = round2(custoFixoRegras);

  const closedMonths = lastClosedMonths(3, today);
  const structuralSet = new Set(
    input.structuralCategories.map((c) => normalizeBudgetCategory(c)),
  );

  let custoFixoCsv = 0;
  for (const categoria of structuralSet) {
    if (categoriasComRegra.has(categoria)) continue;
    const valor = medianCategorySpending(
      input.normalized,
      categoria,
      closedMonths,
      true,
    );
    custoFixoCsv += valor;
    breakdown.push({
      origem: "csv",
      categoria,
      descricao: categoria,
      valorMensal: valor,
      detalhe:
        valor > 0
          ? `mediana ${closedMonths.length}m`
          : "sem histórico nos últimos 3 meses",
    });
  }
  custoFixoCsv = round2(custoFixoCsv);

  const custoFixoMensal = round2(custoFixoRegras + custoFixoCsv);

  let ratio: number;
  if (rendaMensal > 0) {
    ratio = custoFixoMensal / rendaMensal;
  } else if (custoFixoMensal > 0) {
    ratio = Infinity;
  } else {
    ratio = 0;
  }

  const band = resolveBand(ratio);
  const ratioPercent = Number.isFinite(ratio)
    ? round2(ratio * 100)
    : 100;

  breakdown.sort((a, b) => b.valorMensal - a.valorMensal);

  return {
    rendaMensal,
    custoFixoMensal,
    custoFixoRegras,
    custoFixoCsv,
    ratio,
    ratioPercent,
    band,
    alert: band === "alta" || band === "critica",
    breakdown,
  };
}

export function leverageMessage(r: LeverageRatio): LeverageMessage | null {
  if (r.rendaMensal <= 0 && r.custoFixoMensal <= 0) {
    return null;
  }

  if (r.rendaMensal <= 0 && r.custoFixoMensal > 0) {
    return {
      tone: "critical",
      title: "Custos fixos sem renda cadastrada",
      detail:
        "Você cadastrou custos fixos antes de informar sua renda. Adicione uma receita recorrente para ver sua alavancagem.",
    };
  }

  if (r.band === "critica") {
    return {
      tone: "critical",
      title: `Custo fixo em ${r.ratioPercent}% da renda`,
      detail: LEVERAGE_ALERT_COPY,
    };
  }

  if (r.band === "alta") {
    return {
      tone: "warning",
      title: `Custo fixo em ${r.ratioPercent}% da renda`,
      detail: LEVERAGE_ALERT_COPY,
    };
  }

  if (r.band === "atenta") {
    return {
      tone: "info",
      title: `Custo fixo em ${r.ratioPercent}% da renda`,
      detail:
        "Você está perto do limite de 50%. Revise contratos e despesas estruturais antes de assumir novos compromissos.",
    };
  }

  return {
    tone: "info",
    title: `Custo fixo em ${r.ratioPercent}% da renda`,
    detail: "Sua estrutura fixa está em nível saudável em relação à renda cadastrada.",
  };
}
