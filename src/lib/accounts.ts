import { newTransactionId } from "./ids";
import {
  Account,
  AccountKind,
  BalanceAnchor,
  CardConfig,
  Dataset,
  Fonte,
  Settings,
  TransactionRaw,
} from "./types";

export function newAccountId(): string {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return `acc-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

const FONTE_LABELS: Record<"inter" | "nubank", string> = {
  inter: "Inter",
  nubank: "Nubank",
};

export function defaultAccount(accounts: Account[]): Account | undefined {
  return (
    accounts.find((a) => a.isDefault && a.ativa) ??
    accounts.find((a) => a.ativa && a.kind !== "cartao") ??
    accounts.find((a) => a.ativa)
  );
}

export function findCardAccountByFonte(
  accounts: Account[],
  fonte: "inter" | "nubank",
): Account | undefined {
  return accounts.find((a) => a.kind === "cartao" && a.fonteCsv === fonte);
}

export function hasCardCycleConfigured(account: Account | undefined): boolean {
  if (!account) return false;
  return (
    account.cicloConfirmado === true &&
    typeof account.diaFechamento === "number" &&
    typeof account.diaPagamento === "number"
  );
}

export type CardCycle = {
  diaFechamento: number;
  diaPagamento: number;
};

export function upsertCardAccountCycle(
  accounts: Account[],
  fonte: "inter" | "nubank",
  cycle: CardCycle,
): { accounts: Account[]; account: Account } {
  const diaFechamento = Math.min(31, Math.max(1, cycle.diaFechamento));
  const diaPagamento = Math.min(31, Math.max(1, cycle.diaPagamento));
  const existing = findCardAccountByFonte(accounts, fonte);
  if (existing) {
    const account: Account = {
      ...existing,
      diaFechamento,
      diaPagamento,
      cicloConfirmado: true,
    };
    return {
      accounts: accounts.map((a) => (a.id === existing.id ? account : a)),
      account,
    };
  }

  const today = new Date().toISOString().slice(0, 10);
  const account: Account = {
    id: newAccountId(),
    nome: FONTE_LABELS[fonte],
    kind: "cartao",
    saldoInicial: 0,
    dataReferencia: today,
    ativa: true,
    criadaEm: new Date().toISOString(),
    fonteCsv: fonte,
    diaFechamento,
    diaPagamento,
    cicloConfirmado: true,
  };
  return { accounts: [...accounts, account], account };
}

export function ensureCardAccount(
  accounts: Account[],
  fonte: "inter" | "nubank",
): { accounts: Account[]; account: Account } {
  const existing = findCardAccountByFonte(accounts, fonte);
  if (existing) return { accounts, account: existing };

  const today = new Date().toISOString().slice(0, 10);
  const account: Account = {
    id: newAccountId(),
    nome: FONTE_LABELS[fonte],
    kind: "cartao",
    saldoInicial: 0,
    dataReferencia: today,
    ativa: true,
    criadaEm: new Date().toISOString(),
    fonteCsv: fonte,
  };
  return { accounts: [...accounts, account], account };
}

export function accountForRaw(
  accounts: Account[],
  raw: Pick<TransactionRaw, "fonte" | "accountId">,
): Account | undefined {
  if (raw.accountId) {
    return accounts.find((a) => a.id === raw.accountId);
  }
  if (raw.fonte === "inter" || raw.fonte === "nubank") {
    return findCardAccountByFonte(accounts, raw.fonte);
  }
  return defaultAccount(accounts);
}

export function accountsToBalanceAnchor(accounts: Account[]): BalanceAnchor | null {
  const cash = accounts.filter(
    (a) => a.ativa && a.kind !== "cartao" && a.dataReferencia,
  );
  if (cash.length === 0) return null;

  const primary =
    cash.find((a) => a.isDefault) ??
    cash.sort(
      (a, b) =>
        new Date(b.dataReferencia).getTime() -
        new Date(a.dataReferencia).getTime(),
    )[0];

  const totalSaldo = cash.reduce((sum, a) => sum + a.saldoInicial, 0);
  const earliestRef = cash.reduce(
    (min, a) => (a.dataReferencia < min ? a.dataReferencia : min),
    cash[0].dataReferencia,
  );

  return {
    data: primary?.dataReferencia ?? earliestRef,
    valor: totalSaldo,
  };
}

/**
 * True when active cash accounts were last updated on different reference dates.
 * In that case a single consolidated balance anchor can mix balances from
 * different moments, so the UI should warn before treating it as "today".
 */
export function cashAccountsHaveMixedReferenceDates(accounts: Account[]): boolean {
  const refs = accounts
    .filter((a) => a.ativa && a.kind !== "cartao" && a.dataReferencia)
    .map((a) => a.dataReferencia);
  if (refs.length <= 1) return false;
  return new Set(refs).size > 1;
}

export function accountsToCardConfigs(accounts: Account[]): CardConfig[] {
  return accounts
    .filter(
      (a) =>
        a.ativa &&
        a.kind === "cartao" &&
        a.fonteCsv &&
        typeof a.diaFechamento === "number" &&
        typeof a.diaPagamento === "number",
    )
    .map((a) => ({
      fonte: a.fonteCsv!,
      diaFechamento: a.diaFechamento!,
      diaPagamento: a.diaPagamento!,
    }));
}

export function hasProjectionSetup(
  accounts: Account[],
  datasetSources: Fonte[],
): boolean {
  const anchor = accountsToBalanceAnchor(accounts);
  if (!anchor) return false;

  const cardSources = datasetSources.filter(
    (f) => f === "inter" || f === "nubank",
  );
  if (cardSources.length === 0) return true;

  const configured = new Set(
    accounts
      .filter((a) => a.kind === "cartao" && a.fonteCsv)
      .map((a) => a.fonteCsv),
  );
  return cardSources.every((f) => configured.has(f));
}

export function migrateAccountsFromLegacy(
  settings: Settings,
  dataset: Dataset,
): Account[] {
  const today = new Date().toISOString().slice(0, 10);
  const accounts: Account[] = [];
  const anchor = settings.balanceAnchor;

  if (anchor) {
    accounts.push({
      id: newAccountId(),
      nome: "Conta Principal",
      kind: "cc",
      saldoInicial: anchor.valor,
      dataReferencia: anchor.data,
      ativa: true,
      criadaEm: new Date().toISOString(),
      isDefault: true,
    });
  }

  for (const card of settings.cards) {
    if (card.fonte !== "inter" && card.fonte !== "nubank") continue;
    if (findCardAccountByFonte(accounts, card.fonte)) continue;
    accounts.push({
      id: newAccountId(),
      nome: FONTE_LABELS[card.fonte],
      kind: "cartao",
      saldoInicial: 0,
      dataReferencia: today,
      ativa: true,
      criadaEm: new Date().toISOString(),
      fonteCsv: card.fonte,
      diaFechamento: card.diaFechamento,
      diaPagamento: card.diaPagamento,
      cicloConfirmado: true,
    });
  }

  const sourceFontes = new Set(
    dataset.sources
      .map((s) => s.fonte)
      .filter((f): f is "inter" | "nubank" => f === "inter" || f === "nubank"),
  );
  for (const fonte of sourceFontes) {
    if (!findCardAccountByFonte(accounts, fonte)) {
      accounts.push({
        id: newAccountId(),
        nome: FONTE_LABELS[fonte],
        kind: "cartao",
        saldoInicial: 0,
        dataReferencia: today,
        ativa: true,
        criadaEm: new Date().toISOString(),
        fonteCsv: fonte,
      });
    }
  }

  return accounts;
}

export function attachAccountIdsToDataset(
  dataset: Dataset,
  accounts: Account[],
): { dataset: Dataset; accounts: Account[] } {
  let nextAccounts = accounts;
  const sources = dataset.sources.map((source) => {
    if (source.fonte !== "inter" && source.fonte !== "nubank") {
      return source;
    }
    const ensured = ensureCardAccount(nextAccounts, source.fonte);
    nextAccounts = ensured.accounts;
    const accountId = ensured.account.id;
    const raw = source.raw.map((r) =>
      r.accountId ? r : { ...r, accountId },
    );
    return { ...source, raw };
  });
  return { dataset: { sources }, accounts: nextAccounts };
}

export function countTransactionsForAccount(
  dataset: Dataset,
  manualTransactions: TransactionRaw[],
  accountId: string,
): number {
  let n = manualTransactions.filter((t) => t.accountId === accountId).length;
  for (const s of dataset.sources) {
    n += s.raw.filter((r) => r.accountId === accountId).length;
  }
  return n;
}

export const ACCOUNT_KIND_LABELS: Record<AccountKind, string> = {
  cc: "Conta corrente",
  poupanca: "Poupança",
  carteira: "Carteira",
  cartao: "Cartão",
};

export function createDefaultAccount(
  kind: AccountKind,
  nome: string,
  partial?: Partial<Account>,
): Account {
  const today = new Date().toISOString().slice(0, 10);
  return {
    id: newAccountId(),
    nome,
    kind,
    saldoInicial: 0,
    dataReferencia: today,
    ativa: true,
    criadaEm: new Date().toISOString(),
    ...partial,
  };
}

export { newTransactionId };
