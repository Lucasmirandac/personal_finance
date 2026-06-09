import { defaultAccount } from "./accounts";
import {
  cardLimitUsageForAccount,
  projectCardLimitAfterExpense,
} from "./cardLimits";
import {
  budgetUsageForMonth,
  BudgetStatus,
  currentMonthIso,
  findBudgetForCategory,
  projectUsageAfterExpense,
} from "./budgets";
import {
  addMonthsIso,
  isoFromParts,
  parseIso,
  todayIso,
  yyyyMmFromIso,
} from "./dates";
import { formatMonthLabel } from "./format";
import { MAX_PARCELAS, splitInstallments } from "./installments";
import { computeLeverageRatio } from "./leverage";
import {
  CashEvent,
  cycleFor,
  projectDailyBalance,
} from "./projection";
import {
  Account,
  CategoryBudget,
  EditsState,
  RecurringRule,
  Settings,
  TransactionNormalized,
} from "./types";
import { resolveAporteMensal } from "./savings";
import {
  computeWealthBaseline,
  projectWealth,
  rendaDisponivelFromLeverage,
  summarizeWealth,
} from "./wealth";

export type AffordDraft = {
  valor: number;
  parcelas: number;
  categoria: string;
  accountId: string;
  dataIso: string;
};

export type AffordFaturaLine = {
  accountNome: string;
  payDate: string;
  parcelDate: string;
  valorParcela: number;
  mesLabel: string;
  isCartao: boolean;
};

export type AffordSaldoImpact = {
  menorAntes: number;
  menorDepois: number;
  data: string;
  delta: number;
};

export type AffordResult = {
  faturas: AffordFaturaLine[];
  isCartao: boolean;
  saldoInicial: number;
  saldo30: AffordSaldoImpact | null;
  saldo90: AffordSaldoImpact | null;
  budget: null | {
    categoria: string;
    limite: number;
    gastoAntes: number;
    gastoDepois: number;
    pctAntes: number;
    pctDepois: number;
    statusAntes: BudgetStatus;
    statusDepois: BudgetStatus;
  };
  cardLimit: null | {
    accountNome: string;
    limite: number;
    gastoAntes: number;
    gastoDepois: number;
    pctAntes: number;
    pctDepois: number;
    statusAntes: BudgetStatus;
    statusDepois: BudgetStatus;
  };
  pazFutura: null | {
    mesesAntes: number;
    mesesDepois: number;
    perdaMeses: number;
    labelMesReferencia: string;
  };
  semaforo: "verde" | "amarelo" | "vermelho";
  motivos: string[];
};

export type SimulateAffordInput = {
  draft: AffordDraft;
  normalized: TransactionNormalized[];
  recurringRules: RecurringRule[];
  settings: Settings;
  accounts: Account[];
  budgets: CategoryBudget[];
  structuralCategories: string[];
  edits?: EditsState;
};

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

function addDaysIso(iso: string, days: number): string {
  const [y, m, d] = parseIso(iso);
  const t = Date.UTC(y, m - 1, d) + days * 86400000;
  const dt = new Date(t);
  return isoFromParts(
    dt.getUTCFullYear(),
    dt.getUTCMonth() + 1,
    dt.getUTCDate(),
  );
}

