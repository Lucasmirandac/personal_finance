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
  applyEdits,
  buildEditEntry,
  countDeleted,
  EMPTY_EDITS,
  getDeletedRaws,
  pruneEditsForRawIds,
  TransactionEditPatch,
} from "./edits";
import { normalizeTransactions } from "./normalize";
import { expandRecurringRules } from "./recurring";
import {
  clearAllData,
  loadDataset,
  loadEdits,
  loadRecurring,
  loadRules,
  loadSettings,
  resetRules as resetRulesStorage,
  saveDataset,
  saveEdits,
  saveRecurring,
  saveRules,
  saveSettings,
} from "./storage";
import {
  Dataset,
  EditsState,
  EMPTY_DATASET,
  RecurringRule,
  Rules,
  DEFAULT_RULES,
  DEFAULT_SETTINGS,
  Settings,
  Source,
  TransactionNormalized,
  TransactionRaw,
} from "./types";

type Ctx = {
  loaded: boolean;
  dataset: Dataset;
  hasData: boolean;
  hasAnalysis: boolean;
  recurringRules: RecurringRule[];
  rules: Rules;
  settings: Settings;
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
  editTransaction: (rawId: string, patch: TransactionEditPatch) => Promise<void>;
  revertTransaction: (rawId: string) => Promise<void>;
  deleteTransaction: (rawId: string) => Promise<void>;
  restoreTransaction: (rawId: string) => Promise<void>;
};

const AppContext = createContext<Ctx | null>(null);

export function AppStoreProvider({ children }: { children: React.ReactNode }) {
  const [loaded, setLoaded] = useState(false);
  const [dataset, setDatasetState] = useState<Dataset>(EMPTY_DATASET);
  const [recurringRules, setRecurringRules] = useState<RecurringRule[]>([]);
  const [rules, setRules] = useState<Rules>(DEFAULT_RULES);
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const [edits, setEdits] = useState<EditsState>(EMPTY_EDITS);

  useEffect(() => {
    let alive = true;
    (async () => {
      const [d, r, rec, s, e] = await Promise.all([
        loadDataset(),
        loadRules(),
        loadRecurring(),
        loadSettings(),
        loadEdits(),
      ]);
      if (!alive) return;
      setDatasetState(d);
      setRules(r);
      setRecurringRules(rec);
      setSettings(s);
      setEdits(e);
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

  const persistEdits = useCallback(async (next: EditsState) => {
    await saveEdits(next);
    setEdits(next);
  }, []);

  const persistRecurring = useCallback(async (next: RecurringRule[]) => {
    await saveRecurring(next);
    setRecurringRules(next);
  }, []);

  const importedRaw = useMemo(
    () => dataset.sources.flatMap((s) => s.raw),
    [dataset.sources],
  );

  const findOriginalRaw = useCallback(
    (rawId: string): TransactionRaw | undefined =>
      importedRaw.find((r) => r.id === rawId),
    [importedRaw],
  );

  const manualRaw = useMemo(
    () => expandRecurringRules(recurringRules.filter((r) => r.ativo)),
    [recurringRules],
  );

  const allRaw = useMemo(
    () => [...importedRaw, ...manualRaw],
    [importedRaw, manualRaw],
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
      const next: Dataset = { sources: [...dataset.sources, source] };
      await persistDataset(next);
    },
    [dataset.sources, persistDataset],
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
    setEdits({ ...EMPTY_EDITS });
  }, []);

  const updateSettings = useCallback(async (next: Settings) => {
    await saveSettings(next);
    setSettings(next);
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

  const editTransaction = useCallback(
    async (rawId: string, patch: TransactionEditPatch) => {
      const next = {
        ...edits,
        [rawId]: buildEditEntry(rawId, edits[rawId], patch),
      };
      await persistEdits(next);
    },
    [edits, persistEdits],
  );

  const revertTransaction = useCallback(
    async (rawId: string) => {
      if (!edits[rawId]) return;
      const next = { ...edits };
      delete next[rawId];
      await persistEdits(next);
    },
    [edits, persistEdits],
  );

  const deleteTransaction = useCallback(
    async (rawId: string) => {
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
    [edits, persistEdits],
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
    settings,
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
    editTransaction,
    revertTransaction,
    deleteTransaction,
    restoreTransaction,
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
