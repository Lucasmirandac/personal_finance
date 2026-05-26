// Quick verification script: runs the parse + normalize pipeline against CSVs
import { readFileSync } from "node:fs";
import { parseCsvText } from "../src/lib/csv.ts";
import { normalizeTransactions } from "../src/lib/normalize.ts";
import { DEFAULT_RULES } from "../src/lib/types.ts";
import { computeKpis } from "../src/lib/aggregations.ts";

function loadSource(path) {
  const text = readFileSync(path, "utf8");
  const fileName = path.split("/").pop() ?? path;
  const parsed = parseCsvText(text, fileName);
  if (!parsed.source || parsed.source.raw.length === 0) {
    throw new Error(`Parse failed for ${path}: ${JSON.stringify(parsed)}`);
  }
  return parsed;
}

const interPath =
  process.argv[2] ?? "/Users/lucascosta/Downloads/fatura_janeiro_ate_agora.csv";
const nubankPath =
  process.argv[3] ?? "/Users/lucascosta/Downloads/Nubank_2026-05-12.csv";

const inter = loadSource(interPath);
const nubank = loadSource(nubankPath);

const interOnly = normalizeTransactions(inter.source.raw, DEFAULT_RULES);
const combined = normalizeTransactions(
  [...inter.source.raw, ...nubank.source.raw],
  DEFAULT_RULES,
);

const kpisInter = computeKpis(interOnly, interOnly);
const kpisCombined = computeKpis(combined, combined);

console.log(
  JSON.stringify(
    {
      inter: {
        file: inter.source.fileName,
        format: inter.detectedFormat,
        rows: inter.source.raw.length,
        totalGasto: kpisInter.totalGasto.toFixed(2),
        countConsumo: kpisInter.countConsumo,
        countExcluidos: kpisInter.countExcluidos,
      },
      nubank: {
        file: nubank.source.fileName,
        format: nubank.detectedFormat,
        rows: nubank.source.raw.length,
      },
      combined: {
        rows: combined.length,
        totalGasto: kpisCombined.totalGasto.toFixed(2),
        countConsumo: kpisCombined.countConsumo,
        deltaGasto: (
          kpisCombined.totalGasto - kpisInter.totalGasto
        ).toFixed(2),
      },
    },
    null,
    2,
  ),
);
