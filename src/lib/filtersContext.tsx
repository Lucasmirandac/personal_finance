"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
} from "react";
import { EMPTY_FILTERS, Filters } from "./aggregations";

type FiltersCtx = {
  filters: Filters;
  setFilters: (f: Filters) => void;
  clearFilters: () => void;
};

const FiltersContext = createContext<FiltersCtx | null>(null);

export function FiltersProvider({ children }: { children: React.ReactNode }) {
  const [filters, setFilters] = useState<Filters>(EMPTY_FILTERS);
  const clearFilters = useCallback(() => setFilters(EMPTY_FILTERS), []);

  const value = useMemo(
    () => ({ filters, setFilters, clearFilters }),
    [filters, clearFilters],
  );

  return (
    <FiltersContext.Provider value={value}>{children}</FiltersContext.Provider>
  );
}

export function useFilters(): FiltersCtx {
  const ctx = useContext(FiltersContext);
  if (!ctx) {
    throw new Error("useFilters must be used inside <FiltersProvider>");
  }
  return ctx;
}
