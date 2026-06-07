"use client";

import Link from "next/link";
import { useMemo } from "react";
import { useAppStore } from "@/lib/store";
import { isProjectionReady } from "@/lib/setupStatus";
import { projectDailyBalance } from "@/lib/projection";
import { formatBRL, formatDateBR } from "@/lib/format";
import { Panel } from "@/components/ui/Panel";
import { ArrowRight } from "lucide-react";

const linkBtnSm =
  "inline-flex items-center justify-center gap-1.5 font-medium rounded-md border transition-[background,border-color] whitespace-nowrap text-xs px-2 py-1 border-border bg-surface text-foreground hover:bg-surface-2 hover:border-border-strong";

export function NextEventPeek() {
  const { dataset, normalized, recurringRules, settings, accounts } =
    useAppStore();

  const cardSources = useMemo(
    () => dataset.sources.map((s) => s.fonte),
    [dataset.sources],
  );

  const ready = isProjectionReady(dataset, settings, accounts);

  const next = useMemo(() => {
    if (!ready) return null;
    const { series } = projectDailyBalance({
      normalized,
      recurringRules,
      settings,
      accounts,
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
  }, [accounts, ready, normalized, recurringRules, settings]);

  if (!next) return null;

  return (
    <Panel className="px-3 py-2 flex items-center justify-between gap-3 flex-wrap text-sm">
      <div className="min-w-0">
        <span className="text-caption text-muted">Próximo evento · </span>
        <span className="font-medium truncate">{next.description}</span>
        <span className="text-caption text-muted ml-1">
          {formatDateBR(next.date)} ·{" "}
          <span
            className={
              next.amount >= 0
                ? "text-success"
                : "text-danger"
            }
          >
            {formatBRL(next.amount)}
          </span>
        </span>
      </div>
      <Link href="/saldo" className={`${linkBtnSm} shrink-0`}>
        Ver Saldo
        <ArrowRight size={13} />
      </Link>
    </Panel>
  );
}
