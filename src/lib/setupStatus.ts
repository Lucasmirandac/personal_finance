import { hasProjectionSetup } from "./accounts";
import { Account, Dataset, RecurringRule, Settings } from "./types";

export type SetupStep = {
  id: "csv" | "contas" | "recorrentes";
  label: string;
  done: boolean;
  href: string;
};

export function getSetupSteps(
  dataset: Dataset,
  settings: Settings,
  recurringRules: RecurringRule[],
  accounts: Account[] = [],
): SetupStep[] {
  const cardSources = dataset.sources.map((s) => s.fonte);
  const hasCsv = dataset.sources.length > 0;
  const hasContas =
    accounts.length > 0
      ? hasProjectionSetup(accounts, cardSources)
      : false;
  const hasRecorrentes = recurringRules.some((r) => r.ativo);

  return [
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
