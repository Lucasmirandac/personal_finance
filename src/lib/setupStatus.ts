import { accountsToBalanceAnchor, hasProjectionSetup } from "./accounts";
import {
  Account,
  Dataset,
  ManualTransaction,
  RecurringRule,
  Settings,
} from "./types";

export function hasCashAccount(accounts: Account[]): boolean {
  return accountsToBalanceAnchor(accounts) != null;
}

export function hasCardAccount(accounts: Account[]): boolean {
  return accounts.some((a) => a.ativa && a.kind === "cartao");
}

export function hasIncome(recurringRules: RecurringRule[]): boolean {
  return recurringRules.some((r) => r.kind === "receita" && r.ativo);
}

export function hasMonthLaunched(
  recurringRules: RecurringRule[],
  manuals: ManualTransaction[] = [],
  csvSourceCount = 0,
): boolean {
  if (manuals.length > 0) return true;
  if (csvSourceCount > 0) return true;
  return recurringRules.some((r) => r.kind === "despesa_fixa" && r.ativo);
}

export type SetupStep = {
  id: "contas" | "mes" | "nuvem";
  label: string;
  done: boolean;
  href: string;
};

function isGoogleSyncConfigured(): boolean {
  return !!process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID?.trim();
}

export function getSetupSteps(
  dataset: Dataset,
  settings: Settings,
  recurringRules: RecurringRule[],
  accounts: Account[] = [],
  cloudProtected = false,
  manuals: ManualTransaction[] = [],
): SetupStep[] {
  const cardSources = dataset.sources.map((s) => s.fonte);
  const hasContas =
    accounts.length > 0
      ? hasProjectionSetup(accounts, cardSources) && hasCardAccount(accounts)
      : false;

  const steps: SetupStep[] = [
    {
      id: "contas",
      label: "Contas e saldos",
      done: hasContas,
      href: "/config?tab=contas",
    },
    {
      id: "mes",
      label: "Mês lançado",
      done: hasMonthLaunched(
        recurringRules,
        manuals,
        dataset.sources.length,
      ),
      href: "/mes",
    },
  ];

  if (isGoogleSyncConfigured()) {
    steps.push({
      id: "nuvem",
      label: "Backup na nuvem",
      done: cloudProtected,
      href: "/config?tab=sincronizacao",
    });
  }

  return steps;
}

export function isProjectionReady(
  dataset: Dataset,
  settings: Settings,
  accounts: Account[] = [],
): boolean {
  const cardSources = dataset.sources.map((s) => s.fonte);
  if (accounts.length > 0) {
    return hasProjectionSetup(accounts, cardSources);
  }
  if (!settings.balanceAnchor) return false;
  const cardOnly = cardSources.filter(
    (f) => f === "inter" || f === "nubank",
  );
  if (cardOnly.length === 0) return true;
  const configured = new Set(settings.cards.map((c) => c.fonte));
  return cardOnly.every((f) => configured.has(f));
}
