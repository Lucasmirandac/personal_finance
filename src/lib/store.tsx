"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  accountsToBalanceAnchor,
  accountsToCardConfigs,
  countTransactionsForAccount,
  defaultAccount,
  ensureCardAccount,
  upsertCardAccountCycle,
  type CardCycle,
} from "./accounts";
import {
  applyEdits,
  allowsPerMonthRecurringEdit,
  buildEditEntry,
  buildGroupEditEntry,
  countDeleted,
  EMPTY_EDITS,
  getDeletedRaws,
  hasGroupFieldEdits,
  isRecurringRaw,
  pickGroupPatch,
  pickIndividualPatch,
  pickRecurringIncomePatch,
  pickRecurringMonthlyPatch,
  pruneEditsForRawIds,
  TransactionEditPatch,
} from "./edits";
import { removeStaleEstimatedInstallments } from "./installmentEstimates";
import { compileAliases } from "./aliases";
import { addDaysIso, todayIso } from "./dates";
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
  saveInstallmentGroupEdits,
  loadInstallmentGroupEdits,
  saveManualTransactions,
  saveRecurring,
  saveRules,
  saveSettings,
  saveSubscriptionDismissals,
  loadSubscriptionDismissals,
  loadAliases,
  saveAliases,
  loadStructuralCategories,
  saveStructuralCategories,
  loadAchievements,
  saveAchievements,
  loadMonthCloses,
  loadPaymentStatus,
  appendMonthClose,
  saveMonthCloses,
  savePaymentStatus,
} from "./storage";
import { evaluateAchievements } from "./achievements";
import { budgetCategoryKey, normalizeBudgetCategory } from "./budgets";
import {
  Account,
  AchievementId,
  AchievementsSnapshot,
  CategoryBudget,
  Dataset,
  EditsState,
  EMPTY_ACCOUNTS,
  EMPTY_ACHIEVEMENTS,
  EMPTY_BUDGETS,
  EMPTY_DATASET,
  EMPTY_INSTALLMENT_GROUP_EDITS,
  EMPTY_MONTH_CLOSES,
  EMPTY_PAYMENT_STATUS,
  InstallmentGroupEditsState,
  MonthCloseEntry,
  PaymentStatus,
  PaymentStatusState,
  EstablishmentAlias,
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
> & {
  data?: string;
  parcelas?: number;
  amountMode?: "total" | "parcela";
};

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
  installmentGroupEdits: InstallmentGroupEditsState;
  paymentStatus: PaymentStatusState;
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
  confirmCardAccountCycle: (
    fonte: "inter" | "nubank",
    cycle: CardCycle,
  ) => Promise<{ accounts: Account[]; account: Account }>;
  setDefaultAccount: (id: string) => Promise<void>;
  addManualTransaction: (
    partial: Omit<ManualTransaction, "id" | "fonte" | "sourceId"> &
      Partial<Pick<ManualTransaction, "id">>,
  ) => Promise<ManualTransaction>;
  addManualTransactions: (
    partials: Array<
      Omit<ManualTransaction, "id" | "fonte" | "sourceId"> &
        Partial<Pick<ManualTransaction, "id">>
    >,
  ) => Promise<ManualTransaction[]>;
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
  setPaymentStatus: (rawId: string, status: PaymentStatus | null) => Promise<void>;
  budgets: CategoryBudget[];
  addBudget: (budget: CategoryBudget) => Promise<void>;
  updateBudget: (budget: CategoryBudget) => Promise<void>;
  removeBudget: (id: string) => Promise<void>;
  toggleBudget: (id: string) => Promise<void>;
  lastBackupAt: string | null;
  exportBackup: () => Promise<void>;
  importBackup: (backup: BackupFile, mode: BackupImportMode) => Promise<void>;
  subscriptionDismissals: string[];
  dismissSubscription: (key: string) => Promise<void>;
  restoreSubscription: (key: string) => Promise<void>;
  establishmentAliases: EstablishmentAlias[];
  addAlias: (alias: EstablishmentAlias) => Promise<void>;
  updateAlias: (alias: EstablishmentAlias) => Promise<void>;
  removeAlias: (id: string) => Promise<void>;
  structuralCategories: string[];
  setStructuralCategories: (categories: string[]) => Promise<void>;
  toggleStructuralCategory: (categoria: string) => Promise<void>;
  achievements: AchievementsSnapshot;
  monthCloses: MonthCloseEntry[];
  closeMonth: (entry: MonthCloseEntry) => Promise<void>;
  pendingAchievementToasts: AchievementId[];
  dismissAchievementToast: () => void;
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

function normalizeRecurringRule(rule: RecurringRule): RecurringRule {
  const diaMes = Number.isFinite(rule.diaMes)
    ? Math.min(31, Math.max(1, Math.round(rule.diaMes)))
    : 1;
  return {
    ...rule,
    diaMes,
    inicio:
      /^\d{4}-\d{2}$/.test(rule.inicio)
        ? `${rule.inicio}-01`
        : rule.inicio,
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
  const [installmentGroupEdits, setInstallmentGroupEdits] =
    useState<InstallmentGroupEditsState>(EMPTY_INSTALLMENT_GROUP_EDITS);
  const [paymentStatus, setPaymentStatusState] =
    useState<PaymentStatusState>(EMPTY_PAYMENT_STATUS);
  const [budgets, setBudgetsState] = useState<CategoryBudget[]>(EMPTY_BUDGETS);
  const [lastBackupAt, setLastBackupAt] = useState<string | null>(null);
  const [subscriptionDismissals, setSubscriptionDismissals] = useState<
    string[]
  >([]);
  const [establishmentAliases, setEstablishmentAliases] = useState<
    EstablishmentAlias[]
  >([]);
  const [structuralCategories, setStructuralCategoriesState] = useState<
    string[]
  >([]);
  const [achievements, setAchievementsState] = useState<AchievementsSnapshot>(
    EMPTY_ACHIEVEMENTS,
  );
  const [monthCloses, setMonthClosesState] = useState<MonthCloseEntry[]>(
    EMPTY_MONTH_CLOSES,
  );
  const [pendingAchievementToasts, setPendingAchievementToasts] = useState<
    AchievementId[]
  >([]);

  useEffect(() => {
    let alive = true;
    (async () => {
      const [d, r, rec, s, e, groupEdits, manual, bud, lastBk, dismissals, aliases, structural, ach, closes, payStatus] =
        await Promise.all([
        loadDataset(),
        loadRules(),
        loadRecurring(),
        loadSettings(),
        loadEdits(),
        loadInstallmentGroupEdits(),
        loadManualTransactions(),
        loadBudgets(),
        loadLastBackupAt(),
        loadSubscriptionDismissals(),
        loadAliases(),
        loadStructuralCategories(),
        loadAchievements(),
        loadMonthCloses(),
        loadPaymentStatus(),
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
      setInstallmentGroupEdits(groupEdits);
      setBudgetsState(bud);
      setLastBackupAt(lastBk);
      setSubscriptionDismissals(dismissals);
      setEstablishmentAliases(aliases);
      setStructuralCategoriesState(structural);
      setAchievementsState(ach);
      setMonthClosesState(closes);
      setPaymentStatusState(payStatus);
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

  const persistInstallmentGroupEdits = useCallback(
    async (next: InstallmentGroupEditsState) => {
      await saveInstallmentGroupEdits(next);
      setInstallmentGroupEdits(next);
    },
    [],
  );

  const persistPaymentStatus = useCallback(async (next: PaymentStatusState) => {
    await savePaymentStatus(next);
    setPaymentStatusState(next);
  }, []);

  const persistRecurring = useCallback(async (next: RecurringRule[]) => {
    const normalized = next.map(normalizeRecurringRule);
    await saveRecurring(normalized);
    setRecurringRules(normalized);
  }, []);

  const persistBudgets = useCallback(async (next: CategoryBudget[]) => {
    await saveBudgets(next);
    setBudgetsState(next);
  }, []);

  const persistSubscriptionDismissals = useCallback(async (next: string[]) => {
    const unique = [...new Set(next)];
    await saveSubscriptionDismissals(unique);
    setSubscriptionDismissals(unique);
  }, []);

  const persistAliases = useCallback(async (next: EstablishmentAlias[]) => {
    await saveAliases(next);
    setEstablishmentAliases(next);
  }, []);

  const persistStructuralCategories = useCallback(async (next: string[]) => {
    const normalized = [
      ...new Set(next.map((c) => normalizeBudgetCategory(c))),
    ];
    await saveStructuralCategories(normalized);
    setStructuralCategoriesState(normalized);
  }, []);

  const importedRaw = useMemo(
    () => dataset.sources.flatMap((s) => s.raw),
    [dataset.sources],
  );

  const recurringExpansionEnd = useMemo(
    () => addDaysIso(todayIso(), settings.projectionHorizonDays),
    [settings.projectionHorizonDays],
  );

  const recurringRaw = useMemo(
    () =>
      expandRecurringRules(
        recurringRules.filter((r) => r.ativo),
        new Date(),
        recurringExpansionEnd,
      ),
    [recurringRules, recurringExpansionEnd],
  );

  const allRaw = useMemo(
    () => [...importedRaw, ...manualTransactions, ...recurringRaw],
    [importedRaw, manualTransactions, recurringRaw],
  );

  const findOriginalRaw = useCallback(
    (rawId: string): TransactionRaw | undefined =>
      allRaw.find((r) => r.id === rawId),
    [allRaw],
  );

  const rawIdsForGroupKey = useCallback(
    (groupKey: string): string[] =>
      allRaw
        .filter((r) => r.installment?.groupKey === groupKey)
        .map((r) => r.id),
    [allRaw],
  );

  const { effective } = useMemo(
    () => applyEdits(allRaw, edits, installmentGroupEdits),
    [allRaw, edits, installmentGroupEdits],
  );

  const compiledAliases = useMemo(
    () => compileAliases(establishmentAliases),
    [establishmentAliases],
  );

  const normalized = useMemo<TransactionNormalized[]>(() => {
    if (effective.length === 0) return [];
    return normalizeTransactions(effective, rules, compiledAliases);
  }, [effective, rules, compiledAliases]);

  const deletedNormalized = useMemo<TransactionNormalized[]>(() => {
    const deleted = getDeletedRaws(allRaw, edits, installmentGroupEdits);
    if (deleted.length === 0) return [];
    return normalizeTransactions(deleted, rules, compiledAliases);
  }, [allRaw, edits, installmentGroupEdits, rules, compiledAliases]);

  const deletedCount = useMemo(
    () => countDeleted(allRaw, edits, installmentGroupEdits),
    [allRaw, edits, installmentGroupEdits],
  );

  const achievementsRef = useRef(achievements);
  achievementsRef.current = achievements;

  const dismissAchievementToast = useCallback(() => {
    setPendingAchievementToasts((q) => q.slice(1));
  }, []);

  useEffect(() => {
    if (!loaded) return;
    const prev = achievementsRef.current;
    const result = evaluateAchievements({
      normalized,
      manualTransactions,
      accounts,
      recurringRules,
      structuralCategories,
      snapshot: prev,
      monthCloses,
      poupanca: settings.poupanca,
    });
    const prevIds = new Set(prev.unlocked.map((a) => a.id));
    const nextIds = new Set(result.snapshot.unlocked.map((a) => a.id));
    const unlockedChanged =
      prevIds.size !== nextIds.size ||
      [...nextIds].some((id) => !prevIds.has(id));
    const metaChanged =
      result.snapshot.meta.lastStreak !== prev.meta.lastStreak ||
      result.snapshot.meta.lastSobraTotal !== prev.meta.lastSobraTotal;
    if (unlockedChanged || metaChanged) {
      achievementsRef.current = result.snapshot;
      void saveAchievements(result.snapshot).then(() =>
        setAchievementsState(result.snapshot),
      );
    }
    if (result.newlyUnlocked.length > 0 && settings.showAchievements !== false) {
      setPendingAchievementToasts((q) => [
        ...q,
        ...result.newlyUnlocked.map((a) => a.id),
      ]);
    }
  }, [
    loaded,
    normalized,
    manualTransactions,
    accounts,
    recurringRules,
    structuralCategories,
    monthCloses,
    settings.showAchievements,
    settings.poupanca,
  ]);

  const closeMonth = useCallback(async (entry: MonthCloseEntry) => {
    const next = await appendMonthClose(entry, monthCloses);
    setMonthClosesState(next);
  }, [monthCloses]);

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
      const { dataset: cleanedDataset, removedRawIds } =
        removeStaleEstimatedInstallments(
          { sources: dataset.sources },
          nextSource.raw,
        );
      if (removedRawIds.length > 0) {
        const nextEdits = pruneEditsForRawIds(edits, removedRawIds);
        if (nextEdits !== edits) {
          await persistEdits(nextEdits);
        }
      }
      const next: Dataset = {
        sources: [...cleanedDataset.sources, nextSource],
      };
      await persistDataset(next);
    },
    [accounts, dataset.sources, edits, persistAccounts, persistDataset, persistEdits, settings],
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
    setInstallmentGroupEdits({ ...EMPTY_INSTALLMENT_GROUP_EDITS });
    setPaymentStatusState({ ...EMPTY_PAYMENT_STATUS });
    setBudgetsState([]);
    setSubscriptionDismissals([]);
    setEstablishmentAliases([]);
    setStructuralCategoriesState([]);
    setAchievementsState(EMPTY_ACHIEVEMENTS);
    setMonthClosesState(EMPTY_MONTH_CLOSES);
    setPendingAchievementToasts([]);
    setLastBackupAt(null);
  }, []);

  const dismissSubscription = useCallback(
    async (key: string) => {
      if (subscriptionDismissals.includes(key)) return;
      await persistSubscriptionDismissals([...subscriptionDismissals, key]);
    },
    [subscriptionDismissals, persistSubscriptionDismissals],
  );

  const restoreSubscription = useCallback(
    async (key: string) => {
      await persistSubscriptionDismissals(
        subscriptionDismissals.filter((k) => k !== key),
      );
    },
    [subscriptionDismissals, persistSubscriptionDismissals],
  );

  const exportBackup = useCallback(async () => {
    const backup = await exportAndDownloadBackup();
    setLastBackupAt(backup.exportedAt);
  }, []);

  const addBudget = useCallback(
    async (budget: CategoryBudget) => {
      const dup = budgets.some(
        (b) =>
          budgetCategoryKey(b.categoria) === budgetCategoryKey(budget.categoria) &&
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
          budgetCategoryKey(b.categoria) === budgetCategoryKey(budget.categoria),
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
        installmentGroupEdits,
        accounts,
        manualTransactions,
        budgets,
        subscriptionDismissals,
        establishmentAliases,
        structuralCategories,
        achievements,
        monthCloses,
        paymentStatus,
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
        saveInstallmentGroupEdits(resolved.installmentGroupEdits),
        saveAccounts(resolved.accounts),
        saveManualTransactions(resolved.manualTransactions),
        saveBudgets(resolved.budgets),
        saveSubscriptionDismissals(resolved.subscriptionDismissals),
        saveAliases(resolved.establishmentAliases),
        saveStructuralCategories(resolved.structuralCategories),
        saveAchievements(resolved.achievements),
        saveMonthCloses(resolved.monthCloses),
        savePaymentStatus(resolved.paymentStatus),
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
      setInstallmentGroupEdits(resolved.installmentGroupEdits);
      setBudgetsState(resolved.budgets);
      setSubscriptionDismissals(resolved.subscriptionDismissals);
      setEstablishmentAliases(resolved.establishmentAliases);
      setStructuralCategoriesState(resolved.structuralCategories);
      setAchievementsState(resolved.achievements);
      achievementsRef.current = resolved.achievements;
      setMonthClosesState(resolved.monthCloses);
      setPaymentStatusState(resolved.paymentStatus);
    },
    [
      accounts,
      budgets,
      subscriptionDismissals,
      establishmentAliases,
      structuralCategories,
      achievements,
      monthCloses,
      paymentStatus,
      dataset,
      edits,
      installmentGroupEdits,
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

  const confirmCardAccountCycle = useCallback(
    async (fonte: "inter" | "nubank", cycle: CardCycle) => {
      const result = upsertCardAccountCycle(accounts, fonte, cycle);
      await persistAccounts(result.accounts, settings);
      return result;
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

  const addManualTransactions = useCallback(
    async (
      partials: Array<
        Omit<ManualTransaction, "id" | "fonte" | "sourceId"> &
          Partial<Pick<ManualTransaction, "id">>
      >,
    ) => {
      const def = defaultAccount(accounts);
      const txs = partials.map((p) =>
        newManualTransaction({
          ...p,
          accountId: p.accountId ?? def?.id,
        }),
      );
      await persistManual([...manualTransactions, ...txs]);
      return txs;
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

  const addAlias = useCallback(
    async (alias: EstablishmentAlias) => {
      const dup = establishmentAliases.some(
        (a) =>
          a.canonical.toLowerCase() === alias.canonical.toLowerCase() &&
          a.id !== alias.id,
      );
      if (dup) {
        throw new Error("Já existe apelido com este nome canônico.");
      }
      await persistAliases([...establishmentAliases, alias]);
    },
    [establishmentAliases, persistAliases],
  );

  const updateAlias = useCallback(
    async (alias: EstablishmentAlias) => {
      const dup = establishmentAliases.some(
        (a) =>
          a.id !== alias.id &&
          a.canonical.toLowerCase() === alias.canonical.toLowerCase(),
      );
      if (dup) {
        throw new Error("Já existe apelido com este nome canônico.");
      }
      await persistAliases(
        establishmentAliases.map((a) =>
          a.id === alias.id
            ? { ...alias, atualizadaEm: new Date().toISOString() }
            : a,
        ),
      );
    },
    [establishmentAliases, persistAliases],
  );

  const removeAlias = useCallback(
    async (id: string) => {
      await persistAliases(establishmentAliases.filter((a) => a.id !== id));
    },
    [establishmentAliases, persistAliases],
  );

  const setStructuralCategories = useCallback(
    async (categories: string[]) => {
      await persistStructuralCategories(categories);
    },
    [persistStructuralCategories],
  );

  const toggleStructuralCategory = useCallback(
    async (categoria: string) => {
      const cat = normalizeBudgetCategory(categoria);
      const has = structuralCategories.some(
        (c) => normalizeBudgetCategory(c) === cat,
      );
      if (has) {
        await persistStructuralCategories(
          structuralCategories.filter(
            (c) => normalizeBudgetCategory(c) !== cat,
          ),
        );
        return;
      }
      await persistStructuralCategories([...structuralCategories, cat]);
    },
    [structuralCategories, persistStructuralCategories],
  );

  const editTransaction = useCallback(
    async (rawId: string, patch: TransactionEditPatch) => {
      const manual = manualTransactions.find((t) => t.id === rawId);
      if (manual && isManualQuickRaw(manual)) {
        await updateManualTransaction(rawId, patch);
        return;
      }
      const raw = findOriginalRaw(rawId);
      if (raw && isRecurringRaw(raw)) {
        if (!allowsPerMonthRecurringEdit(raw)) return;
        const recurringPatch = pickRecurringMonthlyPatch(patch);
        if (Object.keys(recurringPatch).length === 0) return;
        await persistEdits({
          ...edits,
          [rawId]: buildEditEntry(rawId, edits[rawId], recurringPatch),
        });
        return;
      }
      const groupKey = raw?.installment?.groupKey;
      if (groupKey) {
        const groupPatch = pickGroupPatch(patch);
        const individualPatch = pickIndividualPatch(patch);
        const groupKeys = Object.keys(groupPatch);
        const individualKeys = Object.keys(individualPatch);
        if (groupKeys.length > 0) {
          await persistInstallmentGroupEdits({
            ...installmentGroupEdits,
            [groupKey]: buildGroupEditEntry(
              groupKey,
              installmentGroupEdits[groupKey],
              groupPatch,
            ),
          });
        }
        if (individualKeys.length > 0) {
          await persistEdits({
            ...edits,
            [rawId]: buildEditEntry(rawId, edits[rawId], individualPatch),
          });
        }
        return;
      }
      const next = {
        ...edits,
        [rawId]: buildEditEntry(rawId, edits[rawId], patch),
      };
      await persistEdits(next);
    },
    [
      edits,
      findOriginalRaw,
      installmentGroupEdits,
      manualTransactions,
      persistEdits,
      persistInstallmentGroupEdits,
      updateManualTransaction,
    ],
  );

  const revertTransaction = useCallback(
    async (rawId: string) => {
      if (manualTransactions.some((t) => t.id === rawId && isManualQuickRaw(t))) {
        return;
      }
      const raw = findOriginalRaw(rawId);
      const groupKey = raw?.installment?.groupKey;
      if (groupKey && installmentGroupEdits[groupKey]) {
        const rawIds = rawIdsForGroupKey(groupKey);
        await persistEdits(pruneEditsForRawIds(edits, rawIds));
        const nextGroupEdits = { ...installmentGroupEdits };
        delete nextGroupEdits[groupKey];
        await persistInstallmentGroupEdits(nextGroupEdits);
        return;
      }
      if (!edits[rawId]) return;
      const next = { ...edits };
      delete next[rawId];
      await persistEdits(next);
    },
    [
      edits,
      findOriginalRaw,
      installmentGroupEdits,
      manualTransactions,
      persistEdits,
      persistInstallmentGroupEdits,
      rawIdsForGroupKey,
    ],
  );

  const deleteTransaction = useCallback(
    async (rawId: string) => {
      const manual = manualTransactions.find((t) => t.id === rawId);
      if (manual && isManualQuickRaw(manual)) {
        await removeManualTransaction(rawId);
        return;
      }
      const raw = findOriginalRaw(rawId);
      const groupKey = raw?.installment?.groupKey;
      if (groupKey) {
        const rawIds = rawIdsForGroupKey(groupKey);
        const prunedEdits = pruneEditsForRawIds(edits, rawIds);
        if (prunedEdits !== edits) {
          await persistEdits(prunedEdits);
        }
        await persistInstallmentGroupEdits({
          ...installmentGroupEdits,
          [groupKey]: {
            ...installmentGroupEdits[groupKey],
            groupKey,
            editedAt: new Date().toISOString(),
            deleted: true,
          },
        });
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
    [
      edits,
      findOriginalRaw,
      installmentGroupEdits,
      manualTransactions,
      persistEdits,
      persistInstallmentGroupEdits,
      rawIdsForGroupKey,
      removeManualTransaction,
    ],
  );

  const restoreTransaction = useCallback(
    async (rawId: string) => {
      const raw = findOriginalRaw(rawId);
      const groupKey = raw?.installment?.groupKey;
      if (groupKey) {
        const existing = installmentGroupEdits[groupKey];
        if (existing?.deleted) {
          const { deleted: _d, ...rest } = existing;
          if (!hasGroupFieldEdits(rest as typeof existing)) {
            const nextGroupEdits = { ...installmentGroupEdits };
            delete nextGroupEdits[groupKey];
            await persistInstallmentGroupEdits(nextGroupEdits);
            return;
          }
          await persistInstallmentGroupEdits({
            ...installmentGroupEdits,
            [groupKey]: {
              ...rest,
              groupKey,
              editedAt: new Date().toISOString(),
            },
          });
          return;
        }
      }
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
    [
      edits,
      findOriginalRaw,
      installmentGroupEdits,
      persistEdits,
      persistInstallmentGroupEdits,
    ],
  );

  const setPaymentStatus = useCallback(
    async (rawId: string, status: PaymentStatus | null) => {
      if (status === null) {
        if (!paymentStatus[rawId]) return;
        const next = { ...paymentStatus };
        delete next[rawId];
        await persistPaymentStatus(next);
        return;
      }
      await persistPaymentStatus({
        ...paymentStatus,
        [rawId]: {
          rawId,
          status,
          updatedAt: new Date().toISOString(),
        },
      });
    },
    [paymentStatus, persistPaymentStatus],
  );

  const hasData =
    dataset.sources.length > 0 || manualTransactions.length > 0;
  const hasActiveRecurring = recurringRules.some((r) => r.ativo);
  const hasAnalysis = hasData || hasActiveRecurring;

  const value = useMemo<Ctx>(
    () => ({
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
      installmentGroupEdits,
      paymentStatus,
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
      confirmCardAccountCycle,
      removeAccount,
      setDefaultAccount,
      addManualTransaction,
      addManualTransactions,
      updateManualTransaction,
      removeManualTransaction,
      editTransaction,
      revertTransaction,
      deleteTransaction,
      restoreTransaction,
      setPaymentStatus,
      budgets,
      addBudget,
      updateBudget,
      removeBudget,
      toggleBudget,
      lastBackupAt,
      exportBackup,
      importBackup,
      subscriptionDismissals,
      dismissSubscription,
      restoreSubscription,
      establishmentAliases,
      addAlias,
      updateAlias,
      removeAlias,
      structuralCategories,
      setStructuralCategories,
      toggleStructuralCategory,
      achievements,
      monthCloses,
      closeMonth,
      pendingAchievementToasts,
      dismissAchievementToast,
    }),
    [
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
      installmentGroupEdits,
      paymentStatus,
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
      resetRulesFn,
      updateSettings,
      addAccount,
      updateAccount,
      confirmCardAccountCycle,
      removeAccount,
      setDefaultAccount,
      addManualTransaction,
      addManualTransactions,
      updateManualTransaction,
      removeManualTransaction,
      editTransaction,
      revertTransaction,
      deleteTransaction,
      restoreTransaction,
      setPaymentStatus,
      budgets,
      addBudget,
      updateBudget,
      removeBudget,
      toggleBudget,
      lastBackupAt,
      exportBackup,
      importBackup,
      subscriptionDismissals,
      dismissSubscription,
      restoreSubscription,
      establishmentAliases,
      addAlias,
      updateAlias,
      removeAlias,
      structuralCategories,
      setStructuralCategories,
      toggleStructuralCategory,
      achievements,
      monthCloses,
      closeMonth,
      pendingAchievementToasts,
      dismissAchievementToast,
    ],
  );

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
