import Papa from "papaparse";
import { z } from "zod";
import { TransactionRaw } from "./types";

const REQUIRED_HEADERS = [
  "Data",
  "Lançamento",
  "Categoria",
  "Tipo",
  "Valor",
] as const;

export type CsvRowError = {
  row: number;
  reason: string;
};

export type ParseCsvResult = {
  ok: boolean;
  raw: TransactionRaw[];
  errors: CsvRowError[];
  missingColumns: string[];
  totalRows: number;
};

const RowSchema = z.object({
  Data: z.string().min(1),
  Lançamento: z.string().min(1),
  Categoria: z.string().min(1),
  Tipo: z.string().min(1),
  Valor: z.string().min(1),
});

const DATE_RE = /^([0-3]?\d)\/([01]?\d)\/(\d{4})$/;

export function parseBrlValue(input: string): number | null {
  if (!input) return null;
  // Strip currency, spaces, NBSP
  let s = input.trim().replace(/\u00a0/g, " ");
  s = s.replace(/^R\$\s*/i, "");
  s = s.replace(/\s+/g, "");
  // Handle negative formats like "-R$ 10,00", "R$ -10,00", "(R$ 10,00)"
  let negative = false;
  if (s.startsWith("-")) {
    negative = true;
    s = s.slice(1);
  }
  if (s.startsWith("(") && s.endsWith(")")) {
    negative = true;
    s = s.slice(1, -1);
  }
  // brazilian format uses . as thousands and , as decimals
  s = s.replace(/\./g, "").replace(",", ".");
  const n = Number(s);
  if (Number.isNaN(n)) return null;
  return negative ? -n : n;
}

export function parseBrDate(input: string): string | null {
  const m = input.trim().match(DATE_RE);
  if (!m) return null;
  const day = Number(m[1]);
  const month = Number(m[2]);
  const year = Number(m[3]);
  if (month < 1 || month > 12) return null;
  const d = new Date(Date.UTC(year, month - 1, day));
  if (
    d.getUTCFullYear() !== year ||
    d.getUTCMonth() !== month - 1 ||
    d.getUTCDate() !== day
  ) {
    return null;
  }
  return `${year.toString().padStart(4, "0")}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

export async function parseCsvFile(file: File): Promise<ParseCsvResult> {
  const text = await file.text();
  return parseCsvText(text);
}

export function parseCsvText(text: string): ParseCsvResult {
  const result = Papa.parse<Record<string, string>>(text, {
    header: true,
    skipEmptyLines: "greedy",
    transformHeader: (h) => h.trim(),
  });

  const headers = (result.meta.fields ?? []).map((h) => h.trim());
  const missing = REQUIRED_HEADERS.filter((h) => !headers.includes(h));
  if (missing.length > 0) {
    return {
      ok: false,
      raw: [],
      errors: [],
      missingColumns: missing,
      totalRows: 0,
    };
  }

  const errors: CsvRowError[] = [];
  const raw: TransactionRaw[] = [];

  result.data.forEach((rowAny, idx) => {
    const lineNumber = idx + 2; // header is row 1
    const parsed = RowSchema.safeParse(rowAny);
    if (!parsed.success) {
      errors.push({
        row: lineNumber,
        reason: "Linha com colunas obrigatórias vazias",
      });
      return;
    }
    const row = parsed.data;
    const dataISO = parseBrDate(row.Data);
    if (!dataISO) {
      errors.push({
        row: lineNumber,
        reason: `Data inválida: "${row.Data}"`,
      });
      return;
    }
    const valor = parseBrlValue(row.Valor);
    if (valor === null) {
      errors.push({
        row: lineNumber,
        reason: `Valor inválido: "${row.Valor}"`,
      });
      return;
    }
    raw.push({
      data: row.Data.trim(),
      lancamento: row.Lançamento.trim(),
      categoria: row.Categoria.trim(),
      tipo: row.Tipo.trim(),
      valorOriginal: valor,
    });
  });

  return {
    ok: errors.length === 0 && raw.length > 0,
    raw,
    errors,
    missingColumns: [],
    totalRows: result.data.length,
  };
}
