import Papa from "papaparse";
import { z } from "zod";
import { ensureCardAccount } from "./accounts";
import { newSourceId, newTransactionId } from "./ids";
import { Account, Fonte, Source, TransactionRaw } from "./types";

const INTER_HEADERS = [
  "Data",
  "Lançamento",
  "Categoria",
  "Tipo",
  "Valor",
] as const;

const NUBANK_HEADERS = ["date", "title", "amount"] as const;

export type CsvRowError = {
  row: number;
  reason: string;
};

export type ParseCsvResult = {
  ok: boolean;
  source: Source | null;
  errors: CsvRowError[];
  missingColumns: string[];
  totalRows: number;
  detectedFormat: Fonte | null;
};

const InterRowSchema = z.object({
  Data: z.string().min(1),
  Lançamento: z.string().min(1),
  Categoria: z.string().min(1),
  Tipo: z.string().min(1),
  Valor: z.string().min(1),
});

const NubankRowSchema = z.object({
  date: z.string().min(1),
  title: z.string().min(1),
  amount: z.string().min(1),
});

const DATE_BR_RE = /^([0-3]?\d)\/([01]?\d)\/(\d{4})$/;
const DATE_ISO_RE = /^(\d{4})-(\d{2})-(\d{2})$/;

export function detectFormat(headers: string[]): Fonte | null {
  const normalized = headers.map((h) => h.trim());
  const lower = normalized.map((h) => h.toLowerCase());

  const hasInter = INTER_HEADERS.every((h) => normalized.includes(h));
  if (hasInter) return "inter";

  const hasNubank = NUBANK_HEADERS.every((h) => lower.includes(h));
  if (hasNubank) return "nubank";

  return null;
}

export function parseBrlValue(input: string): number | null {
  if (!input) return null;
  let s = input.trim().replace(/\u00a0/g, " ");
  s = s.replace(/^R\$\s*/i, "");
  s = s.replace(/\s+/g, "");
  let negative = false;
  if (s.startsWith("-")) {
    negative = true;
    s = s.slice(1);
  }
  if (s.startsWith("(") && s.endsWith(")")) {
    negative = true;
    s = s.slice(1, -1);
  }
  s = s.replace(/\./g, "").replace(",", ".");
  const n = Number(s);
  if (Number.isNaN(n)) return null;
  return negative ? -n : n;
}

export function parseDotDecimal(input: string): number | null {
  if (!input) return null;
  const s = input.trim().replace(/\s+/g, "");
  const n = Number(s);
  if (Number.isNaN(n)) return null;
  return n;
}

export function parseBrDate(input: string): string | null {
  const m = input.trim().match(DATE_BR_RE);
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

export function parseIsoDate(input: string): string | null {
  const m = input.trim().match(DATE_ISO_RE);
  if (!m) return null;
  const year = Number(m[1]);
  const month = Number(m[2]);
  const day = Number(m[3]);
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

export function isoToBr(iso: string): string {
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
}

function stripBom(text: string): string {
  return text.replace(/^\uFEFF/, "");
}

function mapRowKeys(row: Record<string, string>): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(row)) {
    out[k.trim()] = v;
  }
  return out;
}

function nubankKey(row: Record<string, string>, key: string): string {
  const found = Object.keys(row).find((k) => k.toLowerCase() === key);
  return found ? row[found] : "";
}

export async function parseCsvFile(
  file: File,
  accounts: Account[] = [],
): Promise<ParseCsvResult> {
  const text = await file.text();
  return parseCsvText(text, file.name, accounts);
}

export function parseCsvText(
  text: string,
  fileName = "import.csv",
  accounts: Account[] = [],
): ParseCsvResult {
  const cleaned = stripBom(text);
  const result = Papa.parse<Record<string, string>>(cleaned, {
    header: true,
    skipEmptyLines: "greedy",
    transformHeader: (h) => h.trim(),
  });

  const headers = (result.meta.fields ?? []).map((h) => h.trim());
  const format = detectFormat(headers);

  if (!format) {
    return {
      ok: false,
      source: null,
      errors: [],
      missingColumns: [
        "Formato não reconhecido. Use Inter (Data, Lançamento, Categoria, Tipo, Valor) ou Nubank (date, title, amount).",
      ],
      totalRows: 0,
      detectedFormat: null,
    };
  }

  const sourceId = newSourceId();
  const errors: CsvRowError[] = [];
  const raw: TransactionRaw[] = [];

  if (format === "inter") {
    result.data.forEach((rowAny, idx) => {
      const lineNumber = idx + 2;
      const row = mapRowKeys(rowAny);
      const parsed = InterRowSchema.safeParse(row);
      if (!parsed.success) {
        errors.push({
          row: lineNumber,
          reason: "Linha com colunas obrigatórias vazias",
        });
        return;
      }
      const r = parsed.data;
      const dataISO = parseBrDate(r.Data);
      if (!dataISO) {
        errors.push({
          row: lineNumber,
          reason: `Data inválida: "${r.Data}"`,
        });
        return;
      }
      const valor = parseBrlValue(r.Valor);
      if (valor === null) {
        errors.push({
          row: lineNumber,
          reason: `Valor inválido: "${r.Valor}"`,
        });
        return;
      }
      raw.push({
        id: newTransactionId(),
        data: r.Data.trim(),
        lancamento: r.Lançamento.trim(),
        categoria: r.Categoria.trim(),
        tipo: r.Tipo.trim(),
        valorOriginal: valor,
        fonte: "inter",
        sourceId,
      });
    });
  } else {
    result.data.forEach((rowAny, idx) => {
      const lineNumber = idx + 2;
      const row = mapRowKeys(rowAny);
      const nubankRow = {
        date: nubankKey(row, "date"),
        title: nubankKey(row, "title"),
        amount: nubankKey(row, "amount"),
      };
      const parsed = NubankRowSchema.safeParse(nubankRow);
      if (!parsed.success) {
        errors.push({
          row: lineNumber,
          reason: "Linha com colunas obrigatórias vazias",
        });
        return;
      }
      const r = parsed.data;
      const dataISO = parseIsoDate(r.date);
      if (!dataISO) {
        errors.push({
          row: lineNumber,
          reason: `Data inválida: "${r.date}"`,
        });
        return;
      }
      const valor = parseDotDecimal(r.amount);
      if (valor === null) {
        errors.push({
          row: lineNumber,
          reason: `Valor inválido: "${r.amount}"`,
        });
        return;
      }
      raw.push({
        id: newTransactionId(),
        data: isoToBr(dataISO),
        lancamento: r.title.trim(),
        categoria: "",
        tipo: "Compra",
        valorOriginal: valor,
        fonte: "nubank",
        sourceId,
      });
    });
  }

  let accountId: string | undefined;
  if (format === "inter" || format === "nubank") {
    const ensured = ensureCardAccount(accounts, format);
    accountId = ensured.account.id;
    for (let i = 0; i < raw.length; i++) {
      raw[i] = { ...raw[i], accountId };
    }
  }

  const source: Source = {
    id: sourceId,
    fileName,
    fonte: format,
    importedAt: new Date().toISOString(),
    rowsRaw: raw.length,
    raw,
  };

  return {
    ok: errors.length === 0 && raw.length > 0,
    source,
    errors,
    missingColumns: [],
    totalRows: result.data.length,
    detectedFormat: format,
  };
}
