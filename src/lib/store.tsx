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
  Rules,
  DEFAULT_RULES,
  Source,
  TransactionNormalized,
} from "./types";
import {
  loadDataset,
  saveDataset,
  clearDataset,
  loadRules,
  saveRules,
  resetRules as resetRulesStorage,
} from "./storage";
import { normalizeTransactions } from "./normalize";

type Ctx = {
  loaded: boolean;
  dataset: Dataset;
  hasData: boolean;
  rules: Rules;
  normalized: TransactionNormalized[];
  addSource: (source: Source) => Promise<void>;
  removeSource: (id: string) => Promise<void>;
  clearAllSources: () => Promise<void>;
  updateRules: (rules: Rules) => Promise<void>;
  resetRules: () => Promise<void>;
};

const AppContext = createContext<Ctx | null>(null);

export function AppStoreProvider({ children }: { children: React.ReactNode }) {
  const [loaded, setLoaded] = useState(false);
  const [dataset, setDatasetState] = useState<Dataset>(EMPTY_DATASET);
  const [rules, setRules] = useState<Rules>(DEFAULT_RULES);

  useEffect(() => {
    let alive = true;
    (async () => {
      const [d, r] = await Promise.all([loadDataset(), loadRules()]);
      if (!alive) return;
      setDatasetState(d);
      setRules(r);
      setLoaded(true);
    })();
    return () => {
      alive = false;
    };
  }, []);

  const persist = useCallback(async (next: Dataset) => {
    await saveDataset(next);
    setDatasetState(next);
  }, []);

  const addSource = useCallback(
    async (source: Source) => {
      const next: Dataset = {
        sources: [...dataset.sources, source],
      };
      await persist(next);
    },
    [dataset.sources, persist],
  );

  const removeSource = useCallback(
    async (id: string) => {
      const next: Dataset = {
        sources: dataset.sources.filter((s) => s.id !== id),
      };
      await persist(next);
    },
    [dataset.sources, persist],
  );

  const clearAllSources = useCallback(async () => {
    await clearDataset();
    setDatasetState({ ...EMPTY_DATASET });
  }, []);

  const updateRules = useCallback(async (next: Rules) => {
    await saveRules(next);
    setRules(next);
  }, []);

  const resetRulesFn = useCallback(async () => {
    const r = await resetRulesStorage();
    setRules(r);
  }, []);

  const allRaw = useMemo(
    () => dataset.sources.flatMap((s) => s.raw),
    [dataset.sources],
  );

  const normalized = useMemo<TransactionNormalized[]>(() => {
    if (allRaw.length === 0) return [];
    return normalizeTransactions(allRaw, rules);
  }, [allRaw, rules]);

  const hasData = dataset.sources.length > 0;

  const value: Ctx = {
    loaded,
    dataset,
    hasData,
    rules,
    normalized,
    addSource,
    removeSource,
    clearAllSources,
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
