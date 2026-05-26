"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  accountsToBalanceAnchor,
  accountsToCardConfigs,
  countTransactionsForAccount,
  defaultAccount,
  ensureCardAccount,
} from "./accounts";
import {
  applyEdits,
  buildEditEntry,
  countDeleted,
  EMPTY_EDITS,
  getDeletedRaws,
  isRecurringRaw,
  pruneEditsForRawIds,
  TransactionEditPatch,
} from "./edits";
import { isManualQuickRaw, MANUAL_SOURCE_ID, newManualTransaction } from "./manualTransactions";
import { normalizeTransactions } from "./normalize";
import { expandRecurringRules } from "./recurring";
import {
  BackupFile,
  BackupImportMode,
  BackupPayload,
  exportAndDownloadBackup,
  resolveBackupApplication,
} from "./backup";
import {
  bootstrapAccounts,
  clearAllData,
  loadBudgets,
  loadDataset,
  loadEdits,
  loadLastBackupAt,
  loadManualTransactions,
  loadRecurring,
  loadRules,
  loadSettings,
  resetRules as resetRulesStorage,
  saveAccounts,
  saveBudgets,
  saveDataset,
  saveEdits,
  saveManualTransactions,
  saveRecurring,
  saveRules,
  saveSettings,
} from "./storage";
import {
  Account,
  CategoryBudget,
  Dataset,
  EditsState,
  EMPTY_ACCOUNTS,
  EMPTY_BUDGETS,
  EMPTY_DATASET,
  ManualTransaction,
  RecurringRule,
  Rules,
  DEFAULT_RULES,
  DEFAULT_SETTINGS,
  Settings,
  Source,
  TransactionNormalized,
  TransactionRaw,
} from "./types";

export type QuickAddDraft = Partial<
  Pick<
    ManualTransaction,
    "valorOriginal" | "lancamento" | "categoria" | "tipo" | "accountId"
  >
> & { data?: string };

type Ctx = {
  loaded: boolean;
  dataset: Dataset;
  hasData: boolean;
  hasAnalysis: boolean;
  recurringRules: RecurringRule[];
  rules: Rules;
  settings: Settings;
  accounts: Account[];
  manualTransactions: ManualTransaction[];
  edits: EditsState;
  deletedCount: number;
  normalized: TransactionNormalized[];
  deletedNormalized: TransactionNormalized[];
  findOriginalRaw: (rawId: string) => TransactionRaw | undefined;
  addSource: (source: Source) => Promise<void>;
  removeSource: (id: string) => Promise<void>;
  clearAllSources: () => Promise<void>;
  addRecurring: (rule: RecurringRule) => Promise<void>;
  updateRecurring: (rule: RecurringRule) => Promise<void>;
  removeRecurring: (id: string) => Promise<void>;
  toggleRecurring: (id: string) => Promise<void>;
  updateRules: (rules: Rules) => Promise<void>;
  resetRules: () => Promise<void>;
  updateSettings: (settings: Settings) => Promise<void>;
  addAccount: (account: Account) => Promise<void>;
  updateAccount: (account: Account) => Promise<void>;
  removeAccount: (id: string) => Promise<void>;
  setDefaultAccount: (id: string) => Promise<void>;
  addManualTransaction: (
    partial: Omit<ManualTransaction, "id" | "fonte" | "sourceId"> &
      Partial<Pick<ManualTransaction, "id">>,
  ) => Promise<ManualTransaction>;
  updateManualTransaction: (
    id: string,
    patch: Partial<
      Pick<
        ManualTransaction,
        | "data"
        | "lancamento"
        | "categoria"
        | "tipo"
        | "valorOriginal"
        | "accountId"
      >
    >,
  ) => Promise<void>;
  removeManualTransaction: (id: string) => Promise<void>;
  editTransaction: (rawId: string, patch: TransactionEditPatch) => Promise<void>;
  revertTransaction: (rawId: string) => Promise<void>;
  deleteTransaction: (rawId: string) => Promise<void>;
  restoreTransaction: (rawId: string) => Promise<void>;
  budgets: CategoryBudget[];
  addBudget: (budget: CategoryBudget) => Promise<void>;
  updateBudget: (budget: CategoryBudget) => Promise<void>;
  removeBudget: (id: string) => Promise<void>;
  toggleBudget: (id: string) => Promise<void>;
  lastBackupAt: string | null;
  exportBackup: () => Promise<void>;
  importBackup: (backup: BackupFile, mode: BackupImportMode) => Promise<void>;
};

