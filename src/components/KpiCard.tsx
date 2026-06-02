import clsx from "clsx";
import { Children } from "react";
import { Num } from "@/components/ui/Num";
import { SectionTitle } from "@/components/ui/SectionTitle";

type Delta = {
  label: string;
  tone?: "up" | "down" | "neutral";
};

type Props = {
  label: string;
  value: string;
  hint?: React.ReactNode;
  info?: React.ReactNode;
  tone?: "default" | "accent" | "warning" | "success" | "danger";
  delta?: Delta;
  compact?: boolean;
};

export function KpiCard({
  label,
  value,
  hint,
  info,
  tone = "default",
  delta,
  compact = false,
}: Props) {
  const valueColor =
    tone === "accent"
      ? "text-accent"
      : tone === "warning"
        ? "text-warning"
        : tone === "success"
          ? "text-success"
          : tone === "danger"
            ? "text-danger"
            : "text-foreground";

  return (
    <div className={clsx(compact ? "py-2" : "")}>
      <div className="flex items-center justify-between gap-2">
        <SectionTitle info={info}>{label}</SectionTitle>
        {delta && (
          <Num
            className={clsx(
              "text-[10px] font-medium",
              delta.tone === "up" && "text-success",
              delta.tone === "down" && "text-danger",
              (!delta.tone || delta.tone === "neutral") && "text-muted",
            )}
          >
            {delta.label}
          </Num>
        )}
      </div>
      <Num
        className={clsx(
          "font-semibold tracking-tight mt-0.5",
          compact ? "text-base" : "text-xl",
          valueColor,
        )}
      >
        {value}
      </Num>
      {hint && (
        <div className="text-[11px] text-muted mt-0.5 leading-snug">{hint}</div>
      )}
    </div>
  );
}

export function KpiStrip({ children }: { children: React.ReactNode }) {
  const items = Children.toArray(children);
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 border border-border rounded-lg bg-surface overflow-hidden">
      {items.map((child, i) => (
        <div
          key={i}
          className="p-3 md:p-4 border-r border-b border-border [&:nth-child(2n)]:border-r-0 md:[&:nth-child(2n)]:border-r md:border-b-0 md:[&:last-child]:border-r-0"
        >
          {child}
        </div>
      ))}
    </div>
  );
}
