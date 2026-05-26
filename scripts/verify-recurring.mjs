import { readFileSync } from "node:fs";
import { parseCsvText } from "../src/lib/csv.ts";
import { normalizeTransactions } from "../src/lib/normalize.ts";
import { DEFAULT_RULES } from "../src/lib/types.ts";
import { computeKpis } from "../src/lib/aggregations.ts";
import { expandRecurringRules } from "../src/lib/recurring.ts";

const interPath =
  process.argv[2] ??
  "/Users/lucascosta/Downloads/fatura_janeiro_ate_agora.csv";

const text = readFileSync(interPath, "utf8");
const inter = parseCsvText(text, "fatura.csv");

const recurring = [
  {
    id: "aluguel",
    kind: "despesa_fixa",
    descricao: "Aluguel",
    categoria: "MORADIA",
    valor: 2000,
    diaMes: 5,
    inicio: "2026-01-01",
    fim: null,
    ativo: true,
    criadoEm: new Date().toISOString(),
  },
  {
    id: "salario",
    kind: "receita",
    descricao: "Salário",
    categoria: "SALARIO",
    valor: 5000,
    diaMes: 5,
    inicio: "2026-01-01",
    fim: null,
    ativo: true,
    criadoEm: new Date().toISOString(),
  },
];

const today = new Date("2026-05-25T12:00:00Z");
const manual = expandRecurringRules(recurring, today);
const allRaw = [...(inter.source?.raw ?? []), ...manual];
const norm = normalizeTransactions(allRaw, DEFAULT_RULES);
const kpis = computeKpis(norm, norm);

const aluguelOcc = manual.filter((r) => r.lancamento === "Aluguel").length;
const salarioOcc = manual.filter((r) => r.lancamento === "Salário").length;

console.log(
  JSON.stringify(
    {
      interRows: inter.source?.raw.length,
      aluguelOccurrences: aluguelOcc,
      salarioOccurrences: salarioOcc,
      totalReceitas: kpis.totalReceitas.toFixed(2),
      totalDespesas: kpis.totalDespesas.toFixed(2),
      saldo: kpis.saldo.toFixed(2),
      expected: {
        receitas: "25000.00",
        despesas: "31856.55",
        saldo: "-6856.55",
        aluguelOcc: 5,
        salarioOcc: 5,
      },
    },
    null,
    2,
  ),
);
