"use client";

import { useEffect, useRef, useState } from "react";
import clsx from "clsx";

type Option = { value: string; label?: string };

type Props = {
  label: string;
  options: Option[];
  values: string[];
  onChange: (next: string[]) => void;
  placeholder?: string;
};

export function MultiSelect({
  label,
  options,
  values,
  onChange,
  placeholder = "Todos",
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

  function toggle(v: string) {
    if (values.includes(v)) onChange(values.filter((x) => x !== v));
    else onChange([...values, v]);
  }

  const summary =
    values.length === 0
      ? placeholder
      : values.length === 1
        ? options.find((o) => o.value === values[0])?.label ?? values[0]
        : `${values.length} selecionados`;

  return (
    <div className="flex flex-col gap-1" ref={wrapRef}>
      <span className="text-xs subtle">{label}</span>
      <div className="relative">
        <button
          type="button"
          className="input text-left flex items-center justify-between"
          onClick={() => setOpen((v) => !v)}
        >
          <span className={clsx(values.length === 0 && "subtle")}>{summary}</span>
          <span className="ml-2 subtle">▾</span>
        </button>
        {open && (
          <div className="absolute z-30 mt-1 w-full max-h-72 overflow-auto card p-1">
            <button
              type="button"
              className="w-full text-left text-xs px-2 py-1 subtle hover:bg-[var(--surface-2)] rounded"
              onClick={() => onChange([])}
            >
              Limpar seleção
            </button>
            {options.map((o) => {
              const checked = values.includes(o.value);
              return (
                <label
                  key={o.value}
                  className={clsx(
                    "flex items-center gap-2 px-2 py-1 rounded text-sm hover:bg-[var(--surface-2)] cursor-pointer",
                    checked && "bg-[var(--surface-2)]",
                  )}
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => toggle(o.value)}
                  />
                  <span>{o.label ?? o.value}</span>
                </label>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
