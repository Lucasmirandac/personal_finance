import * as XLSX from "xlsx";
import { BudgetUsage } from "./budgets";
import { CategoryBudget, TransactionNormalized } from "./types";
import {
  categoryAggregation,
  computeKpis,
  establishmentAggregation,
  monthlySeries,
  buildInsights,
} from "./aggregations";

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

const FONTE_LABEL: Record<string, string> = {
  inter: "Inter",
  nubank: "Nubank",
  manual: "Manual",
};

export function exportTreatedCsv(
  data: TransactionNormalized[],
  fileName = "fatura_tratada.csv",
) {
  const headers = [
    "Data",
    "Lançamento",
    "Estabelecimento",
    "Categoria",
    "Tipo",
    "Natureza",
    "Fonte",
    "TipoFluxo",
    "ValorOriginal",
    "ValorAnalise",
    "ValorFluxo",
    "AnoMes",
    "DiaSemana",
    "Semana",
    "FaixaValor",
    "FimDeSemana",
  ];
  const rows = data.map((t) => [
    t.data,
    t.lancamento,
    t.estabelecimento,
    t.categoria,
    t.tipo,
    t.natureza,
    FONTE_LABEL[t.fonte] ?? t.fonte,
    t.tipoFluxo,
    formatNumber(t.valorOriginal),
    formatNumber(t.valorAnalise),
    formatNumber(t.valorFluxo),
    t.anoMes,
    t.diaSemana,
    t.semana,
    t.faixaValor,
    t.fimSemana ? "Sim" : "Não",
  ]);
  const csv = [headers, ...rows]
    .map((r) => r.map(escapeCsv).join(","))
    .join("\n");
  const blob = new Blob(["\uFEFF" + csv], {
    type: "text/csv;charset=utf-8;",
  });
  downloadBlob(blob, fileName);
}

function escapeCsv(value: unknown): string {
  if (value == null) return "";
  const s = String(value);
  if (/[",\n;]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

function formatNumber(n: number): string {
  return n.toFixed(2).replace(".", ",");
}

export function exportWorkbook(
  data: TransactionNormalized[],
  budgets: CategoryBudget[] = [],
  budgetUsages: BudgetUsage[] = [],
  fileName = "dashboard_fatura.xlsx",
) {
  const wb = XLSX.utils.book_new();

  const kpis = computeKpis(data, data);
  const months = monthlySeries(data);
  const cats = categoryAggregation(data);
  const ests = establishmentAggregation(data);
  const insights = buildInsights(data);

  const dashboard = [
    ["Saldo Real — Dashboard"],
    [],
    ["Indicador", "Valor"],
    ["Receitas", kpis.totalReceitas],
    ["Despesas", kpis.totalDespesas],
    ["Saldo", kpis.saldo],
    ["Gasto no cartão", kpis.totalGasto],
    ["Transações de consumo", kpis.countConsumo],
    ["Ticket médio (cartão)", kpis.ticketMedio],
    [
      "Maior compra",
      kpis.maiorCompra
        ? `R$ ${kpis.maiorCompra.valor.toFixed(2)} - ${kpis.maiorCompra.estabelecimento} (${kpis.maiorCompra.data})`
        : "—",
    ],
    ["Pagamentos/estornos excluídos", kpis.countExcluidos],
    ["Total bruto (CSV)", kpis.totalBruto],
  ];
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(dashboard), "Dashboard");

  const dadosHeaders = [
    "Data",
    "Lançamento",
    "Estabelecimento",
    "Categoria",
    "Tipo",
    "Natureza",
    "Fonte",
    "Tipo fluxo",
    "Valor original",
    "Valor análise",
    "Valor fluxo",
    "Ano-Mês",
    "Dia semana",
    "Semana ISO",
    "Faixa de valor",
    "Fim de semana",
  ];
  const dadosRows = data.map((t) => [
    t.data,
    t.lancamento,
    t.estabelecimento,
    t.categoria,
    t.tipo,
    t.natureza,
    FONTE_LABEL[t.fonte] ?? t.fonte,
    t.tipoFluxo,
    t.valorOriginal,
    t.valorAnalise,
    t.valorFluxo,
    t.anoMes,
    t.diaSemana,
    t.semana,
    t.faixaValor,
    t.fimSemana ? "Sim" : "Não",
  ]);
  XLSX.utils.book_append_sheet(
    wb,
    XLSX.utils.aoa_to_sheet([dadosHeaders, ...dadosRows]),
    "Dados",
  );

  const resumoFluxo = [
    ["Ano-Mês", "Mês", "Receitas", "Despesas", "Saldo", "Lançamentos"],
    ...months.map((m) => [
      m.anoMes,
      m.label,
      m.receitas,
      m.despesas,
      m.saldo,
      m.count,
    ]),
  ];
  XLSX.utils.book_append_sheet(
    wb,
    XLSX.utils.aoa_to_sheet(resumoFluxo),
    "Resumo_Fluxo",
  );

  const resumoMes = [
    ["Ano-Mês", "Mês", "Despesas", "Receitas", "Saldo"],
    ...months.map((m) => [m.anoMes, m.label, m.despesas, m.receitas, m.saldo]),
  ];
  XLSX.utils.book_append_sheet(
    wb,
    XLSX.utils.aoa_to_sheet(resumoMes),
    "Resumo_Mensal",
  );

  const resumoCat = [
    ["Categoria", "Total", "Transações", "Participação (%)"],
    ...cats.map((c) => [
      c.categoria,
      c.total,
      c.count,
      Number(c.share.toFixed(2)),
    ]),
  ];
  XLSX.utils.book_append_sheet(
    wb,
    XLSX.utils.aoa_to_sheet(resumoCat),
    "Resumo_Categorias",
  );

  const estab = [
    ["Estabelecimento", "Total", "Transações"],
    ...ests.map((e) => [e.estabelecimento, e.total, e.count]),
  ];
  XLSX.utils.book_append_sheet(
    wb,
    XLSX.utils.aoa_to_sheet(estab),
    "Estabelecimentos",
  );

  const insRows = [
    ["Insight", "Detalhe", "Tom"],
    ...insights.map((i) => [i.title, i.detail, i.tone]),
  ];
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(insRows), "Insights");

  if (budgets.length > 0 || budgetUsages.length > 0) {
    const usageById = new Map(budgetUsages.map((u) => [u.budgetId, u]));
    const orcRows = [
      ["Categoria", "Limite mensal", "Gasto atual", "Percentual (%)", "Status", "Ativo"],
      ...budgets.map((b) => {
        const u = usageById.get(b.id);
        return [
          b.categoria,
          b.valorMensal,
          u?.gasto ?? 0,
          u?.percentual ?? 0,
          u?.status ?? "ok",
          b.ativa ? "Sim" : "Não",
        ];
      }),
    ];
    XLSX.utils.book_append_sheet(
      wb,
      XLSX.utils.aoa_to_sheet(orcRows),
      "Orcamentos",
    );
  }

  const out = XLSX.write(wb, { bookType: "xlsx", type: "array" });
  const blob = new Blob([out], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  downloadBlob(blob, fileName);
}
