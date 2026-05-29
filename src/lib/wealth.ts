import { currentMonthIso } from "./budgets";
import { addMonthsYyyyMm } from "./dates";
import { formatMonthLabel } from "./format";
import { LeverageRatio } from "./leverage";
import { Account } from "./types";

export const WEALTH_META_MIN = 5;
export const WEALTH_META_MAX = 80;
export const WEALTH_META_DEFAULT = 20;
export const WEALTH_META_STEP = 5;
export const WEALTH_HORIZON_DEFAULT = 12;

export type WealthPoint = {
  anoMes: string;
  label: string;
  patrimonio: number;
  aporteAcumulado: number;
  mesesDeTranquilidade: number | null;
};

export type WealthSummary = {
  patrimonioFinal: number;
  aporteTotal: number;
  aporteMensal: number;
  mesesTranquilidadeFinal: number | null;
  crescimento: number;
  headlinePoint: WealthPoint;
};

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

export function rendaDisponivelFromLeverage(ratio: LeverageRatio): number {
  return round2(Math.max(0, ratio.rendaMensal - ratio.custoFixoMensal));
}

export function computeWealthBaseline(accounts: Account[]): { patrimonioInicial: number } {
  const cash = accounts.filter((a) => a.ativa && a.kind !== "cartao");
  const patrimonioInicial = cash.reduce((sum, a) => sum + a.saldoInicial, 0);
  return { patrimonioInicial: round2(patrimonioInicial) };
}

export function projectWealth(input: {
  patrimonioInicial: number;
  rendaDisponivel: number;
  metaPercent: number;
  custoFixoMensal: number;
  today?: Date;
  mesesHorizonte?: number;
}): WealthPoint[] {
  const today = input.today ?? new Date();
  const mesesHorizonte = input.mesesHorizonte ?? WEALTH_HORIZON_DEFAULT;
  const aporteMensal = round2((input.rendaDisponivel * input.metaPercent) / 100);
  const startMonth = currentMonthIso(today);
  const points: WealthPoint[] = [];

  for (let i = 0; i <= mesesHorizonte; i += 1) {
    const anoMes = addMonthsYyyyMm(startMonth, i);
    const aporteAcumulado = round2(aporteMensal * i);
    const patrimonio = round2(input.patrimonioInicial + aporteAcumulado);
    const mesesDeTranquilidade =
      input.custoFixoMensal > 0
        ? round1(Math.max(0, patrimonio) / input.custoFixoMensal)
        : null;

    points.push({
      anoMes,
      label: formatMonthLabel(anoMes),
      patrimonio,
      aporteAcumulado,
      mesesDeTranquilidade,
    });
  }

  return points;
}

export function summarizeWealth(
  points: WealthPoint[],
  patrimonioInicial: number,
  aporteMensal: number,
  today: Date = new Date(),
): WealthSummary {
  const final = points[points.length - 1] ?? {
    anoMes: "",
    label: "",
    patrimonio: patrimonioInicial,
    aporteAcumulado: 0,
    mesesDeTranquilidade: null,
  };

  const year = today.getUTCFullYear();
  const dezembroAnoMes = `${year}-12`;
  const dezembroPoint =
    points.find((p) => p.anoMes === dezembroAnoMes) ?? final;

  const crescimento = round2(dezembroPoint.patrimonio - patrimonioInicial);

  return {
    patrimonioFinal: final.patrimonio,
    aporteTotal: final.aporteAcumulado,
    aporteMensal,
    mesesTranquilidadeFinal: final.mesesDeTranquilidade,
    crescimento,
    headlinePoint: dezembroPoint,
  };
}
