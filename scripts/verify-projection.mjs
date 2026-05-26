/**
 * Smoke tests for projection cycle logic.
 * Run: node scripts/verify-projection.mjs
 */

function daysInMonth(year, month) {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

function clampDay(year, month, day) {
  return Math.min(Math.max(1, day), daysInMonth(year, month));
}

function isoFromParts(year, month, day) {
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function addMonths(year, month, delta) {
  let m = month + delta;
  let y = year;
  while (m > 12) {
    m -= 12;
    y += 1;
  }
  while (m < 1) {
    m += 12;
    y -= 1;
  }
  return [y, m];
}

function cycleFor(dataISO, config) {
  const [y, m, d] = dataISO.split("-").map(Number);
  const monthsAfter = d <= config.diaFechamento ? 1 : 2;
  const [py, pm] = addMonths(y, m, monthsAfter);
  const payDay = clampDay(py, pm, config.diaPagamento);
  return isoFromParts(py, pm, payDay);
}

const cfg = { diaFechamento: 10, diaPagamento: 20 };

const t1 = cycleFor("2026-01-05", cfg);
const t2 = cycleFor("2026-01-15", cfg);

console.assert(t1 === "2026-02-20", `Jan 5 -> Feb 20, got ${t1}`);
console.assert(t2 === "2026-03-20", `Jan 15 -> Mar 20, got ${t2}`);

// Feb 29 clamp: payment day 31 in Feb
const t3 = cycleFor("2026-01-08", { diaFechamento: 10, diaPagamento: 31 });
console.assert(t3 === "2026-02-28", `Feb clamp, got ${t3}`);

console.log("verify-projection: OK");
