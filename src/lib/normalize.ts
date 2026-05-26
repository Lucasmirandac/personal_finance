import {
  Natureza,
  Rules,
  TransactionNormalized,
  TransactionRaw,
} from "./types";
import { parseBrDate } from "./csv";
import { formatMonthLabel } from "./format";

const WEEKDAYS_PT = [
  "Domingo",
  "Segunda",
  "Terça",
  "Quarta",
  "Quinta",
  "Sexta",
  "Sábado",
];

const FAIXAS: Array<{ label: string; min: number; max: number }> = [
  { label: "Até R$ 25", min: 0, max: 25 },
  { label: "R$ 25-50", min: 25, max: 50 },
  { label: "R$ 50-100", min: 50, max: 100 },
  { label: "R$ 100-250", min: 100, max: 250 },
  { label: "R$ 250-500", min: 250, max: 500 },
  { label: "R$ 500-1.000", min: 500, max: 1000 },
  { label: "R$ 1.000+", min: 1000, max: Infinity },
];

export const FAIXA_LABELS = FAIXAS.map((f) => f.label);

function faixaFor(value: number): string {
  const v = Math.abs(value);
  for (const f of FAIXAS) {
    if (v >= f.min && v < f.max) return f.label;
  }
  return FAIXAS[FAIXAS.length - 1].label;
}

function stripDiacritics(s: string): string {
  return s.normalize("NFD").replace(/\p{Diacritic}/gu, "");
}

function normalizePattern(p: string): string {
  return stripDiacritics(p).toUpperCase().trim();
}

function isoWeek(dataISO: string): string {
  const [y, m, d] = dataISO.split("-").map(Number);
  const date = new Date(Date.UTC(y, m - 1, d));
  const day = date.getUTCDay() || 7; // 1..7, Sun=7
  date.setUTCDate(date.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
  const weekNo =
    Math.ceil(((date.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  return `${date.getUTCFullYear()}-W${String(weekNo).padStart(2, "0")}`;
}

/** Best-effort merchant name normalization: removes location suffix, trims, title-cases brand-ish tokens. */
export function extractEstabelecimento(lancamento: string): string {
  let s = lancamento.trim();
  // Collapse internal whitespace
  s = s.replace(/\s{2,}/g, " ");
  // Strip frequent country suffix "BRA"
  s = s.replace(/\s+BRA$/i, "").trim();
  // Strip well-known city patterns at the end (SAO PAULO, BELO HORIZONTE, etc.)
  s = s.replace(
    /\s+(SAO PAULO|BELO HORIZONT(E)?|RIO DE JANEIRO|CURITIBA|BRASILIA|GUARAPARI|CONTAGEM|SANTO ANDR(E|É)?|FORTALEZA|RECIFE|MANAUS|PORTO ALEGRE|SALVADOR|GOIANIA|VITORIA)$/i,
    "",
  );
  s = s.trim();
  return s.length > 0 ? s : lancamento.trim();
}

export function classifyNatureza(
  raw: TransactionRaw,
  rules: Rules,
): { natureza: Natureza; valorAnalise: number } {
  const lancNorm = normalizePattern(raw.lancamento);
  const matchesPayment = rules.pagamentoPatterns
    .filter((p) => p.trim().length > 0)
    .some((p) => lancNorm.includes(normalizePattern(p)));

  if (matchesPayment) {
    return { natureza: "Pagamento de fatura", valorAnalise: 0 };
  }

  const isNegative = raw.valorOriginal < 0;
  const matchesEstorno = rules.estornoPatterns
    .filter((p) => p.trim().length > 0)
    .some((p) => lancNorm.includes(normalizePattern(p)));

  if (isNegative || matchesEstorno) {
    return { natureza: "Estorno / crédito", valorAnalise: 0 };
  }

  return { natureza: "Gasto", valorAnalise: raw.valorOriginal };
}

export function normalizeTransactions(
  raws: TransactionRaw[],
  rules: Rules,
): TransactionNormalized[] {
  return raws.map((raw, idx) => {
    const dataISO = parseBrDate(raw.data) ?? "";
    const [y, m, d] = dataISO.split("-").map(Number);
    const dateObj = dataISO ? new Date(Date.UTC(y, m - 1, d)) : new Date(0);
    const diaSemanaIndex = dateObj.getUTCDay();
    const diaSemana = WEEKDAYS_PT[diaSemanaIndex];
    const anoMes = dataISO ? `${y}-${String(m).padStart(2, "0")}` : "";
    const mesLabel = formatMonthLabel(anoMes);
    const { natureza, valorAnalise } = classifyNatureza(raw, rules);
    return {
      ...raw,
      id: `${dataISO}-${idx}`,
      estabelecimento: extractEstabelecimento(raw.lancamento),
      valorAnalise,
      natureza,
      ajuste: natureza !== "Gasto",
      dataISO,
      mes: m ?? 0,
      ano: y ?? 0,
      anoMes,
      mesLabel,
      diaSemana,
      diaSemanaIndex,
      semana: dataISO ? isoWeek(dataISO) : "",
      faixaValor: faixaFor(raw.valorOriginal),
      fimSemana: diaSemanaIndex === 0 || diaSemanaIndex === 6,
    };
  });
}
