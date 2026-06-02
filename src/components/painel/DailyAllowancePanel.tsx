"use client";

import { useMemo } from "react";
import Link from "next/link";
import clsx from "clsx";
import { LabelWithInfo } from "@/components/ui/LabelWithInfo";
import { Panel } from "@/components/ui/Panel";
import { g } from "@/lib/glossary";
import { Num } from "@/components/ui/Num";
import { computeDailyAllowance, DailyAllowanceStatus } from "@/lib/dailyAllowance";
import { formatBRL, formatDateBR } from "@/lib/format";
import { useAppStore } from "@/lib/store";

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

export function DailyAllowancePanel() {
  const { normalized, recurringRules, accounts, structuralCategories } =
    useAppStore();
  const result = useMemo(
    () =>
      computeDailyAllowance({
        normalized,
        recurringRules,
        accounts,
        structuralCategories,
      }),
    [normalized, recurringRules, accounts, structuralCategories],
  );

  const styles = statusStyles[result.status];
  const jaGastoMes = round2(
    result.gastoVariavelMes + result.faturaAbertaCartao,
  );

  if (!result.temRendaCadastrada) {
    return (
      <Panel className="rounded-3xl p-5 shadow-[var(--shadow-card)] ring-1 ring-border/60">
        <LabelWithInfo
          labelClassName="text-[11px] uppercase tracking-wider text-muted"
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
    <Panel
      className={clsx(
        "rounded-3xl bg-gradient-to-br p-5 shadow-[var(--shadow-card)] ring-1 ring-black/5",
        styles.panel,
      )}
    >
      <div className="flex flex-wrap items-start justify-between gap-2">
        <LabelWithInfo
          labelClassName="text-[11px] uppercase tracking-wider text-muted"
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

        <div className="flex items-center justify-between gap-3">
          <dt className="text-muted">
            <LabelWithInfo info={g("sobraDoMes")} ariaTopic="Sobra do mês">
              Sobra do mês
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
                labelClassName="text-[11px] uppercase tracking-wider text-muted"
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
                / {formatBRL(result.tetoCartaoRecomendado)}{" "}
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
              <LabelWithInfo info={g("tetoCartao")} ariaTopic="Teto recomendado">
                Teto recomendado
              </LabelWithInfo>{" "}
              = renda disponível mensal
              {result.proximoPagamento && (
                <>
                  {" "}
                  · próximo pagamento{" "}
                  {formatDateBR(result.proximoPagamento)}
                </>
              )}
            </p>
          </div>
        </>
      )}
    </Panel>
  );
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
