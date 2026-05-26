"use client";

import Link from "next/link";
import { useMemo } from "react";
import { useAppStore } from "@/lib/store";
import { isProjectionReady } from "@/lib/setupStatus";
import { projectDailyBalance } from "@/lib/projection";
import { formatBRL, formatDateBR } from "@/lib/format";
import { ArrowRight } from "lucide-react";

export function NextEventPeek() {
  const { dataset, normalized, recurringRules, settings } = useAppStore();

  const cardSources = useMemo(
    () => dataset.sources.map((s) => s.fonte),
    [dataset.sources],
  );

  const ready = isProjectionReady(dataset, settings);

  const next = useMemo(() => {
    if (!ready) return null;
    const { series } = projectDailyBalance({
      normalized,
      recurringRules,
      settings,
    });
    const today = new Date().toISOString().slice(0, 10);
    for (const p of series) {
      if (p.date < today) continue;
      for (const e of p.events) {
        if (e.type === "ancora") continue;
        return { ...e, balanceAfter: p.balance };
      }
    }
    return null;
  }, [ready, normalized, recurringRules, settings]);

  if (!next) return null;

  return (
    <div className="panel px-3 py-2 flex items-center justify-between gap-3 flex-wrap text-sm">
      <div className="min-w-0">
        <span className="text-[11px] subtle">Próximo evento · </span>
        <span className="font-medium truncate">{next.description}</span>
        <span className="text-[11px] subtle ml-1">
          {formatDateBR(next.date)} ·{" "}
          <span
            className={
              next.amount >= 0
                ? "text-[var(--success)]"
                : "text-[var(--danger)]"
            }
          >
            {formatBRL(next.amount)}
          </span>
        </span>
      </div>
      <Link href="/saldo" className="btn btn-sm shrink-0">
        Ver Saldo
        <ArrowRight size={13} />
      </Link>
    </div>
  );
}