function buildInstallmentPlan(
  draft: AffordDraft,
  account: Account,
): { faturas: AffordFaturaLine[]; extraEvents: CashEvent[] } {
  const amounts = splitInstallments(draft.valor, draft.parcelas);
  const isCartao = account.kind === "cartao";
  const faturas: AffordFaturaLine[] = [];
  const extraEvents: CashEvent[] = [];

  for (let i = 0; i < amounts.length; i += 1) {
    const valorParcela = amounts[i];
    const parcelDate = addMonthsIso(draft.dataIso, i);
    const anoMes = yyyyMmFromIso(parcelDate);
    const mesLabel = formatMonthLabel(anoMes);

    if (isCartao) {
      const payDate = cycleFor(parcelDate, {
        fonte: account.fonteCsv ?? "inter",
        diaFechamento: account.diaFechamento ?? 10,
        diaPagamento: account.diaPagamento ?? 20,
      });
      faturas.push({
        accountNome: account.nome,
        payDate,
        parcelDate,
        valorParcela,
        mesLabel: formatMonthLabel(yyyyMmFromIso(payDate)),
        isCartao: true,
      });
      extraEvents.push({
        date: payDate,
        type: "fatura",
        description: `Simulação · Fatura ${account.nome}`,
        amount: -valorParcela,
      });
    } else {
      faturas.push({
        accountNome: account.nome,
        payDate: parcelDate,
        parcelDate,
        valorParcela,
        mesLabel,
        isCartao: false,
      });
      extraEvents.push({
        date: parcelDate,
        type: "fixa",
        description: `Simulação · ${account.nome}`,
        amount: -valorParcela,
      });
    }
  }

  return { faturas, extraEvents };
}

function minBalanceInHorizon(
  series: { date: string; balance: number }[],
  anchorValue: number,
  daysAhead: number,
): { menor: number; data: string } {
  const today = todayIso();
  const target = addDaysIso(today, daysAhead);
  let menor = anchorValue;
  let data = today;

  for (const point of series) {
    if (point.date < today) continue;
    if (point.date > target) break;
    if (point.balance < menor) {
      menor = point.balance;
      data = point.date;
    }
  }

  return { menor, data };
}

function computeBudgetImpact(
  draft: AffordDraft,
  faturas: AffordFaturaLine[],
  normalized: TransactionNormalized[],
  budgets: CategoryBudget[],
): AffordResult["budget"] {
  const budget = findBudgetForCategory(budgets, draft.categoria);
  if (!budget) return null;

  const monthIso = currentMonthIso();
  const usages = budgetUsageForMonth(normalized, budgets, monthIso);
  const usage = usages.find((u) => u.budgetId === budget.id);
  if (!usage) return null;

  const incremento = faturas
    .filter((f) => yyyyMmFromIso(f.parcelDate) === monthIso)
    .reduce((sum, f) => sum + f.valorParcela, 0);

  if (incremento <= 0) {
    return {
      categoria: usage.categoria,
      limite: usage.limite,
      gastoAntes: usage.gasto,
      gastoDepois: usage.gasto,
      pctAntes: usage.percentual,
      pctDepois: usage.percentual,
      statusAntes: usage.status,
      statusDepois: usage.status,
    };
  }

  const projected = projectUsageAfterExpense(usage, incremento);
  return {
    categoria: usage.categoria,
    limite: usage.limite,
    gastoAntes: usage.gasto,
    gastoDepois: projected.gasto,
    pctAntes: usage.percentual,
    pctDepois: projected.percentual,
    statusAntes: usage.status,
    statusDepois: projected.status,
  };
}

function computeCardLimitImpact(
  account: Account,
  faturas: AffordFaturaLine[],
  normalized: TransactionNormalized[],
  accounts: Account[],
): AffordResult["cardLimit"] {
  if (account.kind !== "cartao") return null;

  const usage = cardLimitUsageForAccount(account, normalized, accounts);
  if (!usage) return null;

  const incremento = faturas
    .filter((f) => f.isCartao && usage.payDate && f.payDate === usage.payDate)
    .reduce((sum, f) => sum + f.valorParcela, 0);

  if (incremento <= 0) {
    return {
      accountNome: usage.accountNome,
      limite: usage.limite,
      gastoAntes: usage.gasto,
      gastoDepois: usage.gasto,
      pctAntes: usage.percentual,
      pctDepois: usage.percentual,
      statusAntes: usage.status,
      statusDepois: usage.status,
    };
  }

  const projected = projectCardLimitAfterExpense(usage, incremento);
  return {
    accountNome: usage.accountNome,
    limite: usage.limite,
    gastoAntes: usage.gasto,
    gastoDepois: projected.gasto,
    pctAntes: usage.percentual,
    pctDepois: projected.percentual,
    statusAntes: usage.status,
    statusDepois: projected.status,
  };
}

