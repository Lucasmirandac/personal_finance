const BRL = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

const BRL_COMPACT = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
  notation: "compact",
  maximumFractionDigits: 1,
});

const INT = new Intl.NumberFormat("pt-BR");

export function formatBRL(value: number | null | undefined): string {
  if (value == null || Number.isNaN(value)) return "—";
  return BRL.format(value);
}

export function formatBRLCompact(value: number | null | undefined): string {
  if (value == null || Number.isNaN(value)) return "—";
  return BRL_COMPACT.format(value);
}

export function formatInt(value: number | null | undefined): string {
  if (value == null || Number.isNaN(value)) return "—";
  return INT.format(value);
}

export function formatPercent(value: number, digits = 1): string {
  if (Number.isNaN(value) || !Number.isFinite(value)) return "—";
  return `${value.toFixed(digits).replace(".", ",")}%`;
}

export function formatDateBR(iso: string): string {
  if (!iso) return "";
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
}

const MONTH_LABELS = [
  "Jan",
  "Fev",
  "Mar",
  "Abr",
  "Mai",
  "Jun",
  "Jul",
  "Ago",
  "Set",
  "Out",
  "Nov",
  "Dez",
];

export function formatMonthLabel(anoMes: string): string {
  const [y, m] = anoMes.split("-").map(Number);
  if (!y || !m) return anoMes;
  return `${MONTH_LABELS[m - 1]}/${String(y).slice(-2)}`;
}
