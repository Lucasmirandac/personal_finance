export function todayIso(): string {
  const t = new Date()
  return isoFromParts(t.getUTCFullYear(), t.getUTCMonth() + 1, t.getUTCDate())
}

export function parseIso(iso: string): [number, number, number] {
  const [y, m, d] = iso.split("-").map(Number)
  return [y, m, d]
}

export function isoFromParts(year: number, month: number, day: number): string {
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`
}

export function addMonthsYyyyMm(yyyyMm: string, delta: number): string {
  const [y, m] = yyyyMm.split("-").map(Number)
  let month = m + delta
  let year = y
  while (month > 12) {
    month -= 12
    year += 1
  }
  while (month < 1) {
    month += 12
    year -= 1
  }
  return `${year}-${String(month).padStart(2, "0")}`
}

export function yyyyMmFromIso(iso: string): string {
  return iso.slice(0, 7)
}

export function yesterdayIso(): string {
  const d = new Date()
  d.setUTCDate(d.getUTCDate() - 1)
  return isoFromParts(d.getUTCFullYear(), d.getUTCMonth() + 1, d.getUTCDate())
}