function computePazFuturaImpact(
  valor: number,
  accounts: Account[],
  recurringRules: RecurringRule[],
  normalized: TransactionNormalized[],
  structuralCategories: string[],
  settings: Settings,
): AffordResult["pazFutura"] {
  const leverage = computeLeverageRatio({
    recurringRules,
    normalized,
    structuralCategories,
  });

  if (leverage.custoFixoMensal <= 0) return null;

  const rendaDisponivel = rendaDisponivelFromLeverage(leverage);
  const { patrimonioInicial } = computeWealthBaseline(accounts);
  const { aporteMensal } = resolveAporteMensal(
    rendaDisponivel,
    settings.poupanca,
  );

  const pointsAntes = projectWealth({
    patrimonioInicial,
    rendaDisponivel,
    aporteMensal,
    custoFixoMensal: leverage.custoFixoMensal,
  });

  // Treat purchase as immediate patrimony reduction (monthly wealth model has no card cashflow).
  const pointsDepois = projectWealth({
    patrimonioInicial: round2(patrimonioInicial - valor),
    rendaDisponivel,
    aporteMensal,
    custoFixoMensal: leverage.custoFixoMensal,
  });

  const summaryAntes = summarizeWealth(
    pointsAntes,
    patrimonioInicial,
    aporteMensal,
  );
  const summaryDepois = summarizeWealth(
    pointsDepois,
    round2(patrimonioInicial - valor),
    aporteMensal,
  );

  const mesesAntes = summaryAntes.headlinePoint.mesesDeTranquilidade ?? 0;
  const mesesDepois = summaryDepois.headlinePoint.mesesDeTranquilidade ?? 0;

  return {
    mesesAntes,
    mesesDepois,
    perdaMeses: round1(mesesAntes - mesesDepois),
    labelMesReferencia: summaryAntes.headlinePoint.label,
  };
}

function computeSemaforo(input: {
  saldoInicial: number;
  saldo30: AffordSaldoImpact | null;
  budget: AffordResult["budget"];
  cardLimit: AffordResult["cardLimit"];
  pazFutura: AffordResult["pazFutura"];
}): { semaforo: AffordResult["semaforo"]; motivos: string[] } {
  const motivos: string[] = [];
  let semaforo: AffordResult["semaforo"] = "verde";

  const setWorst = (next: AffordResult["semaforo"]) => {
    if (next === "vermelho") semaforo = "vermelho";
    else if (next === "amarelo" && semaforo !== "vermelho") semaforo = "amarelo";
  };

  if (input.saldo30) {
    if (input.saldo30.menorDepois < 0) {
      setWorst("vermelho");
      motivos.push("Saldo mínimo nos próximos 30 dias ficaria negativo.");
    } else if (input.saldo30.menorDepois < input.saldoInicial * 0.1) {
      setWorst("amarelo");
      motivos.push("Margem de saldo nos próximos 30 dias fica apertada.");
    }
  }

  if (input.budget) {
    if (input.budget.statusDepois === "danger") {
      setWorst("vermelho");
      motivos.push(
        `Orçamento de ${input.budget.categoria} estoura (${input.budget.pctDepois.toFixed(0)}%).`,
      );
    } else if (input.budget.statusDepois === "warning") {
      setWorst("amarelo");
      motivos.push(
        `Orçamento de ${input.budget.categoria} passa de 80% (${input.budget.pctDepois.toFixed(0)}%).`,
      );
    }
  }

  if (input.cardLimit) {
    if (input.cardLimit.statusDepois === "danger") {
      setWorst("vermelho");
      motivos.push(
        `Teto de ${input.cardLimit.accountNome} estoura (${input.cardLimit.pctDepois.toFixed(0)}%).`,
      );
    } else if (input.cardLimit.statusDepois === "warning") {
      setWorst("amarelo");
      motivos.push(
        `Teto de ${input.cardLimit.accountNome} passa de 80% (${input.cardLimit.pctDepois.toFixed(0)}%).`,
      );
    }
  }

  if (input.pazFutura) {
    if (input.pazFutura.perdaMeses > 1) {
      setWorst("vermelho");
      motivos.push(
        `Perde ${input.pazFutura.perdaMeses.toLocaleString("pt-BR", { maximumFractionDigits: 1 })} meses de tranquilidade financeira.`,
      );
    } else if (input.pazFutura.perdaMeses >= 0.2) {
      setWorst("amarelo");
      motivos.push(
        `Reduz ${input.pazFutura.perdaMeses.toLocaleString("pt-BR", { maximumFractionDigits: 1 })} mês(es) de tranquilidade.`,
      );
    }
  }

  if (motivos.length === 0) {
    motivos.push("Cabe sem aperto no saldo, orçamento, teto do cartão e meta de Paz Futura.");
  }

  return { semaforo, motivos };
}

