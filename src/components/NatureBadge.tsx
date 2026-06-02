import { Badge, BadgeVariant } from "@/components/ui/Badge";
import { g, type GlossaryKey } from "@/lib/glossary";
import { Natureza } from "@/lib/types";

const naturezaVariant: Record<Natureza, BadgeVariant> = {
  Gasto: "gasto",
  "Pagamento de fatura": "pay",
  "Estorno / crédito": "est",
  "Despesa fixa": "fixa",
  Receita: "receita",
};

const naturezaInfo: Record<Natureza, GlossaryKey> = {
  Gasto: "gasto",
  "Pagamento de fatura": "pagamentoFatura",
  "Estorno / crédito": "estorno",
  "Despesa fixa": "despesaFixa",
  Receita: "receita",
};

export function NatureBadge({ natureza }: { natureza: Natureza }) {
  return (
    <Badge variant={naturezaVariant[natureza]} dot info={g(naturezaInfo[natureza])}>
      {natureza}
    </Badge>
  );
}
