import clsx from "clsx";
import Link from "next/link";
import { Insight } from "@/lib/aggregations";
import { Panel } from "@/components/ui/Panel";

export function InsightsPanel({ insights, max = 4 }: { insights: Insight[]; max?: number }) {
  const items = insights.slice(0, max);
  const hasRitmoMes = insights.some((i) => i.id === "ritmo-mes");

  if (items.length === 0) {
    return (
      <p className="text-sm text-muted py-2">Sem dados suficientes para insights.</p>
    );
  }
  return (
    <div className="space-y-2">
      <Panel className="divide-y">
        {items.map((i) => (
          <div key={i.id} className="px-3 py-2 flex gap-3 text-sm">
            <span
              className={clsx(
                "mt-1.5 w-1.5 h-1.5 rounded-full shrink-0",
                i.tone === "warning" && "bg-[var(--warning)]",
                i.tone === "success" && "bg-[var(--success)]",
                (!i.tone || i.tone === "info") && "bg-[var(--info)]",
              )}
            />
            <div className="min-w-0">
              <span className="font-medium">{i.title}</span>
              <span className="text-muted"> — {i.detail}</span>
            </div>
          </div>
        ))}
      </Panel>
      {hasRitmoMes && (
        <Link
          href="/dashboard?tab=comparar"
          className="text-xs text-[var(--accent-strong)] hover:underline inline-flex"
        >
          Ver comparação completa →
        </Link>
      )}
    </div>
  );
}
