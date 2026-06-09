import { resolveAporteMensal } from "@/lib/savings";
import { SavingsPreference } from "@/lib/types";

export type SavingsDemoInput = {
  rendaMensal: number;
  custoFixoMensal: number;
  gastoVariavelMes?: number;
  faturaAbertaCartao?: number;
  poupanca?: SavingsPreference | null;
  today?: Date;
};

export type SavingsDemoResult = {
  rendaDisponivel: number;
  aporteMensal: number;
  percentualEfetivo: number | null;
  sobraDoMes: number;
  diarioRestante: number;
  diasRestantesMes: number;
  aporte12m: number;
  reservaConsomeTodaRenda: boolean;
};

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

function daysInMonth(year: number, month: number): number {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

export function computeSavingsDemo(
  input: SavingsDemoInput,
): SavingsDemoResult {
  const today = input.today ?? new Date();
  const year = today.getUTCFullYear();
  const month = today.getUTCMonth() + 1;
  const day = today.getUTCDate();

  const diasDoMes = daysInMonth(year, month);
  const diasRestantesMes = Math.max(1, diasDoMes - day + 1);

  const rendaMensal = Math.max(0, input.rendaMensal);
  const custoFixoMensal = Math.max(0, input.custoFixoMensal);
  const rendaDisponivel = round2(Math.max(0, rendaMensal - custoFixoMensal));
  const gastoVariavelMes = Math.max(0, input.gastoVariavelMes ?? 0);
  const faturaAbertaCartao = Math.max(0, input.faturaAbertaCartao ?? 0);

  const { aporteMensal, percentualEfetivo } = resolveAporteMensal(
    rendaDisponivel,
    input.poupanca ?? null,
  );

  const sobraBruta = round2(
    rendaDisponivel - gastoVariavelMes - faturaAbertaCartao,
  );
  const sobraDoMes = round2(sobraBruta - aporteMensal);
  const diarioRestante =
    rendaDisponivel > 0
      ? Math.max(0, round2(sobraDoMes / diasRestantesMes))
      : 0;

  const reservaConsomeTodaRenda =
    rendaDisponivel > 0 &&
    aporteMensal >= rendaDisponivel - gastoVariavelMes - faturaAbertaCartao &&
    sobraDoMes <= 0;

  return {
    rendaDisponivel,
    aporteMensal,
    percentualEfetivo,
    sobraDoMes,
    diarioRestante,
    diasRestantesMes,
    aporte12m: round2(aporteMensal * 12),
    reservaConsomeTodaRenda,
  };
}
