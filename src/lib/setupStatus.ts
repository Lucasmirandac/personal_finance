import { isSettingsComplete } from "./projection";
import { Dataset, RecurringRule, Settings } from "./types";

export type SetupStep = {
  id: "csv" | "cartoes" | "recorrentes";
  label: string;
  done: boolean;
  href: string;
};

export function getSetupSteps(
  dataset: Dataset,
  settings: Settings,
  recurringRules: RecurringRule[],
): SetupStep[] {
  const cardSources = dataset.sources.map((s) => s.fonte);
  const hasCsv = dataset.sources.length > 0;
  const hasCartoes = isSettingsComplete(settings, cardSources);
  const hasRecorrentes = recurringRules.some((r) => r.ativo);

  return [
    {
      id: "csv",
      label: "CSV importado",
      done: hasCsv,
      href: "/config?tab=importar",
    },
    {
      id: "cartoes",
      label: "Cartões e saldo",
      done: hasCartoes,
      href: "/config?tab=cartoes",
    },
    {
      id: "recorrentes",
      label: "Recorrentes",
      done: hasRecorrentes,
      href: "/recorrentes",
    },
  ];
}

export function isProjectionReady(
  dataset: Dataset,
  settings: Settings,
): boolean {
  const cardSources = dataset.sources.map((s) => s.fonte);
  return isSettingsComplete(settings, cardSources);
}
