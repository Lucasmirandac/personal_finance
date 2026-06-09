import { computeDailyAllowance } from "./dailyAllowance";
import { budgetUsageForMonth, currentMonthIso } from "./budgets";
import {
  Account,
  CategoryBudget,
  MonthCloseEntry,
  MonthCloseTopCategory,
  RecurringRule,
  SavingsPreference,
  TransactionNormalized,
} from "./types";

export type MonthCloseSugestao =
  | { tipo: "criar_orcamento" }
  | { tipo: "manter" }
  | {
      tipo: "aumentar_limite";
      categoria: string;
      deltaSugerido: number;
    };

export type MonthCloseSummary = {
  anoMes: string;
  sobra: number;
  temRendaCadastrada: boolean;
  hasActiveBudgets: boolean;
  top3Estouro: MonthCloseTopCategory[];
  top3Sobra: MonthCloseTopCategory[];
  sugestao: MonthCloseSugestao;
};

export type ComputeMonthCloseSummaryInput = {
  anoMes: string;
  normalized: TransactionNormalized[];
  recurringRules: RecurringRule[];
  accounts: Account[];
  structuralCategories: string[];
  budgets: CategoryBudget[];
  poupanca?: SavingsPreference | null;
};

function endOfMonthDate(anoMes: string): Date {
  const [year, month] = anoMes.split("-").map(Number);
  const lastDay = new Date(Date.UTC(year, month, 0)).getUTCDate();
  return new Date(Date.UTC(year, month - 1, lastDay, 12, 0, 0, 0));
}

function toTopCategory(
  u: ReturnType<typeof budgetUsageForMonth>[number],
): MonthCloseTopCategory {
  return {
    categoria: u.categoria,
    gasto: u.gasto,
    limite: u.limite,
    percentual: u.percentual,
  };
}

export function getOldestPendingClose(
  normalized: TransactionNormalized[],
  monthCloses: MonthCloseEntry[],
  today: Date = new Date(),
): string | null {
  const current = currentMonthIso(today);
  const closed = new Set(monthCloses.map((m) => m.anoMes));
  const pending = new Set<string>();

  for (const t of normalized) {
    if (t.anoMes && t.anoMes < current && !closed.has(t.anoMes)) {
      pending.add(t.anoMes);
    }
  }

  if (pending.size === 0) return null;
  return [...pending].sort((a, b) => a.localeCompare(b))[0] ?? null;
}

export function computeMonthCloseSummary(
  input: ComputeMonthCloseSummaryInput,
): MonthCloseSummary {
  const allowance = computeDailyAllowance({
    normalized: input.normalized,
    recurringRules: input.recurringRules,
    accounts: input.accounts,
    structuralCategories: input.structuralCategories,
    poupanca: input.poupanca,
    today: endOfMonthDate(input.anoMes),
  });

  const hasActiveBudgets = input.budgets.some((b) => b.ativa);

  if (!hasActiveBudgets) {
    return {
      anoMes: input.anoMes,
      sobra: allowance.sobraDoMes,
      temRendaCadastrada: allowance.temRendaCadastrada,
      hasActiveBudgets: false,
      top3Estouro: [],
      top3Sobra: [],
      sugestao: { tipo: "criar_orcamento" },
    };
  }

  const usage = budgetUsageForMonth(
    input.normalized,
    input.budgets,
    input.anoMes,
  );

  const top3Estouro = usage.slice(0, 3).map(toTopCategory);
  const top3Sobra = [...usage]
    .filter((u) => u.percentual < 80)
    .sort((a, b) => a.percentual - b.percentual)
    .slice(0, 3)
    .map(toTopCategory);

  const worst = usage.find((u) => u.percentual > 100);
  const sugestao: MonthCloseSugestao = worst
    ? {
        tipo: "aumentar_limite",
        categoria: worst.categoria,
        deltaSugerido: Math.ceil((worst.gasto - worst.limite) / 10) * 10,
      }
    : { tipo: "manter" };

  return {
    anoMes: input.anoMes,
    sobra: allowance.sobraDoMes,
    temRendaCadastrada: allowance.temRendaCadastrada,
    hasActiveBudgets: true,
    top3Estouro,
    top3Sobra,
    sugestao,
  };
}

export function buildMonthCloseEntry(
  summary: MonthCloseSummary,
  closedAt: string = new Date().toISOString(),
): MonthCloseEntry {
  return {
    anoMes: summary.anoMes,
    sobra: summary.sobra,
    top3estouro: summary.top3Estouro,
    closedAt,
  };
}
