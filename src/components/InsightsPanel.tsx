import clsx from "clsx"
import Link from "next/link"
import { ArrowRight } from "lucide-react"
import { Insight } from "@/lib/aggregations"

export function InsightsPanel({
  insights,
  max = 4,
}: Readonly<{ insights: Insight[]; max?: number }>) {
  const items = insights.slice(0, max)
  const hasRitmoMes = insights.some((i) => i.id === "ritmo-mes")

  if (items.length === 0) {
    return (
      <p className="text-sm text-muted py-2">Sem dados suficientes para insights.</p>
    )
  }
  return (
    <div className="space-y-2">
      <div className="rounded-2xl bg-surface ring-1 ring-border/60 shadow-[var(--shadow-card)] overflow-hidden divide-y divide-border/60">
        {items.map((i) => (
          <div key={i.id} className="px-4 py-3 flex gap-3 text-sm">
            <span
              className={clsx(
                "mt-1 inline-flex w-6 h-6 items-center justify-center rounded-full shrink-0",
                i.tone === "warning" && "bg-[var(--warning)]",
                i.tone === "success" && "bg-[var(--success)]",
                (!i.tone || i.tone === "info") && "bg-[var(--info)] text-surface",
              )}
            />
            <div className="min-w-0">
              <p className="font-medium">{i.title}</p>
              <p className="text-xs text-muted mt-0.5">{i.detail}</p>
            </div>
          </div>
        ))}
      </div>
      {hasRitmoMes && (
        <Link
          href="/dashboard?tab=comparar"
          className="inline-flex items-center gap-1.5 rounded-full border border-border bg-surface px-3 py-1.5 text-xs text-muted transition-colors hover:text-foreground hover:bg-surface-2"
        >
          Ver comparação completa
          <ArrowRight size={12} />
        </Link>
      )}
    </div>
  )
}
