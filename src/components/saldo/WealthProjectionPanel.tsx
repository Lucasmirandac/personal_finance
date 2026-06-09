"use client";

import { useMemo } from "react";
import Link from "next/link";
import { ChartCard } from "@/components/charts/ChartCard";
import { WealthChart } from "@/components/charts/WealthChart";
import { SavingsGoalForm } from "@/components/savings/SavingsGoalForm";
import { LabelWithInfo } from "@/components/ui/LabelWithInfo";
import { StatTile } from "@/components/ui/StatTile";
import { g } from "@/lib/glossary";
import { Panel } from "@/components/ui/Panel";
import { Num } from "@/components/ui/Num";
import { formatBRL } from "@/lib/format";
import { computeLeverageRatio } from "@/lib/leverage";
import { resolveAporteMensal } from "@/lib/savings";
import {
  computeWealthBaseline,
  projectWealth,
  rendaDisponivelFromLeverage,
  summarizeWealth,
} from "@/lib/wealth";
import { useAppStore } from "@/lib/store";
import { SavingsPreference } from "@/lib/types";

function formatMesesTranquilidade(meses: number | null): string {
  if (meses == null) return "—";
  if (meses === 1) return "1 mês";
  return `${meses.toLocaleString("pt-BR", { maximumFractionDigits: 1 })} meses`;
}

function metaNarrative(
  pref: SavingsPreference | null | undefined,
  aporteMensal: number,
  percentualEfetivo: number | null,
): string {
  if (!pref) return "Defina uma reserva";
  if (pref.modo === "percent") {
    return `${pref.percentual ?? 0}% da renda disponível`;
  }
  if (percentualEfetivo != null) {
    return `${formatBRL(aporteMensal)} (${percentualEfetivo.toLocaleString("pt-BR", { maximumFractionDigits: 1 })}%)`;
  }
  return formatBRL(aporteMensal);
}

export function WealthProjectionPanel() {
  const {
    accounts,
    recurringRules,
    normalized,
    structuralCategories,
    settings,
    updateSettings,
  } = useAppStore();

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

  const resolved = useMemo(
    () => resolveAporteMensal(rendaDisponivel, settings.poupanca),
    [rendaDisponivel, settings.poupanca],
  );

  const aporteMensal = resolved.aporteMensal;

  const points = useMemo(
    () =>
      projectWealth({
        patrimonioInicial,
        rendaDisponivel,
        aporteMensal,
        custoFixoMensal: leverage.custoFixoMensal,
      }),
    [patrimonioInicial, rendaDisponivel, aporteMensal, leverage.custoFixoMensal],
  );

  const summary = useMemo(
    () => summarizeWealth(points, patrimonioInicial, aporteMensal),
    [points, patrimonioInicial, aporteMensal],
  );

  async function handleSave(pref: SavingsPreference) {
    await updateSettings({ ...settings, poupanca: pref });
  }

  async function handleRemove() {
    await updateSettings({ ...settings, poupanca: null });
  }

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
  const metaLabel = metaNarrative(
    settings.poupanca,
    aporteMensal,
    resolved.percentualEfetivo,
  );

  return (
    <section className="space-y-4">
      <div className="space-y-1">
        <h2 className="text-lg font-semibold tracking-tight">
          <LabelWithInfo info={g("projecaoPazFutura")} ariaTopic="Projeção de Paz Futura">
            Projeção de Paz Futura
          </LabelWithInfo>
        </h2>
        <p className="text-sm text-muted max-w-2xl">
          Evolução patrimonial nos próximos 12 meses, mantendo sua reserva de
          poupança sobre a renda disponível (renda − custos fixos).
        </p>
      </div>

      <Panel className="p-4 space-y-4">
        <SavingsGoalForm
          rendaDisponivel={rendaDisponivel}
          initial={settings.poupanca ?? null}
          onSave={handleSave}
          onRemove={handleRemove}
          showRemove={!!settings.poupanca}
          compact
        />

        {aporteMensal > 0 ? (
          <p className="text-sm leading-relaxed">
            Mantendo sua reserva de{" "}
            <strong>{metaLabel}</strong>, em{" "}
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
        ) : (
          <p className="text-sm text-muted leading-relaxed">
            Defina uma reserva para ver a projeção com aportes mensais. Você
            também pode configurar em{" "}
            <Link href="/saldo" className="text-accent underline underline-offset-2">
              Saldo
            </Link>
            .
          </p>
        )}
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
