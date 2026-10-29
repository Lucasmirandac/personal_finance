import { addMonthsIso, isoFromParts } from "./dates";
import { isForecastTransaction } from "./recurring";
import { accountForRaw } from "./accounts";
import type {
  Account,
  CategoryBudget,
  Natureza,
  TransactionNormalized,
} from "./types";

export const AI_EXPENSE_EXPORT_INSTRUCTIONS =
  "Anexe o arquivo .md exportado pelo Saldo Real. Analise só o que está nele. Use os lançamentos realizados para o total gasto. Compromissos futuros não entram nesse total. Valores em reais (BRL). Não invente lançamentos.";

const FORECAST_HORIZON_MONTHS = 3;
const TOP_ESTABLISHMENTS = 15;

const REALIZED_NATUREZAS = new Set<Natureza>(["Gasto", "Despesa fixa"]);
const OMITTED_NATUREZAS = new Set<Natureza>([
  "Pagamento de fatura",
  "Estorno / crédito",
]);

export type AiExpenseExportOptions = {
  transactions: TransactionNormalized[];
  budgets?: CategoryBudget[];
  accounts?: Account[];
  today?: Date;
  filtersActive?: boolean;
  dateFrom?: string | null;
  dateTo?: string | null;
};

export type AiExpenseExport = {
  markdown: string;
  filename: string;
  realizedCount: number;
  realizedTotal: number;
  periodLabel: string;
  omittedCount: number;
  omittedTotal: number;
  forecastCount: number;
  revenueTotal: number;
};

function todayIsoFromDate(today: Date): string {
  return isoFromParts(
    today.getUTCFullYear(),
    today.getUTCMonth() + 1,
    today.getUTCDate(),
  );
}

