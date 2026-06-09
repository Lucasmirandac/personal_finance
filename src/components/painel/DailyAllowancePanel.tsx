"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import clsx from "clsx";
import { Pencil } from "lucide-react";
import { SavingsGoalForm } from "@/components/savings/SavingsGoalForm";
import { Button } from "@/components/ui/Button";
import { DrawerBackdrop } from "@/components/ui/Drawer";
import { LabelWithInfo } from "@/components/ui/LabelWithInfo";
import { Panel } from "@/components/ui/Panel";
import { g } from "@/lib/glossary";
import { Num } from "@/components/ui/Num";
import { computeDailyAllowance, DailyAllowanceStatus } from "@/lib/dailyAllowance";
import { cardLimitUsages } from "@/lib/cardLimits";
import { formatBRL, formatDateBR } from "@/lib/format";
import { useAppStore } from "@/lib/store";
import { SavingsPreference } from "@/lib/types";

const statusStyles: Record<
  DailyAllowanceStatus,
  { panel: string; label: string }
> = {
  ok: {
    panel:
      "from-[color-mix(in_oklab,var(--system-green)_10%,var(--surface))] to-[color-mix(in_oklab,var(--system-blue)_6%,var(--surface))]",
    label: "No ritmo",
  },
  atenta: {
    panel:
      "from-[color-mix(in_oklab,var(--system-yellow)_12%,var(--surface))] to-[color-mix(in_oklab,var(--system-orange)_6%,var(--surface))]",
    label: "Atenção",
  },
  alerta: {
    panel:
      "from-[color-mix(in_oklab,var(--system-red)_12%,var(--surface))] to-[color-mix(in_oklab,var(--system-orange)_8%,var(--surface))]",
    label: "Apertado",
  },
};

function cardBarTone(pct: number): string {
  if (pct >= 100) return "bg-danger";
  if (pct >= 80) return "bg-warning";
  return "bg-success";
}

