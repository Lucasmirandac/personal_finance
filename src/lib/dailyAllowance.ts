import { accountsToCardConfigs } from "./accounts";
import { currentMonthIso, normalizeBudgetCategory } from "./budgets";
import { computeLeverageRatio } from "./leverage";
import {
  buildFaturaEvents,
  buildManualCashEvents,
  CashEvent,
} from "./projection";
import { rendaDisponivelFromLeverage } from "./wealth";
import {
  Account,
  CardConfig,
  RecurringRule,
  TransactionNormalized,
} from "./types";

export type DailyAllowanceStatus = "ok" | "atenta" | "alerta";

export type DailyAllowanceResult = {
  rendaMensal: number;
  custoFixoMensal: number;
  rendaDisponivel: number;
  gastoVariavelMes: number;
  faturaAbertaCartao: number;
  sobraDoMes: number;
  diasRestantesMes: number;
  diasDoMes: number;
  diarioRestante: number;
  diarioBaseline: number;
  tetoCartaoRecomendado: number;
  faturaAbertaPct: number;
  proximoPagamento: string | null;
  cartoesComFaturaAberta: number;
  status: DailyAllowanceStatus;
  temRendaCadastrada: boolean;
  temCartaoAtivo: boolean;
};

export type ComputeDailyAllowanceInput = {
  normalized: TransactionNormalized[];
  recurringRules: RecurringRule[];
  accounts: Account[];
  structuralCategories: string[];
  today?: Date;
};

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

function daysInMonth(year: number, month: number): number {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

function cardConfigsWithDefaults(accounts: Account[]): CardConfig[] {
  const fromAccounts = accountsToCardConfigs(accounts);
  const configuredFontes = new Set(fromAccounts.map((c) => c.fonte));

  for (const account of accounts) {
    if (!account.ativa || account.kind !== "cartao" || !account.fonteCsv) continue;
    if (configuredFontes.has(account.fonteCsv)) continue;
    fromAccounts.push({
      fonte: account.fonteCsv,
      diaFechamento: account.diaFechamento ?? 10,
      diaPagamento: account.diaPagamento ?? 20,
    });
    configuredFontes.add(account.fonteCsv);
  }

  return fromAccounts;
}

function cardEventKey(event: CashEvent): string {
  if (event.fonte === "inter" || event.fonte === "nubank") {
    return `fonte:${event.fonte}`;
  }
  return `desc:${event.description}`;
}

function computeGastoVariavelMes(
  normalized: TransactionNormalized[],
  accounts: Account[],
  recurringRules: RecurringRule[],
  monthIso: string,
): number {
  const accountById = new Map(accounts.map((a) => [a.id, a]));
  const fixedCategories = new Set(
    recurringRules
      .filter((r) => r.ativo && r.kind === "despesa_fixa")
      .map((r) => normalizeBudgetCategory(r.categoria)),
  );

  let total = 0;
  for (const t of normalized) {
    if (t.anoMes !== monthIso || t.tipoFluxo !== "saida") continue;
    if (t.fonte === "inter" || t.fonte === "nubank") continue;

    if (t.accountId) {
      const account = accountById.get(t.accountId);
      if (account?.kind === "cartao") continue;
    }

    if (fixedCategories.has(normalizeBudgetCategory(t.categoria))) continue;
    total += t.valorFluxo;
  }

  return round2(total);
}

function computeOpenInvoices(
  normalized: TransactionNormalized[],
  accounts: Account[],
  todayIsoStr: string,
): {
  total: number;
  proximoPagamento: string | null;
  cartoesComFaturaAberta: number;
} {
  const cards = cardConfigsWithDefaults(accounts);
  const faturaEvents = [
    ...buildFaturaEvents(normalized, cards),
    ...buildManualCashEvents(normalized, accounts).filter(
      (e) => e.type === "fatura",
    ),
  ];

  const upcoming = faturaEvents.filter(
    (e) => e.type === "fatura" && e.date >= todayIsoStr,
  );

  const byCard = new Map<string, CashEvent>();
  for (const event of upcoming) {
    const key = cardEventKey(event);
    const existing = byCard.get(key);
    if (!existing || event.date < existing.date) {
      byCard.set(key, event);
    }
  }

  let total = 0;
  let proximoPagamento: string | null = null;
  for (const event of byCard.values()) {
    total += Math.abs(event.amount);
    if (!proximoPagamento || event.date < proximoPagamento) {
      proximoPagamento = event.date;
    }
  }

  return {
    total: round2(total),
    proximoPagamento,
    cartoesComFaturaAberta: byCard.size,
  };
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

/**
 * Daily spending allowance for the current month.
 *
 * Recommended card ceiling (`tetoCartaoRecomendado`) is the safe room for new
 * card spend this month: monthly available income minus the open invoice already
 * committed from prior cycles.
 */
export function computeDailyAllowance(
  input: ComputeDailyAllowanceInput,
): DailyAllowanceResult {
  const today = input.today ?? new Date();
  const year = today.getUTCFullYear();
  const month = today.getUTCMonth() + 1;
  const day = today.getUTCDate();

  const diasDoMes = daysInMonth(year, month);
  const diasRestantesMes = Math.max(1, diasDoMes - day + 1);

  const leverage = computeLeverageRatio({
    recurringRules: input.recurringRules,
    normalized: input.normalized,
    structuralCategories: input.structuralCategories,
    today,
  });

  const rendaMensal = leverage.rendaMensal;
  const custoFixoMensal = leverage.custoFixoMensal;
  const rendaDisponivel = rendaDisponivelFromLeverage(leverage);
  const temRendaCadastrada = rendaMensal > 0;
  const temCartaoAtivo = input.accounts.some(
    (a) => a.ativa && a.kind === "cartao",
  );

  const monthIso = currentMonthIso(today);
  const gastoVariavelMes = computeGastoVariavelMes(
    input.normalized,
    input.accounts,
    input.recurringRules,
    monthIso,
  );

  const todayIsoStr = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
  const { total: faturaAbertaCartao, proximoPagamento, cartoesComFaturaAberta } =
    computeOpenInvoices(input.normalized, input.accounts, todayIsoStr);

  const sobraBruta = round2(
    rendaDisponivel - gastoVariavelMes - faturaAbertaCartao,
  );
  const sobraDoMes = sobraBruta;

  const diarioRestante =
    rendaDisponivel > 0
      ? Math.max(0, round2(sobraBruta / diasRestantesMes))
      : 0;
  const diarioBaseline =
    rendaDisponivel > 0 ? round2(rendaDisponivel / diasDoMes) : 0;

  /** Safe room for new card spend = available income minus open invoice. */
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
    sobraDoMes,
    diasRestantesMes,
    diasDoMes,
    diarioRestante,
    diarioBaseline,
    tetoCartaoRecomendado,
    faturaAbertaPct,
    proximoPagamento,
    cartoesComFaturaAberta,
    status,
    temRendaCadastrada,
    temCartaoAtivo,
  };
}
