"use client";

import clsx from "clsx";
import { useEffect, useRef, useState } from "react";
import { formatDateRangeCaption } from "@/lib/format";
import {
  computePreset,
  DATE_PRESETS,
  DatePresetId,
  normalizeDateRange,
} from "@/lib/datePresets";
import { Input } from "@/components/ui/Input";

type Props = {
  dateFrom: string | null;
  dateTo: string | null;
  datasetMin: string | null;
  datasetMax: string | null;
  onChange: (from: string | null, to: string | null) => void;
};

export function DateRangePicker({
  dateFrom,
  dateTo,
  datasetMin,
  datasetMax,
  onChange,
}: Props) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (!wrapRef.current) return;
      if (!wrapRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  function applyRange(from: string | null, to: string | null) {
    const norm = normalizeDateRange(from, to);
    onChange(norm.from, norm.to);
  }

  function applyPreset(id: DatePresetId) {
    if (!datasetMax) return;
    const range = computePreset(id, datasetMax);
    onChange(range.from, range.to);
    setOpen(false);
  }

  const caption = formatDateRangeCaption(dateFrom, dateTo);
  const min = datasetMin ?? undefined;
  const max = datasetMax ?? undefined;

  return (
    <div className="flex flex-col gap-1" ref={wrapRef}>
      <span className="text-xs text-muted">Período</span>
      <div className="flex flex-col gap-2">
        <div className="flex gap-2 flex-wrap">
          <div className="relative flex-1 min-w-[120px]">
            <button
              type="button"
              className="bg-surface border border-border rounded-md px-2.5 py-1.5 text-[13px] text-foreground w-full focus:outline focus:outline-1 focus:outline-border-strong focus:border-border-strong text-left flex items-center justify-between disabled:opacity-50 disabled:cursor-not-allowed"
              onClick={() => setOpen((v) => !v)}
              disabled={!datasetMax}
            >
              <span className={clsx(!caption && "text-muted")}>
                {caption ?? "Todo o período"}
              </span>
              <span className="ml-2 text-muted">▾</span>
            </button>
            {open && datasetMax && (
              <div className="absolute z-30 mt-1 w-full min-w-[200px] bg-surface border border-border rounded-lg p-1">
                {DATE_PRESETS.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    className="w-full text-left px-2 py-1.5 text-sm rounded hover:bg-surface-2"
                    onClick={() => applyPreset(p.id)}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label
              className="text-[10px] text-muted uppercase tracking-wide"
              htmlFor="date-range-from"
            >
              De
            </label>
            <Input
              id="date-range-from"
              type="date"
              className="mt-0.5"
              min={min}
              max={max}
              value={dateFrom ?? ""}
              onChange={(e) =>
                applyRange(e.target.value || null, dateTo)
              }
            />
          </div>
          <div>
            <label
              className="text-[10px] text-muted uppercase tracking-wide"
              htmlFor="date-range-to"
            >
              Até
            </label>
            <Input
              id="date-range-to"
              type="date"
              className="mt-0.5"
              min={min}
              max={max}
              value={dateTo ?? ""}
              onChange={(e) =>
                applyRange(dateFrom, e.target.value || null)
              }
            />
          </div>
        </div>
      </div>
    </div>
  );
}
