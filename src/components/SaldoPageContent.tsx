"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import clsx from "clsx";
import { useAppStore } from "@/lib/store";
import { AccountsPanel } from "@/components/AccountsPanel";
import { AdjustBalanceModal } from "@/components/AdjustBalanceModal";
import { ChartCard } from "@/components/charts/ChartCard";
import { BalanceProjectionChart } from "@/components/charts/BalanceProjectionChart";
import { KpiCard, KpiStrip } from "@/components/KpiCard";
import {
  isSettingsComplete,
  projectDailyBalance,
  CashEvent,
} from "@/lib/projection";
import { accountsToBalanceAnchor } from "@/lib/accounts";
import { formatBRL, formatDateBR } from "@/lib/format";
import { Fonte } from "@/lib/types";
import {
  CalendarRange,
  CreditCard,
  Plus,
  Repeat,
  Settings as SettingsIcon,
  SlidersHorizontal,
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

type EventFilter = "all" | CashEvent["type"];

export function SaldoPageContent() {
  const {
    dataset,
    normalized,
    recurringRules,
    settings,
    accounts,
    updateSettings,
  } = useAppStore();
  const [editing, setEditing] = useState(false);
  const [adjustOpen, setAdjustOpen] = useState(false);
  const [eventFilter, setEventFilter] = useState<EventFilter>("all");

  const cardSources = useMemo(() => {
    const set = new Set<Fonte>();
    for (const s of dataset.sources) set.add(s.fonte);
    return [...set];
  }, [dataset.sources]);

  const complete = isSettingsComplete(settings, cardSources, accounts);
  const anchor = accountsToBalanceAnchor(accounts) ?? settings.balanceAnchor;

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
    return events.sort((a, b) =>
      a.date < b.date ? -1 : a.date > b.date ? 1 : 0,
    );
  }, [series]);

  const filteredUpcoming = useMemo(() => {
    const list =
      eventFilter === "all"
        ? upcoming
        : upcoming.filter((e) => e.type === eventFilter);
    return list.slice(0, 15);
  }, [upcoming, eventFilter]);

  if (!complete || editing) {
    return (
      <div className="space-y-4">
        <div>
          <h1 className="text-lg font-semibold tracking-tight">Saldo</h1>
          <p className="subtle text-xs mt-0.5">
            Crie suas contas e saldos atuais para projetar seu fluxo de caixa.
          </p>
        </div>
        {!complete && (
          <p className="text-sm subtle">
            Cadastre pelo menos uma conta com saldo inicial. Cartões do CSV
            precisam de fechamento e pagamento configurados.
          </p>
        )}
        <AccountsPanel
          settings={settings}
          onSaveSettings={async (next) => {
            await updateSettings(next);
            setEditing(false);
          }}
        />
      </div>
    );
  }

  const horizonEnd =
    summary && series.length > 0
      ? series[series.length - 1]?.date
      : null;

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-lg font-semibold tracking-tight">Saldo</h1>
          <p className="subtle text-xs mt-0.5">
            Projeção · âncora {formatDateBR(anchor!.data)} ·{" "}
            {settings.projectionHorizonDays} dias
          </p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Link href="/recorrentes" className="btn btn-sm">
            <Plus size={13} />
            Recorrente
          </Link>
          <button
            type="button"
            className="btn btn-sm"
            onClick={() => setAdjustOpen(true)}
          >
            <SlidersHorizontal size={13} />
            Ajustar saldo
          </button>
          <button
            type="button"
            className="btn btn-sm"
            onClick={() => setEditing(true)}
          >
            <SettingsIcon size={13} />
            Configurar
          </button>
        </div>
      </div>

      <AdjustBalanceModal open={adjustOpen} onClose={() => setAdjustOpen(false)} />

      {summary && (
        <div className="panel p-4 border-[var(--accent)]/25 bg-[color-mix(in_oklab,var(--accent)_6%,transparent)]">
          <div className="text-xs subtle uppercase tracking-wide">
            Saldo projetado
            {horizonEnd ? ` em ${formatDateBR(horizonEnd)}` : ""}
          </div>
          <div
            className={clsx(
              "num text-3xl sm:text-4xl font-semibold mt-1",
              summary.saldoFinal >= 0
                ? "text-[var(--success)]"
                : "text-[var(--danger)]",
            )}
          >
            {formatBRL(summary.saldoFinal)}
          </div>
          {summary.menorSaldo < 0 && (
            <p className="text-xs text-[var(--danger)] mt-2">
              Atenção: menor saldo de {formatBRL(summary.menorSaldo)}
              {summary.menorSaldoData
                ? ` em ${formatDateBR(summary.menorSaldoData)}`
                : ""}
            </p>
          )}
        </div>
      )}

      {summary && (
        <KpiStrip>
          <KpiCard
            label="Saldo inicial"
            value={formatBRL(summary.saldoInicial)}
            hint={formatDateBR(anchor!.data)}
            compact
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
            compact
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
            compact
          />
          <KpiCard
            label="Horizonte"
            value={`${settings.projectionHorizonDays}d`}
            hint="Dias à frente"
            compact
          />
        </KpiStrip>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
        <div className="lg:col-span-3">
          {series.length > 0 ? (
            <ChartCard
              title="Saldo por dia"
              subtitle="Compras de cartão no dia de pagamento da fatura"
            >
              <BalanceProjectionChart data={series} />
            </ChartCard>
          ) : (
            <p className="text-sm subtle panel p-4">
              Nenhum dia no horizonte. Ajuste a data âncora ou o horizonte.
            </p>
          )}
        </div>

        <div className="lg:col-span-2 space-y-2">
          <div className="flex items-center justify-between gap-2">
            <span className="section-title">Próximos eventos</span>
          </div>
          <div className="flex flex-wrap gap-1">
            {(
              [
                ["all", "Todos"],
                ["fatura", "Fatura"],
                ["fixa", "Fixa"],
                ["receita", "Receita"],
              ] as const
            ).map(([id, label]) => (
              <button
                key={id}
                type="button"
                className={clsx(
                  "btn btn-sm",
                  eventFilter === id && "btn-primary",
                )}
                onClick={() => setEventFilter(id)}
              >
                {label}
              </button>
            ))}
          </div>
          {filteredUpcoming.length > 0 ? (
            <div className="panel divide-y max-h-[420px] overflow-auto">
              {filteredUpcoming.map((e, i) => (
                <div
                  key={`${e.date}-${e.type}-${i}`}
                  className="flex items-center justify-between gap-2 px-3 py-2 text-sm"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <span className={clsx(eventBadgeClass(e.type), "gap-1 shrink-0")}>
                      <EventIcon type={e.type} />
                      {EVENT_LABELS[e.type]}
                    </span>
                    <span className="truncate text-xs">{e.description}</span>
                  </div>
                  <div className="flex flex-col items-end shrink-0">
                    <span className="text-[10px] subtle">
                      {formatDateBR(e.date)}
                    </span>
                    <span
                      className={clsx(
                        "num text-xs font-medium",
                        e.amount >= 0
                          ? "text-[var(--success)]"
                          : "text-[var(--danger)]",
                      )}
                    >
                      {formatBRL(e.amount)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs subtle panel p-3">Nenhum evento no filtro.</p>
          )}
        </div>
      </div>
    </div>
  );
}