const AppContext = createContext<Ctx | null>(null);

function syncSettingsFromAccounts(
  accounts: Account[],
  prev: Settings,
): Settings {
  return {
    ...prev,
    balanceAnchor: accountsToBalanceAnchor(accounts),
    cards: accountsToCardConfigs(accounts),
  };
}

export function AppStoreProvider({ children }: { children: React.ReactNode }) {
  const [loaded, setLoaded] = useState(false);
  const [dataset, setDatasetState] = useState<Dataset>(EMPTY_DATASET);
  const [recurringRules, setRecurringRules] = useState<RecurringRule[]>([]);
  const [rules, setRules] = useState<Rules>(DEFAULT_RULES);
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const [accounts, setAccounts] = useState<Account[]>(EMPTY_ACCOUNTS);
  const [manualTransactions, setManualTransactions] = useState<
    ManualTransaction[]
  >([]);
  const [edits, setEdits] = useState<EditsState>(EMPTY_EDITS);
  const [budgets, setBudgetsState] = useState<CategoryBudget[]>(EMPTY_BUDGETS);
  const [lastBackupAt, setLastBackupAt] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      const [d, r, rec, s, e, manual, bud, lastBk] = await Promise.all([
        loadDataset(),
        loadRules(),
        loadRecurring(),
        loadSettings(),
        loadEdits(),
        loadManualTransactions(),
        loadBudgets(),
        loadLastBackupAt(),
      ]);
      const { accounts: accs, dataset: ds } = await bootstrapAccounts(d, s);
      const syncedSettings = syncSettingsFromAccounts(accs, s);
      if (
        JSON.stringify(syncedSettings.balanceAnchor) !==
          JSON.stringify(s.balanceAnchor) ||
        JSON.stringify(syncedSettings.cards) !== JSON.stringify(s.cards)
      ) {
        await saveSettings(syncedSettings);
      }
      if (!alive) return;
      setDatasetState(ds);
      setRules(r);
      setRecurringRules(rec);
      setSettings(syncedSettings);
      setAccounts(accs);
      setManualTransactions(manual);
      setEdits(e);
      setBudgetsState(bud);
      setLastBackupAt(lastBk);
      setLoaded(true);
    })();
    return () => {
      alive = false;
    };
  }, []);

  const persistDataset = useCallback(async (next: Dataset) => {
    await saveDataset(next);
    setDatasetState(next);
  }, []);

  const persistAccounts = useCallback(
    async (next: Account[], prevSettings: Settings) => {
      await saveAccounts(next);
      setAccounts(next);
      const synced = syncSettingsFromAccounts(next, prevSettings);
      await saveSettings(synced);
      setSettings(synced);
    },
    [],
  );

  const persistManual = useCallback(async (next: ManualTransaction[]) => {
    await saveManualTransactions(next);
    setManualTransactions(next);
  }, []);

  const persistEdits = useCallback(async (next: EditsState) => {
    await saveEdits(next);
    setEdits(next);
  }, []);

  const persistRecurring = useCallback(async (next: RecurringRule[]) => {
    await saveRecurring(next);
    setRecurringRules(next);
  }, []);

  const persistBudgets = useCallback(async (next: CategoryBudget[]) => {
    await saveBudgets(next);
    setBudgetsState(next);
  }, []);

  const importedRaw = useMemo(
    () => dataset.sources.flatMap((s) => s.raw),
    [dataset.sources],
  );

  const findOriginalRaw = useCallback(
    (rawId: string): TransactionRaw | undefined =>
      importedRaw.find((r) => r.id === rawId) ??
      manualTransactions.find((r) => r.id === rawId),
    [importedRaw, manualTransactions],
  );

  const recurringRaw = useMemo(
    () => expandRecurringRules(recurringRules.filter((r) => r.ativo)),
    [recurringRules],
  );

  const allRaw = useMemo(
    () => [...importedRaw, ...manualTransactions, ...recurringRaw],
    [importedRaw, manualTransactions, recurringRaw],
  );

  const { effective } = useMemo(
    () => applyEdits(allRaw, edits),
    [allRaw, edits],
  );

  const normalized = useMemo<TransactionNormalized[]>(() => {
    if (effective.length === 0) return [];
    return normalizeTransactions(effective, rules);
  }, [effective, rules]);

  const deletedNormalized = useMemo<TransactionNormalized[]>(() => {
    const deleted = getDeletedRaws(allRaw, edits);
    if (deleted.length === 0) return [];
    return normalizeTransactions(deleted, rules);
  }, [allRaw, edits, rules]);

  const deletedCount = useMemo(() => countDeleted(edits), [edits]);

  const addSource = useCallback(
    async (source: Source) => {
      let nextAccounts = accounts;
      let nextSource = source;
      if (source.fonte === "inter" || source.fonte === "nubank") {
        const ensured = ensureCardAccount(nextAccounts, source.fonte);
        nextAccounts = ensured.accounts;
        const accountId = ensured.account.id;
        nextSource = {
          ...source,
          raw: source.raw.map((r) => ({ ...r, accountId })),
        };
        if (nextAccounts !== accounts) {
          await persistAccounts(nextAccounts, settings);
        }
      }
      const next: Dataset = { sources: [...dataset.sources, nextSource] };
      await persistDataset(next);
    },
    [accounts, dataset.sources, persistAccounts, persistDataset, settings],
  );

  const removeSource = useCallback(
    async (id: string) => {
      const removed = dataset.sources.find((s) => s.id === id);
      const rawIds = removed?.raw.map((r) => r.id) ?? [];
      const next: Dataset = {
        sources: dataset.sources.filter((s) => s.id !== id),
      };
      await persistDataset(next);
      if (rawIds.length > 0) {
        const nextEdits = pruneEditsForRawIds(edits, rawIds);
        if (nextEdits !== edits) {
          await persistEdits(nextEdits);
        }
      }
    },
    [dataset.sources, edits, persistDataset, persistEdits],
  );

  const clearAllSources = useCallback(async () => {
    await clearAllData();
    setDatasetState({ ...EMPTY_DATASET });
    setRecurringRules([]);
    setSettings({ ...DEFAULT_SETTINGS });
    setAccounts([]);
    setManualTransactions([]);
    setEdits({ ...EMPTY_EDITS });
    setBudgetsState([]);
    setLastBackupAt(null);
  }, []);

  const exportBackup = useCallback(async () => {
    const backup = await exportAndDownloadBackup();
    setLastBackupAt(backup.exportedAt);
  }, []);

  const addBudget = useCallback(
    async (budget: CategoryBudget) => {
      const dup = budgets.some(
        (b) =>
          b.categoria.toLowerCase() === budget.categoria.toLowerCase() &&
          b.id !== budget.id,
      );
      if (dup) {
        throw new Error("Já existe orçamento para esta categoria.");
      }
      await persistBudgets([...budgets, budget]);
    },
    [budgets, persistBudgets],
  );

  const updateBudget = useCallback(
    async (budget: CategoryBudget) => {
      const dup = budgets.some(
        (b) =>
          b.id !== budget.id &&
          b.categoria.toLowerCase() === budget.categoria.toLowerCase(),
      );
      if (dup) {
        throw new Error("Já existe orçamento para esta categoria.");
      }
      await persistBudgets(
        budgets.map((b) =>
          b.id === budget.id
            ? { ...budget, atualizadaEm: new Date().toISOString() }
            : b,
        ),
      );
    },
    [budgets, persistBudgets],
  );

  const removeBudget = useCallback(
    async (id: string) => {
      await persistBudgets(budgets.filter((b) => b.id !== id));
    },
    [budgets, persistBudgets],
  );

  const toggleBudget = useCallback(
    async (id: string) => {
      await persistBudgets(
        budgets.map((b) =>
          b.id === id ? { ...b, ativa: !b.ativa, atualizadaEm: new Date().toISOString() } : b,
        ),
      );
    },
    [budgets, persistBudgets],
  );

  const importBackup = useCallback(
    async (backup: BackupFile, mode: BackupImportMode) => {
      const current: BackupPayload = {
        dataset,
        rules,
        recurring: recurringRules,
        settings,
        edits,
        accounts,
        manualTransactions,
        budgets,
      };
      const resolved = resolveBackupApplication(current, backup.data, mode);

      if (mode === "replace") {
        await clearAllData({ preserveLastBackup: true });
      }

      await Promise.all([
        saveDataset(resolved.dataset),
        saveRules(resolved.rules),
        saveRecurring(resolved.recurring),
        saveSettings(resolved.settings),
        saveEdits(resolved.edits),
        saveAccounts(resolved.accounts),
        saveManualTransactions(resolved.manualTransactions),
        saveBudgets(resolved.budgets),
      ]);

      const { accounts: accs, dataset: ds } = await bootstrapAccounts(
        resolved.dataset,
        resolved.settings,
      );
      const synced = syncSettingsFromAccounts(accs, resolved.settings);
      if (JSON.stringify(synced) !== JSON.stringify(resolved.settings)) {
        await saveSettings(synced);
      }

      setDatasetState(ds);
      setRules(resolved.rules);
      setRecurringRules(resolved.recurring);
      setSettings(synced);
      setAccounts(accs);
      setManualTransactions(resolved.manualTransactions);
      setEdits(resolved.edits);
      setBudgetsState(resolved.budgets);
    },
    [
      accounts,
      budgets,
      dataset,
      edits,
      manualTransactions,
      recurringRules,
      rules,
      settings,
    ],
  );

  const updateSettings = useCallback(async (next: Settings) => {
    await saveSettings(next);
    setSettings(next);
  }, []);

  const addAccount = useCallback(
    async (account: Account) => {
      const hasDefault = accounts.some((a) => a.isDefault);
      const withDefault =
        account.isDefault || !hasDefault
          ? { ...account, isDefault: account.isDefault ?? !hasDefault }
          : account;
      const next = [...accounts, withDefault].map((a) =>
        withDefault.isDefault && a.id !== withDefault.id
          ? { ...a, isDefault: false }
          : a,
      );
      await persistAccounts(next, settings);
    },
    [accounts, persistAccounts, settings],
  );

  const updateAccount = useCallback(
    async (account: Account) => {
      const next = accounts.map((a) => {
        if (a.id !== account.id) {
          return account.isDefault ? { ...a, isDefault: false } : a;
        }
        return account;
      });
      await persistAccounts(next, settings);
    },
    [accounts, persistAccounts, settings],
  );

  const removeAccount = useCallback(
    async (id: string) => {
      const count = countTransactionsForAccount(
        dataset,
        manualTransactions,
        id,
      );
      if (count > 0) {
        throw new Error(
          `Não é possível excluir: ${count} transação(ões) vinculada(s).`,
        );
      }
      const next = accounts.filter((a) => a.id !== id);
      await persistAccounts(next, settings);
    },
    [accounts, dataset, manualTransactions, persistAccounts, settings],
  );

  const setDefaultAccount = useCallback(
    async (id: string) => {
      const next = accounts.map((a) => ({
        ...a,
        isDefault: a.id === id,
      }));
      await persistAccounts(next, settings);
    },
    [accounts, persistAccounts, settings],
  );

  const addManualTransaction = useCallback(
    async (
      partial: Omit<ManualTransaction, "id" | "fonte" | "sourceId"> &
        Partial<Pick<ManualTransaction, "id">>,
    ) => {
      const def = defaultAccount(accounts);
      const tx = newManualTransaction({
        ...partial,
        accountId: partial.accountId ?? def?.id,
      });
      await persistManual([...manualTransactions, tx]);
      return tx;
    },
    [accounts, manualTransactions, persistManual],
  );

  const updateManualTransaction = useCallback(
    async (
      id: string,
      patch: Partial<
        Pick<
          ManualTransaction,
          | "data"
          | "lancamento"
          | "categoria"
          | "tipo"
          | "valorOriginal"
          | "accountId"
        >
      >,
    ) => {
      await persistManual(
        manualTransactions.map((t) =>
          t.id === id ? { ...t, ...patch } : t,
        ),
      );
    },
    [manualTransactions, persistManual],
  );

  const removeManualTransaction = useCallback(
    async (id: string) => {
      await persistManual(manualTransactions.filter((t) => t.id !== id));
      const nextEdits = pruneEditsForRawIds(edits, [id]);
      if (nextEdits !== edits) {
        await persistEdits(nextEdits);
      }
    },
    [edits, manualTransactions, persistEdits, persistManual],
  );

  const addRecurring = useCallback(
    async (rule: RecurringRule) => {
      await persistRecurring([...recurringRules, rule]);
    },
    [recurringRules, persistRecurring],
  );

  const updateRecurring = useCallback(
    async (rule: RecurringRule) => {
      await persistRecurring(
        recurringRules.map((r) => (r.id === rule.id ? rule : r)),
      );
    },
    [recurringRules, persistRecurring],
  );

  const removeRecurring = useCallback(
    async (id: string) => {
      await persistRecurring(recurringRules.filter((r) => r.id !== id));
    },
    [recurringRules, persistRecurring],
  );

  const toggleRecurring = useCallback(
    async (id: string) => {
      await persistRecurring(
        recurringRules.map((r) =>
          r.id === id ? { ...r, ativo: !r.ativo } : r,
        ),
      );
    },
    [recurringRules, persistRecurring],
  );

  const updateRules = useCallback(async (next: Rules) => {
    await saveRules(next);
    setRules(next);
  }, []);

  const resetRulesFn = useCallback(async () => {
    const r = await resetRulesStorage();
    setRules(r);
  }, []);

  const editTransaction = useCallback(
    async (rawId: string, patch: TransactionEditPatch) => {
      const manual = manualTransactions.find((t) => t.id === rawId);
      if (manual && isManualQuickRaw(manual)) {
        await updateManualTransaction(rawId, patch);
        return;
      }
      const raw = findOriginalRaw(rawId);
      if (raw && isRecurringRaw(raw)) {
        return;
      }
      const next = {
        ...edits,
        [rawId]: buildEditEntry(rawId, edits[rawId], patch),
      };
      await persistEdits(next);
    },
    [edits, findOriginalRaw, manualTransactions, persistEdits, updateManualTransaction],
  );

  const revertTransaction = useCallback(
    async (rawId: string) => {
      if (manualTransactions.some((t) => t.id === rawId && isManualQuickRaw(t))) {
        return;
      }
      if (!edits[rawId]) return;
      const next = { ...edits };
      delete next[rawId];
      await persistEdits(next);
    },
    [edits, manualTransactions, persistEdits],
  );

  const deleteTransaction = useCallback(
    async (rawId: string) => {
      const manual = manualTransactions.find((t) => t.id === rawId);
      if (manual && isManualQuickRaw(manual)) {
        await removeManualTransaction(rawId);
        return;
      }
      const next = {
        ...edits,
        [rawId]: {
          rawId,
          editedAt: new Date().toISOString(),
          deleted: true,
          ...(edits[rawId]
            ? {
                data: edits[rawId].data,
                lancamento: edits[rawId].lancamento,
                categoria: edits[rawId].categoria,
                tipo: edits[rawId].tipo,
                valorOriginal: edits[rawId].valorOriginal,
              }
            : {}),
        },
      };
      await persistEdits(next);
    },
    [edits, manualTransactions, persistEdits, removeManualTransaction],
  );

  const restoreTransaction = useCallback(
    async (rawId: string) => {
      const existing = edits[rawId];
      if (!existing) return;
      const { deleted: _d, ...rest } = existing;
      const hasOther = Object.keys(rest).some(
        (k) => k !== "rawId" && k !== "editedAt",
      );
      if (!hasOther) {
        const next = { ...edits };
        delete next[rawId];
        await persistEdits(next);
        return;
      }
      const next = {
        ...edits,
        [rawId]: { ...rest, rawId, editedAt: new Date().toISOString() },
      };
      await persistEdits(next);
    },
    [edits, persistEdits],
  );

  const hasData =
    dataset.sources.length > 0 || manualTransactions.length > 0;
  const hasActiveRecurring = recurringRules.some((r) => r.ativo);
  const hasAnalysis = hasData || hasActiveRecurring;

  const value: Ctx = {
    loaded,
    dataset,
    hasData,
    hasAnalysis,
    recurringRules,
    rules,
    settings,
    accounts,
    manualTransactions,
    edits,
    deletedCount,
    normalized,
    deletedNormalized,
    findOriginalRaw,
    addSource,
    removeSource,
    clearAllSources,
    addRecurring,
    updateRecurring,
    removeRecurring,
    toggleRecurring,
    updateRules,
    resetRules: resetRulesFn,
    updateSettings,
    addAccount,
    updateAccount,
    removeAccount,
    setDefaultAccount,
    addManualTransaction,
    updateManualTransaction,
    removeManualTransaction,
    editTransaction,
    revertTransaction,
    deleteTransaction,
    restoreTransaction,
    budgets,
    addBudget,
    updateBudget,
    removeBudget,
    toggleBudget,
    lastBackupAt,
    exportBackup,
    importBackup,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useAppStore(): Ctx {
  const ctx = useContext(AppContext);
  if (!ctx) {
    throw new Error("useAppStore must be used inside <AppStoreProvider>");
  }
  return ctx;
}

export { MANUAL_SOURCE_ID };
