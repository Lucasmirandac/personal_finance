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

/** Compact axis ticks without currency symbol (e.g. 4,5K, -2,8M). */
export function formatBRLAxis(value: number | null | undefined): string {
  if (value == null || Number.isNaN(value)) return "—";
  const abs = Math.abs(value);
  const sign = value < 0 ? "-" : "";
  if (abs >= 1_000_000) {
    return `${sign}${(abs / 1_000_000).toLocaleString("pt-BR", {
      maximumFractionDigits: 1,
    })}M`;
  }
  if (abs >= 1_000) {
    return `${sign}${(abs / 1_000).toLocaleString("pt-BR", {
      maximumFractionDigits: 1,
    })}K`;
  }
  return `${sign}${Math.round(abs)}`;
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

/** Caption for active date range filter, e.g. "12/03/2026 – 26/05/2026 · 76 dias" */
export function formatDateRangeCaption(
  from: string | null,
  to: string | null,
): string | null {
  if (!from && !to) return null;
  const start = from ?? to!;
  const end = to ?? from!;
  const days = daysBetweenInclusive(start, end);
  const range =
    from && to
      ? `${formatDateBR(from)} – ${formatDateBR(to)}`
      : from
        ? `desde ${formatDateBR(from)}`
        : `até ${formatDateBR(to!)}`;
  return days > 0 ? `${range} · ${days} dias` : range;
}

function daysBetweenInclusive(fromIso: string, toIso: string): number {
  const [y1, m1, d1] = fromIso.split("-").map(Number);
  const [y2, m2, d2] = toIso.split("-").map(Number);
  const a = Date.UTC(y1, m1 - 1, d1);
  const b = Date.UTC(y2, m2 - 1, d2);
  if (b < a) return 0;
  return Math.floor((b - a) / 86400000) + 1;
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
