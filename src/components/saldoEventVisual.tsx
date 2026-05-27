import {
  CalendarRange,
  CreditCard,
  Repeat,
  TrendingUp,
} from "lucide-react";
import { BadgeVariant } from "@/components/ui/Badge";
import { CashEvent } from "@/lib/projection";

export const EVENT_LABELS: Record<CashEvent["type"], string> = {
  fatura: "Fatura",
  fixa: "Fixa",
  receita: "Receita",
  ancora: "Âncora",
};

export type EventFilter = "all" | CashEvent["type"];

export const EVENT_FILTER_OPTIONS: readonly [EventFilter, string][] = [
  ["all", "Todos"],
  ["fatura", "Fatura"],
  ["fixa", "Fixa"],
  ["receita", "Receita"],
] as const;

const eventBadgeVariant: Record<CashEvent["type"], BadgeVariant> = {
  fatura: "pay",
  fixa: "fixa",
  receita: "receita",
  ancora: "gasto",
};

export function eventBadgeVariantFor(type: CashEvent["type"]): BadgeVariant {
  return eventBadgeVariant[type];
}

const legendDotClasses: Record<CashEvent["type"], string> = {
  fatura: "inline-block w-1.5 h-1.5 rounded-full shrink-0 bg-warning",
  fixa: "inline-block w-1.5 h-1.5 rounded-full shrink-0 bg-warning",
  receita: "inline-block w-1.5 h-1.5 rounded-full shrink-0 bg-success",
  ancora: "inline-block w-1.5 h-1.5 rounded-full shrink-0 bg-muted",
};

export function eventLegendDotClass(type: CashEvent["type"]): string {
  return legendDotClasses[type];
}

export function EventIcon({ type }: { type: CashEvent["type"] }) {
  const size = 12;
  if (type === "fatura") return <CreditCard size={size} />;
  if (type === "receita") return <TrendingUp size={size} />;
  if (type === "fixa") return <Repeat size={size} />;
  return <CalendarRange size={size} />;
}
