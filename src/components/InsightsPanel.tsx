import clsx from "clsx";
import { Insight } from "@/lib/aggregations";

export function InsightsPanel({ insights, max = 4 }: { insights: Insight[]; max?: number }) {
  const items = insights.slice(0, max);
  if (items.length === 0) {
    return (
      <p className="text-sm subtle py-2">Sem dados suficientes para insights.</p>
    );
  }
  return (
    <div className="panel divide-y">
      {items.map((i) => (
        <div key={i.id} className="px-3 py-2 flex gap-3 text-sm">
          <span
            className={clsx(
              "mt-1.5 w-1.5 h-1.5 rounded-full shrink-0",
              i.tone === "warning" && "bg-[var(--warning)]",
              i.tone === "success" && "bg-[var(--success)]",
              (!i.tone || i.tone === "info") && "bg-[var(--accent)]",
            )}
          />
          <div className="min-w-0">
            <span className="font-medium">{i.title}</span>
            <span className="subtle"> — {i.detail}</span>
          </div>
        </div>
      ))}
    </div>
  );
}
