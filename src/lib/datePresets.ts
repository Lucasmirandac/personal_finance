export type DatePresetId =
  | "all"
  | "last7"
  | "last30"
  | "last90"
  | "currentMonth"
  | "previousMonth"
  | "ytd";

export type DateRange = {
  from: string | null;
  to: string | null;
};

export const DATE_PRESETS: Array<{ id: DatePresetId; label: string }> = [
  { id: "all", label: "Tudo" },
  { id: "last7", label: "Últimos 7 dias" },
  { id: "last30", label: "Últimos 30 dias" },
  { id: "last90", label: "Últimos 90 dias" },
  { id: "currentMonth", label: "Mês atual" },
  { id: "previousMonth", label: "Mês anterior" },
  { id: "ytd", label: "YTD" },
];

function toIso(d: Date): string {
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function parseIso(iso: string): Date {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d));
}

function addDays(iso: string, days: number): string {
  const d = parseIso(iso);
  d.setUTCDate(d.getUTCDate() + days);
  return toIso(d);
}

function startOfMonth(iso: string): string {
  const [y, m] = iso.split("-").map(Number);
  return `${y}-${String(m).padStart(2, "0")}-01`;
}

function endOfMonth(iso: string): string {
  const [y, m] = iso.split("-").map(Number);
  const last = new Date(Date.UTC(y, m, 0));
  return toIso(last);
}

/** Presets anchored to datasetMax (latest transaction date in the dataset). */
export function computePreset(
  preset: DatePresetId,
  datasetMax: string,
): DateRange {
  if (preset === "all") {
    return { from: null, to: null };
  }

  const max = datasetMax;

  switch (preset) {
    case "last7":
      return { from: addDays(max, -6), to: max };
    case "last30":
      return { from: addDays(max, -29), to: max };
    case "last90":
      return { from: addDays(max, -89), to: max };
    case "currentMonth":
      return { from: startOfMonth(max), to: max };
    case "previousMonth": {
      const firstOfCurrent = startOfMonth(max);
      const lastPrev = addDays(firstOfCurrent, -1);
      return { from: startOfMonth(lastPrev), to: endOfMonth(lastPrev) };
    }
    case "ytd": {
      const year = max.split("-")[0];
      return { from: `${year}-01-01`, to: max };
    }
    default: {
      const _exhaustive: never = preset;
      throw new Error(`Unexpected preset: ${_exhaustive}`);
    }
  }
}

export function normalizeDateRange(
  from: string | null,
  to: string | null,
): DateRange {
  if (!from && !to) return { from: null, to: null };
  if (from && to && from > to) return { from: to, to: from };
  return { from, to };
}
