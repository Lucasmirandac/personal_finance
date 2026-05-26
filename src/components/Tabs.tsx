"use client";

import clsx from "clsx";
import { useCallback, useRef } from "react";

export type TabItem = {
  id: string;
  label: string;
};

type Props = {
  tabs: TabItem[];
  active: string;
  onChange: (id: string) => void;
  children: React.ReactNode;
};

export function Tabs({ tabs, active, onChange, children }: Props) {
  const listRef = useRef<HTMLDivElement>(null);

  const onKeyDown = useCallback(
    (e: React.KeyboardEvent, currentId: string) => {
      const idx = tabs.findIndex((t) => t.id === currentId);
      if (idx < 0) return;
      let next = idx;
      if (e.key === "ArrowRight") {
        e.preventDefault();
        next = (idx + 1) % tabs.length;
      } else if (e.key === "ArrowLeft") {
        e.preventDefault();
        next = (idx - 1 + tabs.length) % tabs.length;
      } else {
        return;
      }
      onChange(tabs[next].id);
      const buttons = listRef.current?.querySelectorAll<HTMLButtonElement>(
        '[role="tab"]',
      );
      buttons?.[next]?.focus();
    },
    [tabs, onChange],
  );

  return (
    <div>
      <div
        ref={listRef}
        className="tab-list"
        role="tablist"
        aria-label="Seções do dashboard"
      >
        {tabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={active === tab.id}
            aria-controls={`panel-${tab.id}`}
            id={`tab-${tab.id}`}
            data-active={active === tab.id}
            className="tab-trigger"
            onClick={() => onChange(tab.id)}
            onKeyDown={(e) => onKeyDown(e, tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </div>
      <div
        role="tabpanel"
        id={`panel-${active}`}
        aria-labelledby={`tab-${active}`}
        className={clsx("pt-4")}
      >
        {children}
      </div>
    </div>
  );
}
