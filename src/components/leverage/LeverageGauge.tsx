"use client";

import { useMemo, useState } from "react";
import clsx from "clsx";
import { formatBRL } from "@/lib/format";
import {
  LEVERAGE_THRESHOLD_CRITICAL,
  LEVERAGE_THRESHOLD_HEALTHY,
  LEVERAGE_THRESHOLD_WARNING,
  leverageMessage,
  LeverageRatio,
} from "@/lib/leverage";

type Props = {
  ratio: LeverageRatio;
  className?: string;
};

const bandAccent: Record<LeverageRatio["band"], string> = {
  saudavel: "text-success",
  atenta: "text-warning",
  alta: "text-[var(--system-orange)]",
  critica: "text-danger",
};

export function LeverageGauge({ ratio, className }: Readonly<Props>) {
  const [showBreakdown, setShowBreakdown] = useState(false);
  const message = useMemo(() => leverageMessage(ratio), [ratio]);
  const fillPercent = Math.min(
    Number.isFinite(ratio.ratioPercent) ? ratio.ratioPercent : 100,
    100,
  );

  if (ratio.rendaMensal <= 0 && ratio.custoFixoMensal <= 0) {
    return (
      <div
        className={clsx(
          "rounded-lg border border-border bg-surface-2 p-4 text-sm text-muted",
          className,
        )}
      >
        Cadastre sua renda e custos fixos para ver quanto da renda está
        comprometida.
      </div>
    );
  }

  return (
    <div
      className={clsx(
        "rounded-lg border border-border bg-surface-2 p-4 space-y-3",
        className,
      )}
    >
      <div>
        <p className="text-xs text-muted uppercase tracking-wider">
          Divisor de Águas
        </p>
        <p className="text-sm mt-1">
          Custos fixos comprometem{" "}
          <strong className={bandAccent[ratio.band]}>
            {Number.isFinite(ratio.ratioPercent)
              ? `${ratio.ratioPercent}%`
              : "100%+"}
          </strong>{" "}
          da sua renda
        </p>
        <p className="text-xs text-muted mt-0.5">
          {formatBRL(ratio.custoFixoMensal)} fixo · {formatBRL(ratio.rendaMensal)}{" "}
          renda
        </p>
      </div>

      <div className="relative">
        <div
          className="relative h-3 rounded-full overflow-hidden bg-surface ring-1 ring-border/60"
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={fillPercent}
          aria-label={`Custos fixos em ${fillPercent}% da renda`}
        >
          <div
            className="absolute inset-y-0 left-0 bg-gradient-to-r from-[var(--system-green)] via-[var(--system-yellow)] to-[var(--system-red)] opacity-30"
            aria-hidden
          />
          <div
            className={clsx(
              "absolute inset-y-0 left-0 rounded-full transition-all duration-300",
              ratio.band === "saudavel" && "bg-[var(--system-green)]",
              ratio.band === "atenta" && "bg-[var(--system-yellow)]",
              ratio.band === "alta" && "bg-[var(--system-orange)]",
              ratio.band === "critica" && "bg-[var(--system-red)]",
            )}
            style={{ width: `${fillPercent}%` }}
          />
          <div
            className="absolute top-0 bottom-0 w-px bg-border-strong"
            style={{ left: `${LEVERAGE_THRESHOLD_WARNING * 100}%` }}
            aria-hidden
          />
        </div>
        <div className="mt-1 flex justify-between text-[10px] text-muted">
          <span>0%</span>
          <span>{Math.round(LEVERAGE_THRESHOLD_HEALTHY * 100)}%</span>
          <span>{Math.round(LEVERAGE_THRESHOLD_WARNING * 100)}%</span>
          <span>{Math.round(LEVERAGE_THRESHOLD_CRITICAL * 100)}%</span>
        </div>
      </div>

      {message && (
        <div
          className={clsx(
            "rounded-md border px-3 py-2 text-xs",
            message.tone === "critical" &&
              "border-[var(--danger)]/40 bg-[color-mix(in_oklab,var(--system-red)_8%,transparent)] text-danger",
            message.tone === "warning" &&
              "border-[var(--warning)]/40 bg-[color-mix(in_oklab,var(--system-orange)_8%,transparent)] text-[var(--system-orange)]",
            message.tone === "info" &&
              "border-border bg-surface text-muted",
          )}
        >
          <p className="font-medium text-foreground">{message.title}</p>
          <p className="mt-0.5">{message.detail}</p>
        </div>
      )}

      {ratio.breakdown.length > 0 && (
        <div>
          <button
            type="button"
            className="text-xs text-muted hover:text-foreground"
            onClick={() => setShowBreakdown((v) => !v)}
          >
            {showBreakdown ? "Ocultar detalhe" : "Ver detalhe das fontes"}
          </button>
          {showBreakdown && (
            <ul className="mt-2 space-y-1 text-xs text-muted">
              {ratio.breakdown.map((line) => (
                <li
                  key={`${line.origem}-${line.categoria}-${line.descricao}`}
                  className="flex items-center justify-between gap-2"
                >
                  <span className="truncate">
                    {line.descricao}{" "}
                    <span className="text-[10px] uppercase">
                      ({line.origem === "regra" ? "regra" : "CSV"})
                    </span>
                  </span>
                  <span className="shrink-0 tabular-nums">
                    {formatBRL(line.valorMensal)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
