import { budgetStatus, BudgetStatus } from "./budgets";
import { todayIso } from "./dates";
import {
  CardCycleGroup,
  groupCardTransactionsByCycle,
  isCardTransaction,
} from "./transactionViews";
import { Account, TransactionNormalized } from "./types";

export type CardLimitUsage = {
  accountId: string;
  accountNome: string;
  limite: number;
  gasto: number;
  percentual: number;
  status: BudgetStatus;
  restante: number;
  payDate: string | null;
};

export type CardLimitAlertSummary = {
  warning: number;
  danger: number;
  total: number;
};

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

function cardHasLimit(account: Account): account is Account & { limiteMensal: number } {
  return (
    account.kind === "cartao" &&
    account.ativa &&
    typeof account.limiteMensal === "number" &&
    Number.isFinite(account.limiteMensal) &&
    account.limiteMensal > 0
  );
}

export function getCurrentCycleForAccount(
  accountId: string,
  cycles: CardCycleGroup[],
  today: string = todayIso(),
): CardCycleGroup | null {
  const groups = cycles.filter((group) => group.account.id === accountId);
  if (groups.length === 0) return null;

  const upcoming = groups
    .filter((group) => group.payDate >= today)
    .sort((a, b) => (a.payDate < b.payDate ? -1 : 1));
  if (upcoming.length > 0) return upcoming[0];

  const past = groups
    .filter((group) => group.payDate < today)
    .sort((a, b) => (a.payDate < b.payDate ? 1 : -1));
  return past[0] ?? null;
}

export function usageFromCycle(
  account: Account,
  cycle: CardCycleGroup | null,
): CardLimitUsage | null {
  if (!cardHasLimit(account)) return null;

  const limite = account.limiteMensal;
  const gasto = round2(cycle?.total ?? 0);
  const percentual =
    limite > 0 ? round2((gasto / limite) * 100) : gasto > 0 ? 100 : 0;

  return {
    accountId: account.id,
    accountNome: account.nome,
    limite,
    gasto,
    percentual,
    status: budgetStatus(gasto, limite),
    restante: round2(Math.max(0, limite - gasto)),
    payDate: cycle?.payDate ?? null,
  };
}

export function cardLimitUsages(
  normalized: TransactionNormalized[],
  accounts: Account[],
  today: string = todayIso(),
): CardLimitUsage[] {
  const cardAccounts = accounts.filter(cardHasLimit);
  if (cardAccounts.length === 0) return [];

  const cardTransactions = normalized.filter((tx) =>
    isCardTransaction(tx, accounts),
  );
  const cycles = groupCardTransactionsByCycle(cardTransactions, accounts);

  return cardAccounts
    .map((account) => {
      const cycle = getCurrentCycleForAccount(account.id, cycles, today);
      return usageFromCycle(account, cycle);
    })
    .filter((usage): usage is CardLimitUsage => usage !== null)
    .sort((a, b) => b.percentual - a.percentual);
}

export function cardLimitUsageForAccount(
  account: Account,
  normalized: TransactionNormalized[],
  accounts: Account[],
  today: string = todayIso(),
): CardLimitUsage | null {
  if (!cardHasLimit(account)) return null;

  const cardTransactions = normalized.filter((tx) =>
    isCardTransaction(tx, accounts),
  );
  const cycles = groupCardTransactionsByCycle(cardTransactions, accounts);
  const cycle = getCurrentCycleForAccount(account.id, cycles, today);
  return usageFromCycle(account, cycle);
}

export function cardLimitAlertSummary(
  usages: CardLimitUsage[],
): CardLimitAlertSummary {
  let warning = 0;
  let danger = 0;
  for (const usage of usages) {
    if (usage.status === "warning") warning += 1;
    if (usage.status === "danger") danger += 1;
  }
  return { warning, danger, total: usages.length };
}

export function projectCardLimitAfterExpense(
  usage: CardLimitUsage,
  additionalExpense: number,
): Pick<CardLimitUsage, "gasto" | "percentual" | "status" | "restante"> {
  const gasto = round2(usage.gasto + additionalExpense);
  const limite = usage.limite;
  const percentual =
    limite > 0 ? round2((gasto / limite) * 100) : gasto > 0 ? 100 : 0;

  return {
    gasto,
    percentual,
    status: budgetStatus(gasto, limite),
    restante: round2(Math.max(0, limite - gasto)),
  };
}
