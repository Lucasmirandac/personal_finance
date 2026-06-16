import { accountsToBalanceAnchor, hasProjectionSetup } from "./accounts";
import { Account, Dataset, RecurringRule, Settings } from "./types";

export function hasCashAccount(accounts: Account[]): boolean {
  return accountsToBalanceAnchor(accounts) != null;
}

export function hasIncome(recurringRules: RecurringRule[]): boolean {
  return recurringRules.some((r) => r.kind === "receita" && r.ativo);
}

export type SetupStep = {
  id: "csv" | "contas" | "recorrentes" | "nuvem";
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
): SetupStep[] {
  const cardSources = dataset.sources.map((s) => s.fonte);
  const hasCsv = dataset.sources.length > 0;
  const hasContas =
    accounts.length > 0
      ? hasProjectionSetup(accounts, cardSources)
      : false;
  const hasRecorrentes = recurringRules.some((r) => r.ativo);

  const steps: SetupStep[] = [
    {
      id: "csv",
      label: "CSV importado",
      done: hasCsv,
      href: "/config?tab=importar",
    },
    {
      id: "contas",
      label: "Contas e saldos",
      done: hasContas,
      href: "/config?tab=contas",
    },
    {
      id: "recorrentes",
      label: "Divisor de Águas",
      done: hasRecorrentes,
      href: "/divisor",
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
