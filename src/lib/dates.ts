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

function daysInMonth(year: number, month: number): number {
  return new Date(Date.UTC(year, month, 0)).getUTCDate()
}

function clampDay(year: number, month: number, day: number): number {
  return Math.min(Math.max(1, day), daysInMonth(year, month))
}

export function addMonthsIso(iso: string, delta: number): string {
  const [y, m, d] = parseIso(iso)
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
  return isoFromParts(year, month, clampDay(year, month, d))
}

export function yesterdayIso(): string {
  const d = new Date()
  d.setUTCDate(d.getUTCDate() - 1)
  return isoFromParts(d.getUTCFullYear(), d.getUTCMonth() + 1, d.getUTCDate())
}
