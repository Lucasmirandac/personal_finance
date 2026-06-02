"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ChartCard } from "@/components/charts/ChartCard";
import { WealthChart } from "@/components/charts/WealthChart";
import { InfoTip } from "@/components/ui/InfoTip";
import { LabelWithInfo } from "@/components/ui/LabelWithInfo";
import { StatTile } from "@/components/ui/StatTile";
import { g } from "@/lib/glossary";
import { Panel } from "@/components/ui/Panel";
import { Num } from "@/components/ui/Num";
import { formatBRL } from "@/lib/format";
import { computeLeverageRatio } from "@/lib/leverage";
import {
  computeWealthBaseline,
  projectWealth,
  rendaDisponivelFromLeverage,
  summarizeWealth,
  WEALTH_META_DEFAULT,
  WEALTH_META_MAX,
  WEALTH_META_MIN,
  WEALTH_META_STEP,
} from "@/lib/wealth";
import { useAppStore } from "@/lib/store";

function formatMesesTranquilidade(meses: number | null): string {
  if (meses == null) return "—";
  if (meses === 1) return "1 mês";
  return `${meses.toLocaleString("pt-BR", { maximumFractionDigits: 1 })} meses`;
}

export function WealthProjectionPanel() {
  const { accounts, recurringRules, normalized, structuralCategories } =
    useAppStore();
  const [metaPercent, setMetaPercent] = useState(WEALTH_META_DEFAULT);

  const leverage = useMemo(
    () =>
      computeLeverageRatio({
        recurringRules,
        normalized,
        structuralCategories,
      }),
    [recurringRules, normalized, structuralCategories],
  );

  const { patrimonioInicial } = useMemo(
    () => computeWealthBaseline(accounts),
    [accounts],
  );

  const rendaDisponivel = useMemo(
    () => rendaDisponivelFromLeverage(leverage),
    [leverage],
  );

  const aporteMensal = useMemo(
    () => round2((rendaDisponivel * metaPercent) / 100),
    [rendaDisponivel, metaPercent],
  );

  const points = useMemo(
    () =>
      projectWealth({
        patrimonioInicial,
        rendaDisponivel,
        metaPercent,
        custoFixoMensal: leverage.custoFixoMensal,
      }),
    [patrimonioInicial, rendaDisponivel, metaPercent, leverage.custoFixoMensal],
  );

  const summary = useMemo(
    () => summarizeWealth(points, patrimonioInicial, aporteMensal),
    [points, patrimonioInicial, aporteMensal],
  );

  if (rendaDisponivel <= 0) {
    return (
      <Panel className="p-4 space-y-2">
        <p className="text-sm font-medium">Projeção de Paz Futura</p>
        <p className="text-xs text-muted">
          Cadastre receitas recorrentes e custos fixos no{" "}
          <Link href="/divisor" className="text-accent underline underline-offset-2">
            Divisor de Águas
          </Link>{" "}
          para ver quanto sobra para poupar e projetar seu patrimônio.
        </p>
      </Panel>
    );
  }

  const hasCustosFixos = leverage.custoFixoMensal > 0;
  const headline = summary.headlinePoint;

  return (
    <section className="space-y-4">
      <div className="space-y-1">
        <h2 className="text-lg font-semibold tracking-tight">
          <LabelWithInfo info={g("projecaoPazFutura")} ariaTopic="Projeção de Paz Futura">
            Projeção de Paz Futura
          </LabelWithInfo>
        </h2>
        <p className="text-sm text-muted max-w-2xl">
          Evolução patrimonial nos próximos 12 meses, mantendo sua meta de
          poupança sobre a renda disponível (renda − custos fixos).
        </p>
      </div>

      <Panel className="p-4 space-y-4">
        <div className="space-y-2">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <label htmlFor="wealth-meta-slider" className="inline-flex items-center gap-1 text-xs text-muted">
              Meta de poupança
              <InfoTip content={g("metaPoupanca")} label="Mais informações: Meta de poupança" />
            </label>
            <span className="text-sm font-semibold tabular-nums">{metaPercent}%</span>
          </div>
          <input
            id="wealth-meta-slider"
            type="range"
            min={WEALTH_META_MIN}
            max={WEALTH_META_MAX}
            step={WEALTH_META_STEP}
            value={metaPercent}
            onChange={(e) => setMetaPercent(Number(e.target.value))}
            className="w-full accent-[var(--foreground)]"
            aria-valuemin={WEALTH_META_MIN}
            aria-valuemax={WEALTH_META_MAX}
            aria-valuenow={metaPercent}
          />
          <div className="flex justify-between text-[10px] text-muted">
            <span>{WEALTH_META_MIN}%</span>
            <span>{WEALTH_META_MAX}%</span>
          </div>
        </div>

        <p className="text-sm leading-relaxed">
          Mantendo sua meta de{" "}
          <strong>{metaPercent}%</strong>, em{" "}
          <strong>{headline.label}</strong> seu patrimônio terá crescido{" "}
          <Num className="font-semibold text-success">
            {formatBRL(summary.crescimento)}
          </Num>
          {hasCustosFixos && headline.mesesDeTranquilidade != null ? (
            <>
              , te garantindo{" "}
              <strong>
                {formatMesesTranquilidade(headline.mesesDeTranquilidade)}
              </strong>{" "}
              de tranquilidade financeira (cobertura dos custos fixos).
            </>
          ) : (
            <>.</>
          )}
        </p>
      </Panel>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatTile label="Aporte mensal" value={formatBRL(aporteMensal)} tone="success" info={g("aporte")} />
        <StatTile
          label="Aporte em 12 meses"
          value={formatBRL(summary.aporteTotal)}
          info={g("aporte")}
        />
        <StatTile
          label="Patrimônio projetado"
          value={formatBRL(summary.patrimonioFinal)}
          info={g("patrimonioProjetado")}
        />
        <StatTile
          label="Tranquilidade (final)"
          info={g("tranquilidade")}
          value={
            hasCustosFixos
              ? formatMesesTranquilidade(summary.mesesTranquilidadeFinal)
              : "—"
          }
          hint={
            hasCustosFixos
              ? undefined
              : "Cadastre custos fixos para calcular meses de cobertura"
          }
        />
      </div>

      <ChartCard
        title="Evolução patrimonial"
        subtitle={`Patrimônio inicial ${formatBRL(patrimonioInicial)} · linha tracejada`}
        info={g("patrimonio")}
      >
        <WealthChart data={points} patrimonioInicial={patrimonioInicial} />
      </ChartCard>
    </section>
  );
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
