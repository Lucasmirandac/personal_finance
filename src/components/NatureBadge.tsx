import clsx from "clsx";
import { Natureza } from "@/lib/types";

export function naturezaBadgeClass(natureza: Natureza): string {
  switch (natureza) {
    case "Pagamento de fatura":
      return "badge badge-dot badge-pay";
    case "Estorno / crédito":
      return "badge badge-dot badge-est";
    case "Despesa fixa":
      return "badge badge-dot badge-fixa";
    case "Receita":
      return "badge badge-dot badge-receita";
    default:
      return "badge badge-dot badge-gasto";
  }
}

export function NatureBadge({ natureza }: { natureza: Natureza }) {
  return (
    <span className={clsx(naturezaBadgeClass(natureza))}>{natureza}</span>
  );
}
