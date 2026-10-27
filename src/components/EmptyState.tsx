import Link from "next/link";
import { Card } from "@/components/ui/Panel";

const linkBtnBase =
  "inline-flex items-center justify-center gap-1.5 font-medium rounded-md border transition-[background,border-color] whitespace-nowrap text-ui px-3 py-1.5";
const linkBtnDefault = `${linkBtnBase} border-border bg-surface text-foreground hover:bg-surface-2 hover:border-border-strong`;
const linkBtnPrimary = `${linkBtnBase} border-foreground bg-foreground text-surface hover:opacity-90`;

export function EmptyState({
  title = "Nenhum dado para analisar",
  description = "Cadastre contas e lance o mês — ou cole a planilha, se tiver.",
  secondaryHref = "/mes",
  secondaryLabel = "Lançar o mês",
}: {
  title?: string;
  description?: string;
  secondaryHref?: string | null;
  secondaryLabel?: string;
}) {
  return (
    <Card className="p-10 text-center max-w-xl mx-auto">
      <h2 className="text-lg font-semibold">{title}</h2>
      <p className="text-muted mt-1">{description}</p>
      <div className="flex flex-wrap gap-2 justify-center mt-4">
        <Link href="/comecar" className={`${linkBtnPrimary} min-h-11`}>
          Começar
        </Link>
        {secondaryHref ? (
          <Link href={secondaryHref} className={linkBtnDefault}>
            {secondaryLabel}
          </Link>
        ) : null}
      </div>
    </Card>
  );
}
