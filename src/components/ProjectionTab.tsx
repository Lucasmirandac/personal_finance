"use client";

import { useMemo, useState } from "react";
import clsx from "clsx";
import { useAppStore } from "@/lib/store";
import { SettingsPanel } from "@/components/SettingsPanel";
import { ChartCard } from "@/components/charts/ChartCard";
import { BalanceProjectionChart } from "@/components/charts/BalanceProjectionChart";
import { KpiCard, KpiStrip } from "@/components/KpiCard";
import {
  isSettingsComplete,
  projectDailyBalance,
  CashEvent,
} from "@/lib/projection";
import { formatBRL, formatDateBR } from "@/lib/format";
import { Fonte } from "@/lib/types";
import {
  CalendarRange,
  CreditCard,
  Repeat,
  Settings as SettingsIcon,
  TrendingUp,
} from "lucide-react";

const EVENT_LABELS: Record<CashEvent["type"], string> = {
  fatura: "Fatura",
  fixa: "Fixa",
  receita: "Receita",
  ancora: "Âncora",
};

function EventIcon({ type }: { type: CashEvent["type"] }) {
  const size = 12;
  if (type === "fatura") return <CreditCard size={size} />;
  if (type === "receita") return <TrendingUp size={size} />;
  if (type === "fixa") return <Repeat size={size} />;
  return <CalendarRange size={size} />;
}

function eventBadgeClass(type: CashEvent["type"]): string {
  switch (type) {
    case "fatura":
      return "badge badge-pay";
    case "receita":
      return "badge badge-receita";
    case "fixa":
      return "badge badge-fixa";
    default:
      return "badge badge-gasto";
  }
}

export function ProjectionTab() {
  const { dataset, normalized, recurringRules, settings, accounts, updateSettings } =
    useAppStore();
  const [editing, setEditing] = useState(false);

  const cardSources = useMemo(() => {
    const set = new Set<Fonte>();
    for (const s of dataset.sources) set.add(s.fonte);
    return [...set];
  }, [dataset.sources]);

  const complete = isSettingsComplete(settings, cardSources, accounts);

  const { series, summary } = useMemo(
    () =>
      projectDailyBalance({
        normalized,
        recurringRules,
        settings,
        accounts,
      }),
    [normalized, recurringRules, settings, accounts],
  );

  const upcoming = useMemo(() => {
    const today = new Date().toISOString().slice(0, 10);
    const events: CashEvent[] = [];
    for (const p of series) {
      if (p.date >= today) events.push(...p.events);
    }
    return events
      .sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0))
      .slice(0, 10);
  }, [series]);

  if (!complete || editing) {
    return (
      <div className="space-y-3">
        {!complete && (
          <p className="text-sm subtle">
            Configure o saldo inicial e os dias de fechamento/pagamento de cada
            cartão para ver a projeção.
          </p>
        )}
        <SettingsPanel
          settings={settings}
          cardSources={cardSources}
          onSave={async (next) => {
            await updateSettings(next);
            setEditing(false);
          }}
          onCancel={complete ? () => setEditing(false) : undefined}
        />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs subtle">
          Âncora {formatDateBR(settings.balanceAnchor!.data)} ·{" "}
          {settings.projectionHorizonDays} dias à frente
        </p>
        <button
          type="button"
          className="btn btn-sm"
          onClick={() => setEditing(true)}
        >
          <SettingsIcon size={13} />
          Configurar
        </button>
      </div>

      {summary && (
        <KpiStrip>
          <KpiCard
            label="Saldo inicial"
            value={formatBRL(summary.saldoInicial)}
            hint={formatDateBR(settings.balanceAnchor!.data)}
          />
          <KpiCard
            label="Saldo final projetado"
            value={formatBRL(summary.saldoFinal)}
            tone={summary.saldoFinal >= 0 ? "success" : "warning"}
          />
          <KpiCard
            label="Menor saldo"
            value={formatBRL(summary.menorSaldo)}
            hint={
              summary.menorSaldoData
                ? formatDateBR(summary.menorSaldoData)
                : undefined
            }
            tone={summary.menorSaldo >= 0 ? "default" : "danger"}
          />
          <KpiCard
            label="Próxima fatura"
            value={
              summary.proximaFatura
                ? formatBRL(Math.abs(summary.proximaFatura.amount))
                : "—"
            }
            hint={
              summary.proximaFatura
                ? `${summary.proximaFatura.description} · ${formatDateBR(summary.proximaFatura.date)}`
                : "Nenhuma no horizonte"
            }
          />
        </KpiStrip>
      )}

      {series.length > 0 ? (
        <ChartCard
          title="Saldo projetado por dia"
          subtitle="Compras de cartão no dia de pagamento da fatura"
        >
          <BalanceProjectionChart data={series} />
        </ChartCard>
      ) : (
        <p className="text-sm subtle">
          Nenhum dia no horizonte. Ajuste a data âncora ou o horizonte.
        </p>
      )}

      {upcoming.length > 0 && (
        <div>
          <div className="section-title mb-2">Próximos eventos</div>
          <div className="panel divide-y">
            {upcoming.map((e, i) => (
              <div
                key={`${e.date}-${e.type}-${i}`}
                className="flex items-center justify-between gap-3 px-3 py-2 text-sm"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <span className={clsx(eventBadgeClass(e.type), "gap-1")}>
                    <EventIcon type={e.type} />
                    {EVENT_LABELS[e.type]}
                  </span>
                  <span className="truncate">{e.description}</span>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <span className="text-[11px] subtle">
                    {formatDateBR(e.date)}
                  </span>
                  <span
                    className={clsx(
                      "num font-medium",
                      e.amount >= 0 ? "text-[var(--success)]" : "text-[var(--danger)]",
                    )}
                  >
                    {formatBRL(e.amount)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
