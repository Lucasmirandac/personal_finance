import { addMonthsIso } from "./dates";

export const MAX_PARCELAS = 24;

export function splitInstallments(total: number, parcelas: number): number[] {
  const n = Math.max(1, Math.min(MAX_PARCELAS, Math.round(parcelas)));
  const base = Math.round((total / n) * 100) / 100;
  const out: number[] = [];
  let sum = 0;
  for (let i = 0; i < n - 1; i += 1) {
    out.push(base);
    sum += base;
  }
  out.push(Math.round((total - sum) * 100) / 100);
  return out;
}

export function buildInstallmentDates(
  dataIso: string,
  parcelas: number,
): string[] {
  const n = Math.max(1, Math.min(MAX_PARCELAS, Math.round(parcelas)));
  return Array.from({ length: n }, (_, i) => addMonthsIso(dataIso, i));
}

export function formatInstallmentLancamento(
  desc: string,
  i: number,
  n: number,
): string {
  if (n <= 1) return desc;
  return `${desc} (${i + 1}/${n})`;
}
