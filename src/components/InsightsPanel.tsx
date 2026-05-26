import clsx from "clsx";
import { Insight } from "@/lib/aggregations";

export function InsightsPanel({ insights }: { insights: Insight[] }) {
  if (insights.length === 0) {
    return (
      <div className="card p-6 text-sm subtle">
        Sem dados suficientes para gerar insights.
      </div>
    );
  }
  return (
    <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
      {insights.map((i) => (
        <div
          key={i.id}
          className={clsx(
            "card p-4 border-l-4",
            i.tone === "warning" && "border-l-[var(--warning)]",
            i.tone === "success" && "border-l-[var(--success)]",
            i.tone === "info" && "border-l-[var(--accent)]",
          )}
        >
          <div className="font-medium">{i.title}</div>
          <div className="text-sm subtle mt-1">{i.detail}</div>
        </div>
      ))}
    </div>
  );
}
