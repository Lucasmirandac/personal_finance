import type { DailyAllowanceResult, DailyAllowanceStatus } from "@/lib/dailyAllowance";

export type ManualDailyAllowanceInput = {
  rendaMensal: number;
  custoFixoMensal: number;
  gastoVariavelMes?: number;
  faturaAbertaCartao?: number;
  today?: Date;
};

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

function daysInMonth(year: number, month: number): number {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

function resolveStatus(input: {
  rendaDisponivel: number;
  diarioRestante: number;
  diarioBaseline: number;
  faturaAbertaPct: number;
}): DailyAllowanceStatus {
  if (input.rendaDisponivel <= 0) return "alerta";
  if (input.diarioRestante <= 0 || input.faturaAbertaPct >= 100) {
    return "alerta";
  }
  if (
    input.diarioRestante < input.diarioBaseline * 0.5 ||
    input.faturaAbertaPct >= 80
  ) {
    return "atenta";
  }
  return "ok";
}

export function computeDailyAllowanceFromManual(
  input: ManualDailyAllowanceInput,
): DailyAllowanceResult {
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

  const sobraBruta = round2(
    rendaDisponivel - gastoVariavelMes - faturaAbertaCartao,
  );

  const diarioRestante =
    rendaDisponivel > 0
      ? Math.max(0, round2(sobraBruta / diasRestantesMes))
      : 0;
  const diarioBaseline =
    rendaDisponivel > 0 ? round2(rendaDisponivel / diasDoMes) : 0;

  const tetoCartaoRecomendado = round2(
    Math.max(0, rendaDisponivel - faturaAbertaCartao),
  );
  const faturaAbertaPct =
    rendaDisponivel > 0
      ? round2((faturaAbertaCartao / rendaDisponivel) * 100)
      : faturaAbertaCartao > 0
        ? 100
        : 0;

  const status = resolveStatus({
    rendaDisponivel,
    diarioRestante,
    diarioBaseline,
    faturaAbertaPct,
  });

  return {
    rendaMensal,
    custoFixoMensal,
    rendaDisponivel,
    gastoVariavelMes,
    faturaAbertaCartao,
    sobraDoMes: sobraBruta,
    diasRestantesMes,
    diasDoMes,
    diarioRestante,
    diarioBaseline,
    tetoCartaoRecomendado,
    faturaAbertaPct,
    proximoPagamento: null,
    cartoesComFaturaAberta: faturaAbertaCartao > 0 ? 1 : 0,
    status,
    temRendaCadastrada: rendaMensal > 0,
    temCartaoAtivo: faturaAbertaCartao > 0,
  };
}
