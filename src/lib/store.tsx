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
  Dataset,
  EMPTY_DATASET,
  RecurringRule,
  Rules,
  DEFAULT_RULES,
  Source,
  TransactionNormalized,
} from "./types";
import {
  loadDataset,
  saveDataset,
  clearAllData,
  loadRules,
  saveRules,
  resetRules as resetRulesStorage,
  loadRecurring,
  saveRecurring,
} from "./storage";
import { normalizeTransactions } from "./normalize";
import { expandRecurringRules } from "./recurring";

type Ctx = {
  loaded: boolean;
  dataset: Dataset;
  hasData: boolean;
  hasAnalysis: boolean;
  recurringRules: RecurringRule[];
  rules: Rules;
  normalized: TransactionNormalized[];
  addSource: (source: Source) => Promise<void>;
  removeSource: (id: string) => Promise<void>;
  clearAllSources: () => Promise<void>;
  addRecurring: (rule: RecurringRule) => Promise<void>;
  updateRecurring: (rule: RecurringRule) => Promise<void>;
  removeRecurring: (id: string) => Promise<void>;
  toggleRecurring: (id: string) => Promise<void>;
  updateRules: (rules: Rules) => Promise<void>;
  resetRules: () => Promise<void>;
};

const AppContext = createContext<Ctx | null>(null);

export function AppStoreProvider({ children }: { children: React.ReactNode }) {
  const [loaded, setLoaded] = useState(false);
  const [dataset, setDatasetState] = useState<Dataset>(EMPTY_DATASET);
  const [recurringRules, setRecurringRules] = useState<RecurringRule[]>([]);
  const [rules, setRules] = useState<Rules>(DEFAULT_RULES);

  useEffect(() => {
    let alive = true;
    (async () => {
      const [d, r, rec] = await Promise.all([
        loadDataset(),
        loadRules(),
        loadRecurring(),
      ]);
      if (!alive) return;
      setDatasetState(d);
      setRules(r);
      setRecurringRules(rec);
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

  const persistRecurring = useCallback(async (next: RecurringRule[]) => {
    await saveRecurring(next);
    setRecurringRules(next);
  }, []);

  const addSource = useCallback(
    async (source: Source) => {
      const next: Dataset = { sources: [...dataset.sources, source] };
      await persistDataset(next);
    },
    [dataset.sources, persistDataset],
  );

  const removeSource = useCallback(
    async (id: string) => {
      const next: Dataset = {
        sources: dataset.sources.filter((s) => s.id !== id),
      };
      await persistDataset(next);
    },
    [dataset.sources, persistDataset],
  );

  const clearAllSources = useCallback(async () => {
    await clearAllData();
    setDatasetState({ ...EMPTY_DATASET });
    setRecurringRules([]);
  }, []);

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

  const manualRaw = useMemo(
    () => expandRecurringRules(recurringRules.filter((r) => r.ativo)),
    [recurringRules],
  );

  const allRaw = useMemo(
    () => [...dataset.sources.flatMap((s) => s.raw), ...manualRaw],
    [dataset.sources, manualRaw],
  );

  const normalized = useMemo<TransactionNormalized[]>(() => {
    if (allRaw.length === 0) return [];
    return normalizeTransactions(allRaw, rules);
  }, [allRaw, rules]);

  const hasData = dataset.sources.length > 0;
  const hasActiveRecurring = recurringRules.some((r) => r.ativo);
  const hasAnalysis = hasData || hasActiveRecurring;

  const value: Ctx = {
    loaded,
    dataset,
    hasData,
    hasAnalysis,
    recurringRules,
    rules,
    normalized,
    addSource,
    removeSource,
    clearAllSources,
    addRecurring,
    updateRecurring,
    removeRecurring,
    toggleRecurring,
    updateRules,
    resetRules: resetRulesFn,
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
