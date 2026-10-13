import {
  defaultAccount,
  findCardAccountByFonte,
} from "./accounts";
import { isoToBr, parseBrDate, parseBrlValue, parseIsoDate } from "./csv";
import { addMonthsIso, isoFromParts, todayIso, yyyyMmFromIso } from "./dates";
import {
  isRecurringRaw,
  recurringIncomeRawId,
  type TransactionEditPatch,
} from "./edits";
import { MAX_PARCELAS } from "./installments";
import { isManualQuickRaw } from "./manualTransactions";
import { newRecurringId } from "./recurring";
import {
  budgetCategoryKey,
  budgetStatus,
  budgetUsageForMonth,
  normalizeBudgetCategory,
  spendingByCategoryForMonth,
} from "./budgets";
import type {
  Account,
  CategoryBudget,
  ManualTransaction,
  PaymentStatus,
  RecurringRule,
  TransactionNormalized,
} from "./types";

export type SheetKind = "fixo" | "parcela" | "corrente";

export type SheetParcela = {
  current: number;
  total: number;
};

export type ParsedSheetRow = {
  kind: SheetKind;
  descricao: string;
  pago: boolean;
  dataIso: string;
  dataUsedDefault: boolean;
  tipoLabel: string;
  categoria: string;
  valor: number | null;
  parcela: SheetParcela | null;
  accountId: string | null;
  issues: SheetRowIssue[];
};

export type SheetRowIssue =
  | "missing_description"
  | "missing_value"
  | "unmapped_account"
  | "date_defaulted";

export type ParseSheetResult = {
  rows: ParsedSheetRow[];
  skippedSectionRows: number;
};

export type MonthCategoryRow = {
  categoria: string;
  orcado: number;
  realizado: number;
  percentual: number;
  status: "ok" | "warning" | "danger";
};

const SECTION_TITLE_RE =
  /^(total de gastos|total de gastos fixos|parceladinhos|gastos correntes|gastos por categoria|total)$/i;

function stripDiacritics(s: string): string {
  return s.normalize("NFD").replace(/\p{Diacritic}/gu, "");
}

function normHeader(s: string): string {
  return stripDiacritics(s).toLowerCase().trim();
}

