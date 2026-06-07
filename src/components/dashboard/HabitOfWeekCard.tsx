"use client";

import clsx from "clsx";
import { Coins, Flame, TrendingUp, type LucideIcon } from "lucide-react";
import type { HabitNarrative, HabitNarrativeId } from "@/lib/aggregations";

const NARRATIVE_ICONS: Record<HabitNarrativeId, LucideIcon> = {
  "peak-day": TrendingUp,
  "top-cat-dominance": Flame,
  "small-tx-30d": Coins,
  "weekday-avg-gap": TrendingUp,
  "weekday-volatility": Flame,
};

type Props = Readonly<{
  narratives: HabitNarrative[];
  max?: number;
}>;

export function HabitOfWeekCard({ narratives, max = 3 }: Props) {
  const items = narratives.slice(0, max);

  return (
    <div className="rounded-2xl bg-surface ring-1 ring-border/60 shadow-[var(--shadow-card)] overflow-hidden">
      <div className="px-4 pt-4 pb-2">
        <p className="text-caption uppercase tracking-wider text-muted">
          Hábito da semana
        </p>
      </div>
      {items.length === 0 ? (
        <p className="px-4 pb-4 text-sm text-muted">
          Mais dados ajudam a destacar seus hábitos.
        </p>
      ) : (
        <ul className="divide-y divide-border/60">
          {items.map((n) => {
            const Icon = NARRATIVE_ICONS[n.id] ?? TrendingUp;
            return (
              <li key={n.id} className="px-4 py-3 flex gap-3">
                <span
                  className={clsx(
                    "mt-0.5 inline-flex w-8 h-8 items-center justify-center rounded-full shrink-0",
                    "bg-[var(--info)] text-surface",
                  )}
                >
                  <Icon size={14} strokeWidth={2.25} />
                </span>
                <p className="text-sm leading-snug text-foreground min-w-0">
                  {n.text}
                </p>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
