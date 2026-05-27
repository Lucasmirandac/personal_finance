import {
  CalendarRange,
  CreditCard,
  Repeat,
  TrendingUp,
} from "lucide-react";
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

export function EventIcon({ type }: { type: CashEvent["type"] }) {
  const size = 12;
  if (type === "fatura") return <CreditCard size={size} />;
  if (type === "receita") return <TrendingUp size={size} />;
  if (type === "fixa") return <Repeat size={size} />;
  return <CalendarRange size={size} />;
}

export function eventBadgeClass(type: CashEvent["type"]): string {
  switch (type) {
    case "fatura":
      return "badge badge-pay";
    case "receita":
      return "badge badge-receita";
    case "fixa":
      return "badge badge-fixa";
    default:
      return "badge badge-gasto";
  }
}

export function eventLegendDotClass(type: CashEvent["type"]): string {
  switch (type) {
    case "fatura":
      return "calendar-legend-dot calendar-legend-dot--fatura";
    case "receita":
      return "calendar-legend-dot calendar-legend-dot--receita";
    case "fixa":
      return "calendar-legend-dot calendar-legend-dot--fixa";
    default:
      return "calendar-legend-dot";
  }
}
