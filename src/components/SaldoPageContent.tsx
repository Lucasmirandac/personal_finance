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
import { SaldoCalendarView } from "@/components/SaldoCalendarView";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Num } from "@/components/ui/Num";
import { Panel } from "@/components/ui/Panel";
import { SectionTitle } from "@/components/ui/SectionTitle";
import { TabList, TabTrigger } from "@/components/ui/TabList";
import {
  isSettingsComplete,
  projectDailyBalance,
  CashEvent,
} from "@/lib/projection";
import { accountsToBalanceAnchor } from "@/lib/accounts";
import { formatBRL, formatDateBR } from "@/lib/format";
import { Fonte, SaldoView } from "@/lib/types";
import {
  EVENT_FILTER_OPTIONS,
  EventFilter,
  EventIcon,
  EVENT_LABELS,
  eventBadgeVariantFor,
} from "@/components/saldoEventVisual";
import {
  Plus,
  Settings as SettingsIcon,
  SlidersHorizontal,
} from "lucide-react";

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
  const activeView: SaldoView = settings.saldoView ?? "overview";

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

  async function setActiveView(view: SaldoView) {
    if (view === activeView) return;
    await updateSettings({ ...settings, saldoView: view });
  }

  if (!complete || editing) {
    return (
      <div className="space-y-4">
        <div>
          <h1 className="text-lg font-semibold tracking-tight">Saldo</h1>
          <p className="text-muted text-xs mt-0.5">
            Crie suas contas e saldos atuais para projetar seu fluxo de caixa.
          </p>
        </div>
        {!complete && (
          <p className="text-sm text-muted">
            Cadastre pelo menos uma conta com saldo inicial. Cartões do CSV
            precisam de fechamento e pagamento configurados.
          </p>
        )}
        <AccountsPanel
          onClose={complete ? () => setEditing(false) : undefined}
        />
      </div>
    );
  }

  const horizonEnd =
    summary && series.length > 0
      ? series[series.length - 1]?.date
      : null;

  if (!anchor) {
    return (
      <div className="space-y-4">
        <div>
          <h1 className="text-lg font-semibold tracking-tight">Saldo</h1>
          <p className="text-muted text-xs mt-0.5">
            Configure a âncora de saldo para ver a projeção.
          </p>
        </div>
        <AccountsPanel />
      </div>
    );
  }

  const anchorDate = anchor.data;

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-lg font-semibold tracking-tight">Saldo</h1>
          <p className="text-muted text-xs mt-0.5">
            Projeção · âncora {formatDateBR(anchorDate)} ·{" "}
            {settings.projectionHorizonDays} dias
          </p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Link
            href="/recorrentes"
            className="inline-flex items-center justify-center gap-1.5 font-medium rounded-md border whitespace-nowrap border-border bg-surface text-foreground hover:bg-surface-2 hover:border-border-strong text-xs px-2 py-1"
          >
            <Plus size={13} />
            Recorrente
          </Link>
          <Button size="sm" onClick={() => setAdjustOpen(true)}>
            <SlidersHorizontal size={13} />
            Ajustar saldo
          </Button>
          <Button size="sm" onClick={() => setEditing(true)}>
            <SettingsIcon size={13} />
            Configurar
          </Button>
        </div>
      </div>

      <AdjustBalanceModal open={adjustOpen} onClose={() => setAdjustOpen(false)} />

      {summary && (
        <Panel className="p-4 border-accent/25 bg-[color-mix(in_oklab,var(--accent)_6%,transparent)]">
          <div className="text-xs text-muted uppercase tracking-wide">
            Saldo projetado
            {horizonEnd ? ` em ${formatDateBR(horizonEnd)}` : ""}
          </div>
          <Num
            className={clsx(
              "text-3xl sm:text-4xl font-semibold mt-1 block",
              summary.saldoFinal >= 0 ? "text-success" : "text-danger",
            )}
          >
            {formatBRL(summary.saldoFinal)}
          </Num>
          {summary.menorSaldo < 0 && (
            <p className="text-xs text-danger mt-2">
              Atenção: menor saldo de {formatBRL(summary.menorSaldo)}
              {summary.menorSaldoData
                ? ` em ${formatDateBR(summary.menorSaldoData)}`
                : ""}
            </p>
          )}
        </Panel>
      )}

      {summary && (
        <KpiStrip>
          <KpiCard
            label="Saldo inicial"
            value={formatBRL(summary.saldoInicial)}
            hint={formatDateBR(anchorDate)}
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

      <TabList>
        <TabTrigger
          active={activeView === "overview"}
          onClick={() => setActiveView("overview")}
        >
          Visão geral
        </TabTrigger>
        <TabTrigger
          active={activeView === "calendar"}
          onClick={() => setActiveView("calendar")}
        >
          Calendário
        </TabTrigger>
      </TabList>

      <div className="flex flex-wrap gap-1">
        {EVENT_FILTER_OPTIONS.map(([id, label]) => (
          <Button
            key={id}
            size="sm"
            variant={eventFilter === id ? "primary" : "default"}
            onClick={() => setEventFilter(id)}
          >
            {label}
          </Button>
        ))}
      </div>

      {activeView === "overview" ? (
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
              <Panel className="p-4">
                <p className="text-sm text-muted">
                  Nenhum dia no horizonte. Ajuste a data âncora ou o horizonte.
                </p>
              </Panel>
            )}
          </div>

          <div className="lg:col-span-2 space-y-2">
            <SectionTitle>Próximos eventos</SectionTitle>
            {filteredUpcoming.length > 0 ? (
              <Panel className="divide-y divide-border max-h-[420px] overflow-auto">
                {filteredUpcoming.map((e, i) => (
                  <div
                    key={`${e.date}-${e.type}-${i}`}
                    className="flex items-center justify-between gap-2 px-3 py-2 text-sm"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <Badge
                        variant={eventBadgeVariantFor(e.type)}
                        className="shrink-0"
                      >
                        <EventIcon type={e.type} />
                        {EVENT_LABELS[e.type]}
                      </Badge>
                      <span className="truncate text-xs">{e.description}</span>
                    </div>
                    <div className="flex flex-col items-end shrink-0">
                      <span className="text-[10px] text-muted">
                        {formatDateBR(e.date)}
                      </span>
                      <Num
                        className={clsx(
                          "text-xs font-medium",
                          e.amount >= 0 ? "text-success" : "text-danger",
                        )}
                      >
                        {formatBRL(e.amount)}
                      </Num>
                    </div>
                  </div>
                ))}
              </Panel>
            ) : (
              <Panel className="p-3">
                <p className="text-xs text-muted">Nenhum evento no filtro.</p>
              </Panel>
            )}
          </div>
        </div>
      ) : horizonEnd ? (
        <SaldoCalendarView
          series={series}
          anchorISO={anchorDate}
          horizonEndISO={horizonEnd}
          filter={eventFilter}
        />
      ) : (
        <Panel className="p-4">
          <p className="text-sm text-muted">
            Nenhum dia no horizonte. Ajuste a data âncora ou o horizonte.
          </p>
        </Panel>
      )}
    </div>
  );
}
