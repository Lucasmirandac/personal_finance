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
