import { Badge, BadgeVariant } from "@/components/ui/Badge";
import { Natureza } from "@/lib/types";

const naturezaVariant: Record<Natureza, BadgeVariant> = {
  Gasto: "gasto",
  "Pagamento de fatura": "pay",
  "Estorno / crédito": "est",
  "Despesa fixa": "fixa",
  Receita: "receita",
};

export function NatureBadge({ natureza }: { natureza: Natureza }) {
  return (
    <Badge variant={naturezaVariant[natureza]} dot>
      {natureza}
    </Badge>
  );
}
