import { SEM_CATEGORIA } from "./normalize";
import { CategoryBudget, TransactionNormalized } from "./types";

export type BudgetStatus = "ok" | "warning" | "danger";

export type BudgetUsage = {
  budgetId: string;
  categoria: string;
  limite: number;
  gasto: number;
  percentual: number;
  status: BudgetStatus;
  ativa: boolean;
};

export type BudgetAlertSummary = {
  warning: number;
  danger: number;
  total: number;
};

export type BudgetHistorySuggestion = {
  categoria: string;
  valorSugerido: number;
  baseMedianaMensal: number;
  mesesConsiderados: number;
  mesesIgnoradosOutlier: number;
  transacoesNaCategoria: number;
};

export type SuggestBudgetsOptions = {
  referenceDate?: Date;
  windowMonths?: number;
  minHistoryDays?: number;
};

const SUGGEST_WINDOW_MONTHS = 3;
const SUGGEST_MIN_HISTORY_DAYS = 30;
const SUGGEST_MIN_CATEGORIES = 3;
const SUGGEST_TOP_N = 5;
const SUGGEST_EXTRA_N = 5;

function stripDiacritics(s: string): string {
  return s.normalize("NFD").replace(/\p{Diacritic}/gu, "");
}

export function newBudgetId(): string {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return `bud-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export function currentMonthIso(date = new Date()): string {
  const y = date.getUTCFullYear();
  const m = date.getUTCMonth() + 1;
  return `${y}-${String(m).padStart(2, "0")}`;
}

export function normalizeBudgetCategory(categoria: string): string {
  const t = categoria.trim();
  return t.length > 0 ? t : SEM_CATEGORIA;
}

/** Case- and accent-insensitive key for duplicate budget detection. */
export function budgetCategoryKey(categoria: string): string {
  return stripDiacritics(normalizeBudgetCategory(categoria)).toLowerCase();
}

export function budgetCategoriesMatch(a: string, b: string): boolean {
  return budgetCategoryKey(a) === budgetCategoryKey(b);
}

export function budgetStatus(gasto: number, limite: number): BudgetStatus {
  if (limite <= 0) return gasto > 0 ? "danger" : "ok";
  const pct = (gasto / limite) * 100;
  if (pct >= 100) return "danger";
  if (pct >= 80) return "warning";
  return "ok";
}

export function spendingByCategoryForMonth(
  normalized: TransactionNormalized[],
  anoMes: string,
): Map<string, number> {
  const map = new Map<string, number>();
  for (const t of normalized) {
    if (t.anoMes !== anoMes || t.tipoFluxo !== "saida") continue;
    const cat = normalizeBudgetCategory(t.categoria);
    map.set(cat, (map.get(cat) ?? 0) + t.valorFluxo);
  }
  return map;
}

export function budgetUsageForMonth(
  normalized: TransactionNormalized[],
  budgets: CategoryBudget[],
  anoMes: string = currentMonthIso(),
): BudgetUsage[] {
  const spending = spendingByCategoryForMonth(normalized, anoMes);
  const active = budgets.filter((b) => b.ativa);

  return active
    .map((b) => {
      const cat = normalizeBudgetCategory(b.categoria);
      const gasto = Math.round((spending.get(cat) ?? 0) * 100) / 100;
      const limite = b.valorMensal;
      const percentual =
        limite > 0 ? Math.round((gasto / limite) * 10000) / 100 : gasto > 0 ? 100 : 0;
      return {
        budgetId: b.id,
        categoria: cat,
        limite,
        gasto,
        percentual,
        status: budgetStatus(gasto, limite),
        ativa: b.ativa,
      };
    })
    .sort((a, b) => b.percentual - a.percentual);
}

export function budgetAlertSummary(usages: BudgetUsage[]): BudgetAlertSummary {
  let warning = 0;
  let danger = 0;
  for (const u of usages) {
    if (u.status === "warning") warning += 1;
    if (u.status === "danger") danger += 1;
  }
  return { warning, danger, total: usages.length };
}

export function findBudgetForCategory(
  budgets: CategoryBudget[],
  categoria: string,
): CategoryBudget | undefined {
  const cat = normalizeBudgetCategory(categoria);
  return budgets.find(
    (b) => b.ativa && normalizeBudgetCategory(b.categoria) === cat,
  );
}

export function projectUsageAfterExpense(
  usage: BudgetUsage,
  additionalExpense: number,
): { gasto: number; percentual: number; status: BudgetStatus } {
  const gasto = Math.round((usage.gasto + additionalExpense) * 100) / 100;
  const limite = usage.limite;
  const percentual =
    limite > 0
      ? Math.round((gasto / limite) * 10000) / 100
      : gasto > 0
        ? 100
        : 0;
  return {
    gasto,
    percentual,
    status: budgetStatus(gasto, limite),
  };
}

export function uniqueCategoriesFromTransactions(
  normalized: TransactionNormalized[],
): string[] {
  const set = new Set<string>();
  for (const t of normalized) {
    if (t.tipoFluxo === "saida") {
      set.add(normalizeBudgetCategory(t.categoria));
    }
  }
  return [...set].sort((a, b) => a.localeCompare(b, "pt-BR"));
}

export function createBudget(
  categoria: string,
  valorMensal: number,
  partial?: Partial<CategoryBudget>,
): CategoryBudget {
  const now = new Date().toISOString();
  return {
    id: partial?.id ?? newBudgetId(),
    categoria: normalizeBudgetCategory(categoria),
    valorMensal,
    ativa: partial?.ativa !== false,
    criadaEm: partial?.criadaEm ?? now,
    atualizadaEm: now,
    ...partial,
  };
}

/** Last N complete calendar months before reference month (UTC). */
export function previousCompleteMonths(
  referenceDate: Date,
  count: number,
): string[] {
  const months: string[] = [];
  const d = new Date(
    Date.UTC(referenceDate.getUTCFullYear(), referenceDate.getUTCMonth(), 1),
  );
  for (let i = 0; i < count; i++) {
    d.setUTCMonth(d.getUTCMonth() - 1);
    const y = d.getUTCFullYear();
    const m = d.getUTCMonth() + 1;
    months.push(`${y}-${String(m).padStart(2, "0")}`);
  }
  return months;
}

export function roundBudgetSuggestion(value: number): number {
  if (value <= 0) return 10;
  if (value <= 500) {
    return Math.ceil(value / 10) * 10;
  }
  return Math.ceil(value / 50) * 50;
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

export function removeOutlierMonthlyTotals(monthlyTotals: number[]): {
  cleaned: number[];
  ignoredCount: number;
} {
  const values = monthlyTotals.filter((v) => v > 0);
  if (values.length <= 1) {
    return { cleaned: values, ignoredCount: 0 };
  }
  const med = median(values);
  if (med <= 0) return { cleaned: values, ignoredCount: 0 };
  const cleaned: number[] = [];
  let ignored = 0;
  for (const v of values) {
    if (v > 2 * med) {
      ignored += 1;
    } else {
      cleaned.push(v);
    }
  }
  if (cleaned.length === 0) {
    return { cleaned: values, ignoredCount: 0 };
  }
  return { cleaned, ignoredCount: ignored };
}

function countTransactionsByCategoryMonth(
  normalized: TransactionNormalized[],
  anoMes: string,
): Map<string, number> {
  const map = new Map<string, number>();
  for (const t of normalized) {
    if (t.anoMes !== anoMes || t.tipoFluxo !== "saida") continue;
    const cat = normalizeBudgetCategory(t.categoria);
    map.set(cat, (map.get(cat) ?? 0) + 1);
  }
  return map;
}

export function earliestSaidaDate(
  normalized: TransactionNormalized[],
): Date | null {
  let min: string | null = null;
  for (const t of normalized) {
    if (t.tipoFluxo !== "saida") continue;
    if (!min || t.dataISO < min) min = t.dataISO;
  }
  if (!min) return null;
  return new Date(`${min}T12:00:00.000Z`);
}

export function hasEnoughHistoryForBudgetSuggestions(
  normalized: TransactionNormalized[],
  referenceDate = new Date(),
  minHistoryDays = SUGGEST_MIN_HISTORY_DAYS,
): boolean {
  const earliest = earliestSaidaDate(normalized);
  if (!earliest) return false;
  const diffMs = referenceDate.getTime() - earliest.getTime();
  return diffMs >= minHistoryDays * 24 * 60 * 60 * 1000;
}

export function suggestBudgetsFromHistory(
  normalized: TransactionNormalized[],
  budgets: CategoryBudget[],
  opts?: SuggestBudgetsOptions,
): BudgetHistorySuggestion[] {
  const referenceDate = opts?.referenceDate ?? new Date();
  const windowMonths = opts?.windowMonths ?? SUGGEST_WINDOW_MONTHS;
  const months = previousCompleteMonths(referenceDate, windowMonths);

  const coveredKeys = new Set(
    budgets
      .filter((b) => b.ativa)
      .map((b) => budgetCategoryKey(b.categoria)),
  );

  type CatAgg = {
    categoria: string;
    monthly: Map<string, number>;
    txCount: number;
  };
  const byCat = new Map<string, CatAgg>();

  for (const anoMes of months) {
    const spending = spendingByCategoryForMonth(normalized, anoMes);
    const txCounts = countTransactionsByCategoryMonth(normalized, anoMes);
    for (const [cat, gasto] of spending) {
      if (coveredKeys.has(budgetCategoryKey(cat))) continue;
      let agg = byCat.get(cat);
      if (!agg) {
        agg = { categoria: cat, monthly: new Map(), txCount: 0 };
        byCat.set(cat, agg);
      }
      agg.monthly.set(anoMes, gasto);
      agg.txCount += txCounts.get(cat) ?? 0;
    }
  }

  const suggestions: BudgetHistorySuggestion[] = [];

  for (const agg of byCat.values()) {
    let qualifyingMonth = false;
    for (const anoMes of months) {
      const txInMonth =
        countTransactionsByCategoryMonth(normalized, anoMes).get(agg.categoria) ??
        0;
      const gasto = agg.monthly.get(anoMes) ?? 0;
      if (txInMonth >= 3 && gasto > 0) {
        qualifyingMonth = true;
        break;
      }
    }
    if (!qualifyingMonth) continue;

    const monthlyValues = months.map((m) => agg.monthly.get(m) ?? 0);
    const { cleaned, ignoredCount } = removeOutlierMonthlyTotals(monthlyValues);
    if (cleaned.length < 1) continue;

    const baseMedianaMensal = median(cleaned);
    const valorSugerido = roundBudgetSuggestion(baseMedianaMensal);

    suggestions.push({
      categoria: agg.categoria,
      valorSugerido,
      baseMedianaMensal: Math.round(baseMedianaMensal * 100) / 100,
      mesesConsiderados: cleaned.length,
      mesesIgnoradosOutlier: ignoredCount,
      transacoesNaCategoria: agg.txCount,
    });
  }

  return suggestions.sort((a, b) => b.valorSugerido - a.valorSugerido);
}

export function canShowBudgetSuggestions(
  normalized: TransactionNormalized[],
  budgets: CategoryBudget[],
  opts?: SuggestBudgetsOptions,
): boolean {
  if (!hasEnoughHistoryForBudgetSuggestions(normalized, opts?.referenceDate)) {
    return false;
  }
  const all = suggestBudgetsFromHistory(normalized, budgets, opts);
  return all.length >= SUGGEST_MIN_CATEGORIES;
}

export const BUDGET_SUGGEST_TOP_N = SUGGEST_TOP_N;
export const BUDGET_SUGGEST_EXTRA_N = SUGGEST_EXTRA_N;

export function sliceBudgetSuggestions(
  suggestions: BudgetHistorySuggestion[],
  showExtra: boolean,
): BudgetHistorySuggestion[] {
  const limit = showExtra
    ? SUGGEST_TOP_N + SUGGEST_EXTRA_N
    : SUGGEST_TOP_N;
  return suggestions.slice(0, limit);
}