export function DailyAllowancePanel({ className }: Readonly<{ className?: string }>) {
  const {
    normalized,
    recurringRules,
    accounts,
    structuralCategories,
    settings,
    updateSettings,
  } = useAppStore();
  const [editingSavings, setEditingSavings] = useState(false);
  const result = useMemo(
    () =>
      computeDailyAllowance({
        normalized,
        recurringRules,
        accounts,
        structuralCategories,
        poupanca: settings.poupanca,
      }),
    [normalized, recurringRules, accounts, structuralCategories, settings.poupanca],
  );

  const cardLimitAlerts = useMemo(
    () =>
      cardLimitUsages(normalized, accounts).filter(
        (usage) => usage.status !== "ok",
      ),
    [normalized, accounts],
  );

  const styles = statusStyles[result.status];
  const jaGastoMes = round2(
    result.gastoVariavelMes + result.faturaAbertaCartao,
  );
  const hasSavings = settings.poupanca != null;

  async function handleSaveSavings(pref: SavingsPreference) {
    await updateSettings({ ...settings, poupanca: pref });
    setEditingSavings(false);
  }

  async function handleRemoveSavings() {
    await updateSettings({ ...settings, poupanca: null });
    setEditingSavings(false);
  }

  if (!result.temRendaCadastrada) {
    return (
      <Panel className={clsx("rounded-3xl p-5 shadow-[var(--shadow-card)] ring-1 ring-border/60", className)}>
        <LabelWithInfo
          labelClassName="text-caption uppercase tracking-wider text-muted"
          info={g("saldoDiario")}
          ariaTopic="Saldo diário disponível"
        >
          Saldo diário disponível
        </LabelWithInfo>
        <p className="mt-3 text-sm text-muted leading-relaxed">
          Cadastre sua renda recorrente em{" "}
          <Link
            href="/recorrentes"
            className="text-accent underline underline-offset-2"
          >
            Recorrentes
          </Link>{" "}
          para ver quanto sobra por dia até o fim do mês.
        </p>
      </Panel>
    );
  }

  return (
    <>
      <Panel
        className={clsx(
          "rounded-3xl bg-gradient-to-br p-5 shadow-[var(--shadow-card)] ring-1 ring-black/5",
          styles.panel,
          className,
        )}
      >
        <div className="flex flex-wrap items-start justify-between gap-2">
          <LabelWithInfo
            labelClassName="text-caption uppercase tracking-wider text-muted"
            info={g("saldoDiario")}
            ariaTopic="Saldo diário disponível"
          >
            Saldo diário disponível
          </LabelWithInfo>
          <span
            className={clsx(
              "rounded-full px-2.5 py-0.5 text-[10px] font-medium uppercase tracking-wide",
              result.status === "ok" && "bg-success/15 text-success",
              result.status === "atenta" && "bg-warning/15 text-warning",
              result.status === "alerta" && "bg-danger/15 text-danger",
            )}
          >
            {styles.label}
          </span>
        </div>

        {result.rendaDisponivel <= 0 ? (
          <p className="mt-4 text-sm text-danger leading-relaxed">
            Custo fixo maior que renda — ajuste seu planejamento em{" "}
            <Link
              href="/recorrentes"
              className="underline underline-offset-2"
            >
              Recorrentes
            </Link>
            .
          </p>
        ) : result.sobraDoMes <= 0 ? (
          <>
            <Num className="mt-3 block text-4xl font-semibold tracking-tight num-display sm:text-5xl">
              {formatBRL(0)}
            </Num>
            <p className="mt-1 text-sm text-muted">/dia até o fim do mês</p>
            <p className="mt-4 text-sm text-muted leading-relaxed">
              Você já comprometeu toda a renda disponível deste mês. Excesso de{" "}
              <Num className="font-mono tabular-nums text-danger">
                {formatBRL(Math.abs(result.sobraDoMes))}
              </Num>
              . Veja o que ajustar no{" "}
              <Link
                href="/extrato"
                className="text-accent underline underline-offset-2"
              >
                Extrato
              </Link>
              .
            </p>
          </>
        ) : (
          <>
            <Num className="mt-3 block text-4xl font-semibold tracking-tight num-display sm:text-5xl">
              {formatBRL(result.diarioRestante)}
            </Num>
            <p className="mt-1 text-sm text-muted">/dia até o fim do mês</p>
          </>
        )}

        <dl className="mt-5 space-y-2 text-sm">
          <div className="flex items-center justify-between gap-3">
            <dt className="text-muted">
              <LabelWithInfo info={g("rendaDisponivel")} ariaTopic="Renda disponível">
                Renda disponível
              </LabelWithInfo>
            </dt>
            <dd>
              <Num className="font-mono tabular-nums">{formatBRL(result.rendaDisponivel)}</Num>
            </dd>
          </div>

          <div className="flex items-center justify-between gap-3">
            <dt className="text-muted">
              <LabelWithInfo info={g("jaGasto")} ariaTopic="Já gasto este mês">
                Já gasto este mês
              </LabelWithInfo>
            </dt>
            <dd>
              <Num className="font-mono tabular-nums">{formatBRL(jaGastoMes)}</Num>
            </dd>
          </div>

          {result.rendaDisponivel > 0 && (
            <div className="flex items-center justify-between gap-3">
              <dt className="text-muted">
                <LabelWithInfo info={g("reservaMensal")} ariaTopic="Reservado para poupar">
                  Reservado para poupar
                </LabelWithInfo>
              </dt>
              <dd className="flex items-center gap-1.5">
                {result.aporteMensal > 0 ? (
                  <Num className="font-mono tabular-nums text-success">
                    {formatBRL(result.aporteMensal)}
                  </Num>
                ) : (
                  <button
                    type="button"
                    className="text-xs text-accent underline underline-offset-2"
                    onClick={() => setEditingSavings(true)}
                  >
                    Definir
                  </button>
                )}
                {hasSavings && (
                  <button
                    type="button"
                    className="rounded-full p-1 text-muted hover:text-foreground"
                    onClick={() => setEditingSavings(true)}
                    aria-label="Editar reserva para poupar"
                  >
                    <Pencil size={12} />
                  </button>
                )}
              </dd>
            </div>
          )}

          <div className="flex items-center justify-between gap-3">
            <dt className="text-muted">
              <LabelWithInfo
                info={g("sobraDoMes")}
                ariaTopic={result.aporteMensal > 0 ? "Sobra para gastar" : "Sobra do mês"}
              >
                {result.aporteMensal > 0 ? "Sobra para gastar" : "Sobra do mês"}
              </LabelWithInfo>
            </dt>
            <dd>
              <Num
                className={clsx(
                  "font-mono tabular-nums",
                  result.sobraDoMes < 0 && "text-danger",
                )}
              >
                {formatBRL(result.sobraDoMes)}
              </Num>
            </dd>
          </div>

          <div className="flex items-center justify-between gap-3">
            <dt className="text-muted">Faltam</dt>
            <dd className="text-muted">
              {result.diasRestantesMes}{" "}
              {result.diasRestantesMes === 1 ? "dia" : "dias"}
            </dd>
          </div>
        </dl>

        {result.temCartaoAtivo && result.rendaDisponivel > 0 && (
          <>
            <div className="my-5 border-t border-border/60" />

            <div className="space-y-3">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <LabelWithInfo
                  labelClassName="text-caption uppercase tracking-wider text-muted"
                  info={g("faturaAberta")}
                  ariaTopic="Cartão (fatura aberta)"
                >
                  Cartão (fatura aberta)
                </LabelWithInfo>
                {result.cartoesComFaturaAberta > 1 && (
                  <span className="text-[10px] text-muted">
                    {result.cartoesComFaturaAberta} cartões
                  </span>
                )}
              </div>

              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <Num className="text-lg font-semibold num-display">
                  {formatBRL(result.faturaAbertaCartao)}
                </Num>
                <span className="text-sm text-muted">
                  / {formatBRL(result.rendaDisponivel)}{" "}
                  <span
                    className={clsx(
                      result.faturaAbertaPct >= 100 && "text-danger",
                      result.faturaAbertaPct >= 80 &&
                        result.faturaAbertaPct < 100 &&
                        "text-warning",
                    )}
                  >
                    ({result.faturaAbertaPct.toFixed(0)}%)
                  </span>
                </span>
              </div>

              <div className="h-1.5 bg-surface-2 rounded-sm overflow-hidden">
                <div
                  className={clsx(
                    "h-full rounded-sm transition-[width] duration-200",
                    cardBarTone(result.faturaAbertaPct),
                  )}
                  style={{
                    width: `${Math.min(100, Math.max(0, result.faturaAbertaPct))}%`,
                  }}
                />
              </div>

              <p className="text-xs text-muted">
                <LabelWithInfo info={g("tetoCartao")} ariaTopic="Teto para novos gastos">
                  Teto para novos gastos
                </LabelWithInfo>{" "}
                = {formatBRL(result.tetoCartaoRecomendado)} (renda disponível −
                fatura em aberto)
                {result.proximoPagamento && (
                  <>
                    {" "}
                    · próximo pagamento{" "}
                    {formatDateBR(result.proximoPagamento)}
                  </>
                )}
              </p>

              {cardLimitAlerts.length > 0 && (
                <div className="rounded-xl bg-surface/70 px-3 py-2 space-y-2">
                  <LabelWithInfo
                    labelClassName="text-[10px] uppercase tracking-wider text-muted"
                    info={g("tetoCartaoUso")}
                    ariaTopic="Teto definido por cartão"
                  >
                    Teto definido por cartão
                  </LabelWithInfo>
                  {cardLimitAlerts.map((usage) => (
                    <div key={usage.accountId} className="space-y-1">
                      <div className="flex flex-wrap items-baseline justify-between gap-2 text-xs">
                        <span className="font-medium">{usage.accountNome}</span>
                        <span
                          className={clsx(
                            usage.status === "danger" && "text-danger",
                            usage.status === "warning" && "text-warning",
                          )}
                        >
                          {formatBRL(usage.gasto)} / {formatBRL(usage.limite)} (
                          {usage.percentual.toFixed(0)}%)
                        </span>
                      </div>
                      <div className="h-1 bg-surface-2 rounded-sm overflow-hidden">
                        <div
                          className={clsx(
                            "h-full rounded-sm transition-[width] duration-200",
                            cardBarTone(usage.percentual),
                          )}
                          style={{
                            width: `${Math.min(100, Math.max(0, usage.percentual))}%`,
                          }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </Panel>

      {editingSavings && result.rendaDisponivel > 0 && (
        <DrawerBackdrop
          role="presentation"
          className="flex items-center justify-center p-4"
          onClick={() => setEditingSavings(false)}
        >
          <div
            className="bg-surface rounded-2xl ring-1 ring-border/60 shadow-[var(--shadow-card)] w-full max-w-md p-5"
            role="dialog"
            aria-modal="true"
            aria-labelledby="savings-form-title"
            onClick={(e) => e.stopPropagation()}
          >
            <p
              id="savings-form-title"
              className="text-caption uppercase tracking-wider text-muted"
            >
              Reserva para poupar
            </p>
            <p className="mt-1 mb-4 text-sm text-muted">
              Quanto da renda disponível você quer guardar todo mês.
            </p>
            <SavingsGoalForm
              rendaDisponivel={result.rendaDisponivel}
              initial={settings.poupanca ?? null}
              onSave={handleSaveSavings}
              onRemove={hasSavings ? handleRemoveSavings : undefined}
              showRemove={hasSavings}
              onCancel={() => setEditingSavings(false)}
              compact
            />
          </div>
        </DrawerBackdrop>
      )}
    </>
  );
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
