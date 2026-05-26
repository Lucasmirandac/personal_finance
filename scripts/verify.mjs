// Quick verification script: runs the parse + normalize pipeline against the real CSV
// and prints KPIs. Mirrors the logic the browser uses.
import { readFileSync } from "node:fs";
import { parseCsvText } from "../src/lib/csv.ts";
import { normalizeTransactions } from "../src/lib/normalize.ts";
import { DEFAULT_RULES } from "../src/lib/types.ts";
import { applyFilters, computeKpis } from "../src/lib/aggregations.ts";
import { computePreset } from "../src/lib/datePresets.ts";

const path = process.argv[2];
if (!path) {
  console.error("Usage: node scripts/verify.mjs <csv path>");
  process.exit(1);
}
const text = readFileSync(path, "utf8");
const parsed = parseCsvText(text);
if (!parsed.ok && parsed.raw.length === 0) {
  console.error("Parse failed:", parsed);
  process.exit(1);
}

const norm = normalizeTransactions(parsed.raw, DEFAULT_RULES);
const kpis = computeKpis(norm, norm);

const datasetMax = norm.reduce(
  (m, t) => (t.dataISO && (!m || t.dataISO > m) ? t.dataISO : m),
  null,
);
const last30 = computePreset("last30", datasetMax);
const ytd = computePreset("ytd", datasetMax);
const filtered30 = applyFilters(norm, {
  dateFrom: last30.from,
  dateTo: last30.to,
  categorias: [],
  naturezas: [],
  faixas: [],
  search: "",
});
const filteredYtd = applyFilters(norm, {
  dateFrom: ytd.from,
  dateTo: ytd.to,
  categorias: [],
  naturezas: [],
  faixas: [],
  search: "",
});
const kpis30 = computeKpis(filtered30, norm);
const kpisYtd = computeKpis(filteredYtd, norm);

console.log(JSON.stringify(
  {
    rows: parsed.raw.length,
    errors: parsed.errors.length,
    totalGasto: kpis.totalGasto.toFixed(2),
    countConsumo: kpis.countConsumo,
    countExcluidos: kpis.countExcluidos,
    totalBruto: kpis.totalBruto.toFixed(2),
    ticketMedio: kpis.ticketMedio.toFixed(2),
    maiorCompra: kpis.maiorCompra,
    datasetMax,
    presets: {
      last30: { ...last30, totalGasto: kpis30.totalGasto.toFixed(2), rows: filtered30.length },
      ytd: { ...ytd, totalGasto: kpisYtd.totalGasto.toFixed(2), rows: filteredYtd.length },
    },
  },
  null,
  2,
));
