import clsx from "clsx";
import { Children } from "react";

type Delta = {
  label: string;
  tone?: "up" | "down" | "neutral";
};

type Props = {
  label: string;
  value: string;
  hint?: React.ReactNode;
  tone?: "default" | "accent" | "warning" | "success" | "danger";
  delta?: Delta;
  compact?: boolean;
};

export function KpiCard({
  label,
  value,
  hint,
  tone = "default",
  delta,
  compact = false,
}: Props) {
  const valueColor =
    tone === "accent"
      ? "text-[var(--accent)]"
      : tone === "warning"
        ? "text-[var(--warning)]"
        : tone === "success"
          ? "text-[var(--success)]"
          : tone === "danger"
            ? "text-[var(--danger)]"
            : "text-[var(--foreground)]";

  return (
    <div className={clsx(compact ? "py-2" : "")}>
      <div className="flex items-center justify-between gap-2">
        <span className="section-title">{label}</span>
        {delta && (
          <span
            className={clsx(
              "text-[10px] font-medium num",
              delta.tone === "up" && "text-[var(--success)]",
              delta.tone === "down" && "text-[var(--danger)]",
              (!delta.tone || delta.tone === "neutral") && "subtle",
            )}
          >
            {delta.label}
          </span>
        )}
      </div>
      <div
        className={clsx(
          "num font-semibold tracking-tight mt-0.5",
          compact ? "text-base" : "text-xl",
          valueColor,
        )}
      >
        {value}
      </div>
      {hint && <div className="text-[11px] subtle mt-0.5 leading-snug">{hint}</div>}
    </div>
  );
}

export function KpiStrip({ children }: { children: React.ReactNode }) {
  const items = Children.toArray(children);
  return (
    <div className="kpi-strip">
      {items.map((child, i) => (
        <div key={i} className="kpi-cell">
          {child}
        </div>
      ))}
    </div>
  );
}