function daysInMonth(year: number, month: number): number {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

function clampDay(year: number, month: number, day: number): number {
  return Math.min(Math.max(1, day), daysInMonth(year, month));
}

export function defaultDateForMonth(
  anoMes: string,
  today: string = todayIso(),
): string {
  if (yyyyMmFromIso(today) === anoMes) return today;
  return `${anoMes}-01`;
}

export function parseParcelaText(input: string): SheetParcela | null {
  const s = input.trim();
  if (!s) return null;
  const slash = s.match(/(?:parcela\s*)?(\d+)\s*\/\s*(\d+)/i);
  const de = s.match(/parcela\s+(\d+)\s+de\s+(\d+)/i);
  const match = de ?? slash;
  if (!match) return null;
  const current = Number(match[1]);
  const total = Number(match[2]);
  if (!Number.isFinite(current) || !Number.isFinite(total)) return null;
  if (current < 1 || total < 1 || current > total) return null;
  return { current, total };
}

export function installmentRef(
  tx: Pick<TransactionNormalized, "installment" | "tipo" | "lancamento">,
): SheetParcela | null {
  if (tx.installment) {
    return { current: tx.installment.current, total: tx.installment.total };
  }
  return parseParcelaText(tx.tipo) ?? parseParcelaText(tx.lancamento);
}

export function isInstallmentLike(
  tx: Pick<TransactionNormalized, "installment" | "tipo" | "lancamento">,
): boolean {
  return installmentRef(tx) != null;
}

function dropLeadingEmpty(cells: string[]): string[] {
  const start = cells.findIndex((c) => c.trim() !== "");
  if (start === -1) return [];
  return cells.slice(start);
}

function splitRow(line: string): string[] {
  if (line.includes("\t")) return line.split("\t").map((c) => c.trim());
  return [line.trim()];
}

function colIndex(headers: string[], ...aliases: string[]): number {
  const hs = headers.map(normHeader);
  for (const alias of aliases) {
    const key = normHeader(alias);
    const exact = hs.findIndex((h) => h === key);
    if (exact >= 0) return exact;
  }
  for (const alias of aliases) {
    const key = normHeader(alias);
    const partial = hs.findIndex((h) => h.includes(key));
    if (partial >= 0) return partial;
  }
  return -1;
}

function headerKind(
  cells: string[],
): "fixo" | "parcela" | "corrente" | "orcamento" | "skip" | null {
  const joined = cells.map(normHeader).filter(Boolean).join(" ");
  if (!joined) return null;
  if (SECTION_TITLE_RE.test(joined) || /^(inter|nubank|debito)\s/.test(joined)) {
    return "skip";
  }
  const hasNome = cells.some((c) => normHeader(c) === "nome");
  const hasPago = cells.some((c) => normHeader(c) === "pago");
  const hasDesc = cells.some((c) => {
    const h = normHeader(c);
    return h === "descricao" || h === "descrição";
  });
  const hasParcelas = cells.some((c) => normHeader(c).startsWith("parcela"));
  const hasOrcado = cells.some((c) => {
    const h = normHeader(c);
    return h === "orcado" || h === "orçado" || h === "realizado";
  });
  if (hasOrcado && cells.some((c) => normHeader(c) === "categoria")) return "orcamento";
  if (hasNome && hasPago) return "fixo";
  if (hasDesc && hasParcelas) return "parcela";
  if (hasDesc && cells.some((c) => normHeader(c) === "categoria")) return "corrente";
  return null;
}

export function parseSheetDate(
  input: string,
  anoMes: string,
): string | null {
  const s = input.trim();
  if (!s) return null;
  const full = parseBrDate(s) ?? parseIsoDate(s);
  if (full) return full;
  const md = s.match(/^([0-3]?\d)\/([01]?\d)$/);
  if (!md) return null;
  const day = Number(md[1]);
  const month = Number(md[2]);
  if (month < 1 || month > 12) return null;
  const year = Number(anoMes.slice(0, 4));
  return isoFromParts(year, month, clampDay(year, month, day));
}

export function resolveSheetDate(
  input: string,
  anoMes: string,
  today: string = todayIso(),
): { iso: string; usedDefault: boolean } {
  const parsed = parseSheetDate(input, anoMes);
  if (!parsed) {
    return {
      iso: defaultDateForMonth(anoMes, today),
      usedDefault: input.trim() !== "",
    };
  }
  if (yyyyMmFromIso(parsed) === anoMes) {
    return { iso: parsed, usedDefault: false };
  }
  return { iso: defaultDateForMonth(anoMes, today), usedDefault: true };
}

export function parsePaidCell(input: string): boolean {
  const t = stripDiacritics(input).trim().toLowerCase();
  return (
    t === "true" ||
    t === "verdadeiro" ||
    t === "1" ||
    t === "sim" ||
    t === "pago" ||
    t === "x" ||
    t === "✓" ||
    t === "✔"
  );
}

export function mapSheetTipoToAccount(
  tipo: string,
  accounts: Account[],
): Account | undefined {
  const active = accounts.filter((a) => a.ativa);
  const t = stripDiacritics(tipo).trim().toLowerCase();
  if (!t) return defaultAccount(active);

  if (t === "debito" || t === "conta" || t === "carteira") {
    return (
      defaultAccount(active.filter((a) => a.kind !== "cartao")) ??
      defaultAccount(active)
    );
  }

  if (t === "inter") {
    return (
      findCardAccountByFonte(active, "inter") ??
      active.find((a) => stripDiacritics(a.nome).toLowerCase() === "inter")
    );
  }
  if (t === "nubank") {
    return (
      findCardAccountByFonte(active, "nubank") ??
      active.find((a) => stripDiacritics(a.nome).toLowerCase() === "nubank")
    );
  }

  const byName = active.find(
    (a) => stripDiacritics(a.nome).toLowerCase() === t,
  );
  return byName;
}

function cell(cells: string[], index: number): string {
  if (index < 0) return "";
  return cells[index] ?? "";
}

function parseValorCell(input: string): number | null {
  const parsed = parseBrlValue(input);
  if (parsed == null) return null;
  const abs = Math.abs(parsed);
  return abs > 0 ? abs : null;
}

type SectionCols = {
  kind: SheetKind;
  descricao: number;
  pago: number;
  data: number;
  tipo: number;
  categoria: number;
  valor: number;
  parcelas: number;
};

function colsFromHeader(kind: SheetKind, headers: string[]): SectionCols {
  return {
    kind,
    descricao: colIndex(headers, "nome", "descricao", "descrição"),
    pago: colIndex(headers, "pago"),
    data: colIndex(headers, "data"),
    tipo: colIndex(headers, "tipo"),
    categoria: colIndex(headers, "categoria"),
    valor: colIndex(headers, "valor"),
    parcelas: colIndex(headers, "parcelas", "parcela"),
  };
}

function fallbackCorrenteCols(cells: string[]): SectionCols | null {
  const nonempty = cells.filter((c) => c.trim() !== "");
  if (nonempty.length < 3) return null;
  if (cells.length >= 5) {
    return {
      kind: "corrente",
      descricao: 0,
      pago: -1,
      data: 1,
      tipo: 2,
      categoria: 3,
      valor: 4,
      parcelas: -1,
    };
  }
  if (cells.length === 4) {
    return {
      kind: "corrente",
      descricao: 0,
      pago: -1,
      data: -1,
      tipo: 1,
      categoria: 2,
      valor: 3,
      parcelas: -1,
    };
  }
  return null;
}

function buildRow(
  kind: SheetKind,
  cols: SectionCols,
  cells: string[],
  anoMes: string,
  today: string,
): ParsedSheetRow | null {
  const descricao = cell(cells, cols.descricao).trim();
  const valorRaw = cell(cells, cols.valor);
  const valor = parseValorCell(valorRaw);
  if (!descricao && valor == null) return null;
  if (SECTION_TITLE_RE.test(descricao)) return null;

  const tipoLabel = cell(cells, cols.tipo);
  const categoria = cell(cells, cols.categoria);
  const dateResolved = resolveSheetDate(cell(cells, cols.data), anoMes, today);
  const parcela =
    kind === "parcela"
      ? parseParcelaText(cell(cells, cols.parcelas))
      : parseParcelaText(descricao);

  const issues: SheetRowIssue[] = [];
  if (!descricao) issues.push("missing_description");
  if (valor == null) issues.push("missing_value");
  if (dateResolved.usedDefault) issues.push("date_defaulted");

  return {
    kind,
    descricao,
    pago: kind === "fixo" ? parsePaidCell(cell(cells, cols.pago)) : false,
    dataIso: dateResolved.iso,
    dataUsedDefault: dateResolved.usedDefault,
    tipoLabel,
    categoria: categoria.trim(),
    valor,
    parcela,
    accountId: null,
    issues,
  };
}

export function parseMonthSheetText(
  text: string,
  anoMes: string,
  today: string = todayIso(),
): ParseSheetResult {
  const lines = text.replace(/^\uFEFF/, "").split(/\r?\n/);
  const rows: ParsedSheetRow[] = [];
  let skippedSectionRows = 0;
  let section: SectionCols | null = null;

  for (const line of lines) {
    if (!line.trim()) {
      section = null;
      continue;
    }
    const cells = dropLeadingEmpty(splitRow(line));
    if (cells.length === 0) continue;

    const kind = headerKind(cells);
    if (kind === "skip" || kind === "orcamento") {
      section = null;
      skippedSectionRows += 1;
      continue;
    }
    if (kind === "fixo" || kind === "parcela" || kind === "corrente") {
      section = colsFromHeader(kind, cells);
      continue;
    }

    const cols = section ?? fallbackCorrenteCols(cells);
    if (!cols) continue;
    const row = buildRow(cols.kind, cols, cells, anoMes, today);
    if (row) rows.push(row);
  }

  return { rows, skippedSectionRows };
}

export function attachAccountsToSheetRows(
  rows: ParsedSheetRow[],
  accounts: Account[],
): ParsedSheetRow[] {
  return rows.map((row) => {
    const account = mapSheetTipoToAccount(row.tipoLabel, accounts);
    const accountId = account?.id ?? null;
    const issues: SheetRowIssue[] = row.issues.filter(
      (i) => i !== "unmapped_account",
    );
    if (!accountId && (row.descricao || row.valor != null)) {
      issues.push("unmapped_account");
    }
    return { ...row, accountId, issues };
  });
}

export function looksLikeSheetPaste(text: string): boolean {
  const trimmed = text.trim();
  if (!trimmed) return false;
  return trimmed.includes("\t") || trimmed.split(/\r?\n/).length >= 2;
}

export function parsePastedMonthSheet(
  text: string,
  monthIso: string,
  accounts: Account[],
): ParsedSheetRow[] {
  return attachAccountsToSheetRows(
    parseMonthSheetText(text, monthIso).rows,
    accounts,
  );
}

export function isSheetRowReady(row: ParsedSheetRow): boolean {
  return (
    row.descricao.trim().length > 0 &&
    row.valor != null &&
    row.valor > 0 &&
    Boolean(row.accountId)
  );
}

export function monthGridSlices(
  normalized: TransactionNormalized[],
  anoMes: string,
): {
  fixos: TransactionNormalized[];
  parcelas: TransactionNormalized[];
  correntes: TransactionNormalized[];
} {
  const ofMonth = normalized.filter((tx) => tx.anoMes === anoMes);
  const fixos = ofMonth
    .filter((tx) => isRecurringRaw(tx) && tx.tipo === "Despesa fixa")
    .sort((a, b) => (a.dataISO < b.dataISO ? -1 : a.dataISO > b.dataISO ? 1 : 0));
  const parcelas = ofMonth
    .filter(
      (tx) =>
        tx.tipoFluxo === "saida" &&
        !isRecurringRaw(tx) &&
        isInstallmentLike(tx),
    )
    .sort((a, b) => (a.dataISO < b.dataISO ? -1 : 1));
  const correntes = ofMonth
    .filter(
      (tx) =>
        isManualQuickRaw(tx) &&
        tx.tipoFluxo === "saida" &&
        !isRecurringRaw(tx) &&
        !isInstallmentLike(tx),
    )
    .sort((a, b) => (a.dataISO < b.dataISO ? -1 : 1));
  return { fixos, parcelas, correntes };
}

export function sumSaida(rows: TransactionNormalized[]): number {
  return Math.round(
    rows.reduce((sum, tx) => sum + Math.abs(tx.valorFluxo), 0) * 100,
  ) / 100;
}

export function monthCategoryRows(
  normalized: TransactionNormalized[],
  budgets: CategoryBudget[],
  anoMes: string,
): MonthCategoryRow[] {
  const spending = spendingByCategoryForMonth(normalized, anoMes);
  const usages = budgetUsageForMonth(normalized, budgets, anoMes);
  const byKey = new Map(
    usages.map((u) => [budgetCategoryKey(u.categoria), u]),
  );
  const keys = new Set<string>();
  for (const cat of spending.keys()) keys.add(budgetCategoryKey(cat));
  for (const u of usages) keys.add(budgetCategoryKey(u.categoria));

  const rows: MonthCategoryRow[] = [];
  for (const key of keys) {
    const usage = byKey.get(key);
    let categoria = usage?.categoria;
    let realizado = usage?.gasto ?? 0;
    if (!categoria) {
      for (const [cat, value] of spending) {
        if (budgetCategoryKey(cat) === key) {
          categoria = cat;
          realizado = Math.round(value * 100) / 100;
          break;
        }
      }
    }
    if (!categoria) continue;
    const orcado = usage?.limite ?? 0;
    const percentual =
      orcado > 0
        ? Math.round((realizado / orcado) * 10000) / 100
        : realizado > 0
          ? 100
          : 0;
    rows.push({
      categoria: normalizeBudgetCategory(categoria),
      orcado,
      realizado,
      percentual,
      status: budgetStatus(realizado, orcado),
    });
  }

  return rows.sort((a, b) => b.realizado - a.realizado);
}

export function formatInstallmentCell(info: SheetParcela): string {
  return `${info.current}/${info.total}`;
}

export function lancamentoWithParcela(
  descricao: string,
  parcela: SheetParcela | null,
): string {
  const base = descricao.trim();
  if (!parcela) return base;
  if (parseParcelaText(base)) return base;
  return `${base} (${parcela.current}/${parcela.total})`;
}

export function findMatchingFixoRule(
  descricao: string,
  rules: RecurringRule[],
): RecurringRule | undefined {
  const key = stripDiacritics(descricao).trim().toLowerCase();
  return rules.find(
    (r) =>
      r.ativo &&
      r.kind === "despesa_fixa" &&
      stripDiacritics(r.descricao).trim().toLowerCase() === key,
  );
}

export function isDuplicateMonthTx(
  row: Pick<ParsedSheetRow, "descricao" | "valor" | "dataIso" | "accountId">,
  existing: TransactionNormalized[],
): boolean {
  if (row.valor == null) return false;
  const desc = expenseKey(row.descricao);
  return existing.some((tx) => {
    if (tx.dataISO !== row.dataIso) return false;
    if (Math.abs(Math.abs(tx.valorOriginal) - row.valor!) > 0.005) return false;
    if (row.accountId && tx.accountId && tx.accountId !== row.accountId) {
      return false;
    }
    return expenseKey(tx.lancamento) === desc;
  });
}

function expenseKey(s: string): string {
  return stripDiacritics(s)
    .replace(/\s*\(\d+\s*\/\s*\d+\)\s*$/, "")
    .trim()
    .toLowerCase();
}

function installmentSlots(
  row: ParsedSheetRow,
): Array<{ dataIso: string; parcela: SheetParcela | null }> {
  const info = row.kind === "parcela" ? row.parcela : null;
  if (!info || info.total <= 1) {
    return [{ dataIso: row.dataIso, parcela: info }];
  }
  // ponytail: at most MAX_PARCELAS from the current one; same ceiling as quick add
  const last = Math.min(info.total, info.current + MAX_PARCELAS - 1);
  const slots: Array<{ dataIso: string; parcela: SheetParcela }> = [];
  for (let n = info.current; n <= last; n += 1) {
    slots.push({
      dataIso: addMonthsIso(row.dataIso, n - info.current),
      parcela: { current: n, total: info.total },
    });
  }
  return slots;
}

export function recurringRawIdForMonth(ruleId: string, anoMes: string): string {
  return recurringIncomeRawId(ruleId, anoMes);
}

export type MonthGridManualPartial = Omit<
  ManualTransaction,
  "id" | "fonte" | "sourceId"
> &
  Partial<Pick<ManualTransaction, "id">>;

export type MonthGridImport = {
  rules: RecurringRule[];
  manuals: MonthGridManualPartial[];
  edits: Array<{ rawId: string; patch: TransactionEditPatch }>;
  payments: Array<{ rawId: string; status: PaymentStatus }>;
  skippedDuplicates: number;
  skippedIncomplete: number;
};

export function emptyMonthGridImport(): MonthGridImport {
  return {
    rules: [],
    manuals: [],
    edits: [],
    payments: [],
    skippedDuplicates: 0,
    skippedIncomplete: 0,
  };
}

export function buildMonthGridImport(args: {
  rows: ParsedSheetRow[];
  monthIso: string;
  rules: RecurringRule[];
  existing: TransactionNormalized[];
}): MonthGridImport {
  const out = emptyMonthGridImport();
  const now = new Date().toISOString();

  for (const row of args.rows) {
    if (!isSheetRowReady(row) || row.valor == null || !row.accountId) {
      out.skippedIncomplete += 1;
      continue;
    }

    if (row.kind === "fixo") {
      const match = findMatchingFixoRule(row.descricao, args.rules);
      if (match) {
        const rawId = recurringRawIdForMonth(match.id, args.monthIso);
        const patch: TransactionEditPatch = {};
        if (isoToBr(row.dataIso) !== undefined) patch.data = isoToBr(row.dataIso);
        if (Math.abs(match.valor - row.valor) > 0.005) {
          patch.valorOriginal = row.valor;
        }
        if (Object.keys(patch).length > 0) {
          out.edits.push({ rawId, patch });
        }
        if (row.pago) out.payments.push({ rawId, status: "pago" });
        continue;
      }

      const id = newRecurringId();
      const day = Number(row.dataIso.slice(8, 10)) || 1;
      out.rules.push({
        id,
        kind: "despesa_fixa",
        descricao: row.descricao.trim(),
        categoria: row.categoria.trim() || "(sem categoria)",
        valor: row.valor,
        diaMes: day,
        inicio: row.dataIso,
        fim: null,
        ativo: true,
        criadoEm: now,
        accountId: row.accountId,
      });
      if (row.pago) {
        out.payments.push({
          rawId: recurringRawIdForMonth(id, args.monthIso),
          status: "pago",
        });
      }
      continue;
    }

    for (const slot of installmentSlots(row)) {
      const lancamento = lancamentoWithParcela(row.descricao, slot.parcela);
      if (
        isDuplicateMonthTx(
          { ...row, descricao: lancamento, dataIso: slot.dataIso },
          args.existing,
        )
      ) {
        out.skippedDuplicates += 1;
        continue;
      }
      out.manuals.push({
        data: isoToBr(slot.dataIso),
        lancamento,
        categoria: row.categoria.trim(),
        tipo: "Avulso",
        valorOriginal: row.valor,
        accountId: row.accountId,
      });
    }
  }

  return out;
}
