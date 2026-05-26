"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { Dataset, Rules, DEFAULT_RULES, TransactionNormalized } from "./types";
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
  dataset: Dataset | null;
  rules: Rules;
  normalized: TransactionNormalized[];
  setDataset: (dataset: Dataset | null) => Promise<void>;
  resetDataset: () => Promise<void>;
  updateRules: (rules: Rules) => Promise<void>;
  resetRules: () => Promise<void>;
};

const AppContext = createContext<Ctx | null>(null);

export function AppStoreProvider({ children }: { children: React.ReactNode }) {
  const [loaded, setLoaded] = useState(false);
  const [dataset, setDatasetState] = useState<Dataset | null>(null);
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

  const setDataset = useCallback(async (next: Dataset | null) => {
    if (next) {
      await saveDataset(next);
    } else {
      await clearDataset();
    }
    setDatasetState(next);
  }, []);

  const resetDataset = useCallback(async () => {
    await clearDataset();
    setDatasetState(null);
  }, []);

  const updateRules = useCallback(async (next: Rules) => {
    await saveRules(next);
    setRules(next);
  }, []);

  const resetRulesFn = useCallback(async () => {
    const r = await resetRulesStorage();
    setRules(r);
  }, []);

  const normalized = useMemo<TransactionNormalized[]>(() => {
    if (!dataset) return [];
    return normalizeTransactions(dataset.raw, rules);
  }, [dataset, rules]);

  const value: Ctx = {
    loaded,
    dataset,
    rules,
    normalized,
    setDataset,
    resetDataset,
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
