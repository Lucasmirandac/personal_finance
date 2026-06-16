import Papa from "papaparse";
import { z } from "zod";
import {
  ensureCardAccount,
  findCardAccountByFonte,
  hasCardCycleConfigured,
} from "./accounts";
import { addMonthsIso } from "./dates";
import { newSourceId, newTransactionId } from "./ids";
import { Account, Fonte, InstallmentInfo, Source, TransactionRaw } from "./types";

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

export function detectFormatFromText(text: string): Fonte | null {
  const cleaned = stripBom(text);
  const result = Papa.parse<Record<string, string>>(cleaned, {
    header: true,
    skipEmptyLines: "greedy",
    transformHeader: (h) => h.trim(),
    preview: 1,
  });
  const headers = (result.meta.fields ?? []).map((h) => h.trim());
  return detectFormat(headers);
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

const INTER_INSTALLMENT_TIPO_RE = /^Parcela\s+(\d+)\s*\/\s*(\d+)\s*$/i;
const COMPRA_SUFFIX_RE = /\s*\(compra\s+\d{2}\/\d{2}\/\d{4}\)\s*$/i;

function normalizeInstallmentLancamento(lancamento: string): string {
  return lancamento.replace(COMPRA_SUFFIX_RE, "").trim().toLowerCase();
}

function buildPlanInstallmentSlotKey(
  raw: Pick<TransactionRaw, "fonte" | "categoria" | "lancamento">,
  current: number,
  total: number,
): string {
  return `${raw.fonte}|${normalizeInstallmentLancamento(raw.lancamento)}|${raw.categoria.trim().toLowerCase()}|${total}|${current}`;
}

export function parseInterInstallmentTipo(
  tipo: string,
): { current: number; total: number } | null {
  const match = tipo.trim().match(INTER_INSTALLMENT_TIPO_RE);
  if (!match) return null;
  const current = Number(match[1]);
  const total = Number(match[2]);
  if (!Number.isFinite(current) || !Number.isFinite(total)) return null;
  if (current < 1 || total < 1 || current > total) return null;
  return { current, total };
}

export function isInterInstallmentTipo(tipo: string): boolean {
  return parseInterInstallmentTipo(tipo) !== null;
}

export function buildInstallmentGroupKey(
  raw: Pick<TransactionRaw, "fonte" | "lancamento" | "categoria" | "valorOriginal">,
  purchaseDate: string,
  total: number,
): string {
  const baseLancamento = raw.lancamento
    .replace(COMPRA_SUFFIX_RE, "")
    .trim()
    .toLowerCase();
  return `${raw.fonte}|${purchaseDate}|${baseLancamento}|${raw.categoria}|${raw.valorOriginal}|${total}`;
}

function attachInstallmentInfo(
  raw: TransactionRaw,
  current: number,
  total: number,
  purchaseDate: string,
  estimated: boolean,
): TransactionRaw {
  const groupKey = buildInstallmentGroupKey(raw, purchaseDate, total);
  const installment: InstallmentInfo = {
    current,
    total,
    purchaseDate,
    groupKey,
    estimated,
  };
  return { ...raw, installment };
}

function addMonthsToAnoMes(anoMes: string, months: number): string {
  const [y, m] = anoMes.split("-").map(Number);
  const date = new Date(Date.UTC(y, m - 1 + months, 1));
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
}

function lastDayOfAnoMes(anoMes: string): number {
  const [y, m] = anoMes.split("-").map(Number);
  return new Date(Date.UTC(y, m, 0)).getUTCDate();
}

export function inferInvoiceAnoMes(
  dates: string[],
  diaFechamento?: number,
): string | null {
  if (dates.length === 0) return null;

  const maxDate = dates.reduce((max, iso) => (iso > max ? iso : max));
  const [year, month, day] = maxDate.split("-").map(Number);
  const baseAnoMes = `${year}-${String(month).padStart(2, "0")}`;

  if (diaFechamento === undefined) {
    return addMonthsToAnoMes(baseAnoMes, 1);
  }

  const monthsToAdd = day <= diaFechamento ? 1 : 2;
  return addMonthsToAnoMes(baseAnoMes, monthsToAdd);
}

export function rewriteInstallmentRow(
  raw: TransactionRaw,
  invoiceAnoMes: string,
  diaPagamento?: number,
): TransactionRaw {
  const originalData = raw.data.trim();
  const paymentDay = Math.min(
    Math.max(diaPagamento ?? 1, 1),
    lastDayOfAnoMes(invoiceAnoMes),
  );
  const [year, month] = invoiceAnoMes.split("-");
  const invoiceData = `${String(paymentDay).padStart(2, "0")}/${month}/${year}`;

  const lancamento = COMPRA_SUFFIX_RE.test(raw.lancamento)
    ? raw.lancamento.trim()
    : `${raw.lancamento.trim()} (compra ${originalData})`;

  return {
    ...raw,
    data: invoiceData,
    lancamento,
  };
}

function collectRealInstallmentSlotsFromCsv(raw: TransactionRaw[]): Set<string> {
  const slots = new Set<string>();
  for (const row of raw) {
    const parsed = parseInterInstallmentTipo(row.tipo);
    if (!parsed) continue;
    slots.add(
      buildPlanInstallmentSlotKey(row, parsed.current, parsed.total),
    );
  }
  return slots;
}

function applyInterInstallmentRewrites(
  raw: TransactionRaw[],
  cardAccount: Account,
): void {
  const nonInstallmentISOs = raw
    .filter((row) => !isInterInstallmentTipo(row.tipo))
    .map((row) => parseBrDate(row.data))
    .filter((iso): iso is string => iso !== null);

  const invoiceAnoMes = inferInvoiceAnoMes(
    nonInstallmentISOs,
    cardAccount.diaFechamento,
  );
  if (!invoiceAnoMes) return;

  const realSlotsInCsv = collectRealInstallmentSlotsFromCsv(raw);
  const addedEstimateSlots = new Set<string>();
  const extras: TransactionRaw[] = [];

  for (let i = 0; i < raw.length; i++) {
    const parsed = parseInterInstallmentTipo(raw[i].tipo);
    if (!parsed) continue;

    const purchaseDate = raw[i].data.trim();
    const rewritten = rewriteInstallmentRow(
      raw[i],
      invoiceAnoMes,
      cardAccount.diaPagamento,
    );
    raw[i] = attachInstallmentInfo(
      rewritten,
      parsed.current,
      parsed.total,
      purchaseDate,
      false,
    );
  }

  for (let i = 0; i < raw.length; i++) {
    const parsed = parseInterInstallmentTipo(raw[i].tipo);
    if (!parsed || parsed.current >= parsed.total) continue;

    const purchaseDate = raw[i].installment?.purchaseDate ?? raw[i].data.trim();
    const currentPayIso = parseBrDate(raw[i].data);
    if (!currentPayIso) continue;

    for (let n = parsed.current + 1; n <= parsed.total; n += 1) {
      const slotKey = buildPlanInstallmentSlotKey(raw[i], n, parsed.total);
      if (realSlotsInCsv.has(slotKey) || addedEstimateSlots.has(slotKey)) {
        continue;
      }
      addedEstimateSlots.add(slotKey);

      const monthsAhead = n - parsed.current;
      const futureIso = addMonthsIso(currentPayIso, monthsAhead);
      extras.push(
        attachInstallmentInfo(
          {
            ...raw[i],
            id: newTransactionId(),
            data: isoToBr(futureIso),
            tipo: `Parcela ${n}/${parsed.total}`,
          },
          n,
          parsed.total,
          purchaseDate,
          true,
        ),
      );
    }
  }

  raw.push(...extras);
}

function stripCompraSuffix(lancamento: string): string {
  return lancamento.replace(COMPRA_SUFFIX_RE, "").trim();
}

function purchaseDateForInstallmentRow(row: TransactionRaw): string | null {
  if (row.installment?.purchaseDate) return row.installment.purchaseDate;
  const match = row.lancamento.match(/\(compra\s+(\d{2}\/\d{2}\/\d{4})\)/i);
  return match?.[1] ?? null;
}

/** Re-run Inter installment date logic after card cycle changes. */
export function reapplyInterCycleToSource(
  source: Source,
  cardAccount: Account,
): Source {
  if (source.fonte !== "inter" || !hasCardCycleConfigured(cardAccount)) {
    return source;
  }

  const raw: TransactionRaw[] = [];
  for (const row of source.raw) {
    if (row.installment?.estimated) continue;
    if (!isInterInstallmentTipo(row.tipo)) {
      raw.push(row);
      continue;
    }
    const purchaseDate = purchaseDateForInstallmentRow(row);
    if (!purchaseDate) {
      raw.push(row);
      continue;
    }
    raw.push({
      ...row,
      data: purchaseDate,
      lancamento: stripCompraSuffix(row.lancamento),
      installment: undefined,
    });
  }

  applyInterInstallmentRewrites(raw, cardAccount);
  return { ...source, raw, rowsRaw: raw.length };
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
    const interCard = findCardAccountByFonte(accounts, "inter");

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

    if (interCard && hasCardCycleConfigured(interCard)) {
      applyInterInstallmentRewrites(raw, interCard);
    }
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
    accountId =
      findCardAccountByFonte(accounts, format)?.id ??
      ensureCardAccount(accounts, format).account.id;
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