export function simulateAffordability(
  input: SimulateAffordInput,
): AffordResult | null {
  const { draft, normalized, recurringRules, settings, accounts, budgets, structuralCategories } =
    input;

  if (!Number.isFinite(draft.valor) || draft.valor <= 0) return null;
  if (!draft.accountId) return null;

  const account =
    accounts.find((a) => a.id === draft.accountId && a.ativa) ??
    defaultAccount(accounts);
  if (!account) return null;

  const { faturas, extraEvents } = buildInstallmentPlan(draft, account);
  const isCartao = account.kind === "cartao";

  const baseProjection = projectDailyBalance({
    normalized,
    recurringRules,
    settings,
    accounts,
    edits: input.edits,
  });

  const simulatedProjection = projectDailyBalance({
    normalized,
    recurringRules,
    settings,
    accounts,
    edits: input.edits,
    extraEvents,
  });

  const saldoInicial = baseProjection.summary?.saldoInicial ?? 0;

  let saldo30: AffordSaldoImpact | null = null;
  let saldo90: AffordSaldoImpact | null = null;

  if (baseProjection.summary && simulatedProjection.summary) {
    const antes30 = minBalanceInHorizon(baseProjection.series, saldoInicial, 30);
    const depois30 = minBalanceInHorizon(
      simulatedProjection.series,
      saldoInicial,
      30,
    );
    saldo30 = {
      menorAntes: antes30.menor,
      menorDepois: depois30.menor,
      data: depois30.data,
      delta: round2(depois30.menor - antes30.menor),
    };

    const antes90 = minBalanceInHorizon(baseProjection.series, saldoInicial, 90);
    const depois90 = minBalanceInHorizon(
      simulatedProjection.series,
      saldoInicial,
      90,
    );
    saldo90 = {
      menorAntes: antes90.menor,
      menorDepois: depois90.menor,
      data: depois90.data,
      delta: round2(depois90.menor - antes90.menor),
    };
  }

  const budget = computeBudgetImpact(draft, faturas, normalized, budgets);
  const cardLimit = computeCardLimitImpact(
    account,
    faturas,
    normalized,
    accounts,
  );
  const pazFutura = computePazFuturaImpact(
    draft.valor,
    accounts,
    recurringRules,
    normalized,
    structuralCategories,
    settings,
  );

  const { semaforo, motivos } = computeSemaforo({
    saldoInicial,
    saldo30,
    budget,
    cardLimit,
    pazFutura,
  });

  return {
    faturas,
    isCartao,
    saldoInicial,
    saldo30,
    saldo90,
    budget,
    cardLimit,
    pazFutura,
    semaforo,
    motivos,
  };
}

/** @deprecated Use MAX_PARCELAS from ./installments */
export const AFFORD_PARCELAS_MAX = MAX_PARCELAS;

export const AFFORD_SEMAFORO_COPY: Record<
  AffordResult["semaforo"],
  { title: string; detail: string }
> = {
  verde: {
    title: "Pode ir",
    detail: "Cabe sem aperto no saldo, orçamento e meta de Paz Futura.",
  },
  amarelo: {
    title: "Estica o mês",
    detail: "Dá para fazer, mas aperta margem ou orçamento.",
  },
  vermelho: {
    title: "Evite agora",
    detail: "Compromete saldo, orçamento ou tranquilidade futura.",
  },
};