function money(n: number): string {
  return n.toFixed(2);
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

function cell(value: string | number): string {
  return String(value)
    .replace(/\s+/g, " ")
    .replace(/\|/g, "\\|")
    .trim();
}

function mdTable(headers: string[], rows: string[][]): string {
  const head = `| ${headers.join(" | ")} |`;
  const sep = `| ${headers.map(() => "---").join(" | ")} |`;
  if (rows.length === 0) return `${head}\n${sep}`;
  const body = rows.map((row) => `| ${row.join(" | ")} |`).join("\n");
  return `${head}\n${sep}\n${body}`;
}

function periodLabelFrom(
  dates: string[],
  dateFrom: string | null | undefined,
  dateTo: string | null | undefined,
): string {
  if (dateFrom && dateTo) return `${dateFrom} a ${dateTo}`;
  if (dateFrom) return `desde ${dateFrom}`;
  if (dateTo) return `até ${dateTo}`;
  const sorted = dates.filter(Boolean).slice().sort();
  if (sorted.length === 0) return "sem lançamentos";
  const min = sorted[0];
  const max = sorted[sorted.length - 1];
  return min === max ? min : `${min} a ${max}`;
}

function accountName(
  tx: TransactionNormalized,
  accounts: Account[],
): string {
  if (accounts.length === 0) return "";
  return accountForRaw(accounts, tx)?.nome ?? "";
}

function forecastKind(tx: TransactionNormalized): string {
  const inst = tx.installment;
  if (inst?.estimated) {
    return `Parcela estimada ${inst.current}/${inst.total}`;
  }
  return "Recorrência";
}

function sumBy<T>(
  items: T[],
  keyFn: (item: T) => string,
  valueFn: (item: T) => number,
): Array<{ key: string; total: number; count: number }> {
  const map = new Map<string, { total: number; count: number }>();
  for (const item of items) {
    const key = keyFn(item);
    const cur = map.get(key) ?? { total: 0, count: 0 };
    cur.total += valueFn(item);
    cur.count += 1;
    map.set(key, cur);
  }
  return [...map.entries()]
    .map(([key, v]) => ({
      key,
      total: round2(v.total),
      count: v.count,
    }))
    .sort((a, b) => b.total - a.total || a.key.localeCompare(b.key));
}

export function buildAiExpenseExport(
  options: AiExpenseExportOptions,
): AiExpenseExport {
  const today = options.today ?? new Date();
  const todayIso = todayIsoFromDate(today);
  const horizonIso = addMonthsIso(todayIso, FORECAST_HORIZON_MONTHS);
  const accounts = options.accounts ?? [];
  const budgets = (options.budgets ?? []).filter((b) => b.ativa);

  const omitted = options.transactions.filter((t) =>
    OMITTED_NATUREZAS.has(t.natureza),
  );
  const omittedCount = omitted.length;
  const omittedTotal = round2(
    omitted.reduce((acc, t) => acc + Math.abs(t.valorOriginal), 0),
  );

  const expenseCandidates = options.transactions.filter((t) =>
    REALIZED_NATUREZAS.has(t.natureza),
  );
  const realized = expenseCandidates
    .filter((t) => !isForecastTransaction(t, today))
    .slice()
    .sort((a, b) =>
      a.dataISO === b.dataISO
        ? a.id.localeCompare(b.id)
        : a.dataISO.localeCompare(b.dataISO),
    );
  const forecast = expenseCandidates
    .filter((t) => {
      if (!isForecastTransaction(t, today)) return false;
      return t.dataISO > todayIso && t.dataISO <= horizonIso;
    })
    .slice()
    .sort((a, b) =>
      a.dataISO === b.dataISO
        ? a.id.localeCompare(b.id)
        : a.dataISO.localeCompare(b.dataISO),
    );

  const realizedCount = realized.length;
  const realizedTotal = round2(
    realized.reduce((acc, t) => acc + t.valorAnalise, 0),
  );
  const revenueTotal = round2(
    options.transactions
      .filter(
        (t) => t.tipoFluxo === "entrada" && !isForecastTransaction(t, today),
      )
      .reduce((acc, t) => acc + t.valorFluxo, 0),
  );

  const periodLabel = periodLabelFrom(
    realized.map((t) => t.dataISO),
    options.dateFrom,
    options.dateTo,
  );

  const byMonth = sumBy(realized, (t) => t.anoMes, (t) => t.valorAnalise).sort(
    (a, b) => a.key.localeCompare(b.key),
  );
  const byCategory = sumBy(
    realized,
    (t) => t.categoria || "(sem categoria)",
    (t) => t.valorAnalise,
  );
  const byEstablishment = sumBy(
    realized.filter((t) => t.natureza === "Gasto"),
    (t) => t.estabelecimento || t.lancamento,
    (t) => t.valorAnalise,
  ).slice(0, TOP_ESTABLISHMENTS);

  const lines: string[] = [
    "# Gastos para análise (Saldo Real)",
    "",
    "## Como usar este arquivo",
    "",
    "Analise apenas o conteúdo abaixo. Não invente lançamentos, categorias ou valores.",
    "Valores em reais (BRL). Cada gasto listado tem valor positivo.",
    "",
    "- Use **Lançamentos realizados** para o total gasto.",
    "- Pagamentos de fatura e estornos foram omitidos para a compra não entrar duas vezes.",
    "- **Compromissos futuros** são previsão dos próximos 3 meses e não entram no total gasto.",
    "",
    "## Recorte",
    "",
    `- Gerado em: ${todayIso}`,
    `- Período: ${periodLabel}`,
    `- Filtros da tela Análise: ${options.filtersActive ? "ativos — os dados abaixo já passaram por eles" : "nenhum"}`,
    "",
    "## Notas de leitura",
    "",
    omittedCount > 0
      ? `- ${omittedCount} pagamento(s) de fatura e/ou estorno omitidos (${money(omittedTotal)} no valor original). Não some esses valores com as compras.`
      : "- Nenhum pagamento de fatura ou estorno neste recorte. Mesmo assim, não some fatura paga com as compras.",
    "",
    "## Resumo do realizado",
    "",
    `- Total gasto: ${money(realizedTotal)}`,
    `- Quantidade: ${realizedCount}`,
    `- Receitas no período (não listadas linha a linha): ${money(revenueTotal)}`,
    `- Receitas menos gastos: ${money(round2(revenueTotal - realizedTotal))}`,
    "",
    "### Por mês",
    "",
    byMonth.length > 0
      ? mdTable(
          ["Mês", "Total", "Lançamentos"],
          byMonth.map((row) => [
            cell(row.key),
            money(row.total),
            String(row.count),
          ]),
        )
      : "Nenhum gasto realizado neste recorte.",
    "",
    "### Por categoria",
    "",
    byCategory.length > 0
      ? mdTable(
          ["Categoria", "Total", "Lançamentos"],
          byCategory.map((row) => [
            cell(row.key),
            money(row.total),
            String(row.count),
          ]),
        )
      : "Nenhum gasto realizado neste recorte.",
    "",
    "### Estabelecimentos com maior gasto",
    "",
    byEstablishment.length > 0
      ? mdTable(
          ["Estabelecimento", "Total", "Lançamentos"],
          byEstablishment.map((row) => [
            cell(row.key),
            money(row.total),
            String(row.count),
          ]),
        )
      : "Nenhum gasto de cartão ou compra avulsa neste recorte.",
    "",
    "## Orçamentos ativos",
    "",
    budgets.length > 0
      ? mdTable(
          ["Categoria", "Limite mensal"],
          budgets.map((b) => [cell(b.categoria), money(b.valorMensal)]),
        )
      : "Nenhum orçamento ativo.",
    "",
    "## Lançamentos realizados",
    "",
    realized.length > 0
      ? mdTable(
          [
            "Data",
            "Descrição",
            "Estabelecimento",
            "Categoria",
            "Natureza",
            "Valor",
            "Conta",
          ],
          realized.map((t) => [
            cell(t.dataISO),
            cell(t.lancamento),
            cell(t.estabelecimento),
            cell(t.categoria),
            cell(t.natureza),
            money(t.valorAnalise),
            cell(accountName(t, accounts)),
          ]),
        )
      : "Nenhum gasto realizado neste recorte.",
    "",
    "## Compromissos futuros (próximos 3 meses)",
    "",
    forecast.length > 0
      ? mdTable(
          [
            "Data",
            "Descrição",
            "Categoria",
            "Natureza",
            "Valor",
            "Tipo",
            "Conta",
          ],
          forecast.map((t) => [
            cell(t.dataISO),
            cell(t.lancamento),
            cell(t.categoria),
            cell(t.natureza),
            money(t.valorAnalise),
            cell(forecastKind(t)),
            cell(accountName(t, accounts)),
          ]),
        )
      : "Nenhum compromisso futuro nos próximos 3 meses neste recorte.",
    "",
  ];

  return {
    markdown: lines.join("\n"),
    filename: `gastos-para-ia-${todayIso}.md`,
    realizedCount,
    realizedTotal,
    periodLabel,
    omittedCount,
    omittedTotal,
    forecastCount: forecast.length,
    revenueTotal,
  };
}

export function downloadAiExpenseExport(markdown: string, filename: string) {
  const blob = new Blob([markdown], { type: "text/markdown;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
