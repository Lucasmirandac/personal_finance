import * as XLSX from "xlsx";
import { TransactionNormalized } from "./types";
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
    "ValorOriginal",
    "ValorAnalise",
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
    formatNumber(t.valorOriginal),
    formatNumber(t.valorAnalise),
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
  return n
    .toFixed(2)
    .replace(".", ",");
}

export function exportWorkbook(
  data: TransactionNormalized[],
  fileName = "dashboard_fatura.xlsx",
) {
  const wb = XLSX.utils.book_new();

  const kpis = computeKpis(data, data);
  const months = monthlySeries(data);
  const cats = categoryAggregation(data);
  const ests = establishmentAggregation(data);
  const insights = buildInsights(data);

  const dashboard = [
    ["Dashboard de Gastos"],
    [],
    ["Indicador", "Valor"],
    ["Gasto analisado", kpis.totalGasto],
    ["Transações de consumo", kpis.countConsumo],
    ["Ticket médio", kpis.ticketMedio],
    [
      "Maior compra",
      kpis.maiorCompra
        ? `R$ ${kpis.maiorCompra.valor.toFixed(2)} - ${kpis.maiorCompra.estabelecimento} (${kpis.maiorCompra.data})`
        : "—",
    ],
    ["Pagamentos/ajustes excluídos", kpis.countExcluidos],
    ["Total bruto do CSV", kpis.totalBruto],
  ];
  const wsDash = XLSX.utils.aoa_to_sheet(dashboard);
  XLSX.utils.book_append_sheet(wb, wsDash, "Dashboard");

  const dadosHeaders = [
    "Data",
    "Lançamento",
    "Estabelecimento",
    "Categoria",
    "Tipo",
    "Natureza",
    "Valor original",
    "Valor análise",
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
    t.valorOriginal,
    t.valorAnalise,
    t.anoMes,
    t.diaSemana,
    t.semana,
    t.faixaValor,
    t.fimSemana ? "Sim" : "Não",
  ]);
  const wsDados = XLSX.utils.aoa_to_sheet([dadosHeaders, ...dadosRows]);
  XLSX.utils.book_append_sheet(wb, wsDados, "Dados");

  const resumoMes = [
    ["Ano-Mês", "Mês", "Total Gasto", "Transações"],
    ...months.map((m) => [m.anoMes, m.label, m.total, m.count]),
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

  const out = XLSX.write(wb, { bookType: "xlsx", type: "array" });
  const blob = new Blob([out], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  downloadBlob(blob, fileName);
}
