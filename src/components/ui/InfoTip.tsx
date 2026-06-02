"use client";

import {
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";
import clsx from "clsx";
import { Info } from "lucide-react";

type Placement = "top" | "bottom";

type Props = {
  content: ReactNode;
  label?: string;
  className?: string;
};

const GAP = 8;
const VIEWPORT_PAD = 8;

function canHover(): boolean {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(hover: hover) and (pointer: fine)").matches;
}

export function InfoTip({ content, label = "Mais informações", className }: Props) {
  const id = useId();
  const triggerRef = useRef<HTMLButtonElement>(null);
  const [open, setOpen] = useState(false);
  const [placement, setPlacement] = useState<Placement>("top");
  const [coords, setCoords] = useState({ top: 0, left: 0 });

  const updatePosition = useCallback(() => {
    const el = triggerRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const spaceAbove = rect.top;
    const spaceBelow = window.innerHeight - rect.bottom;
    const place: Placement =
      spaceAbove >= spaceBelow && spaceAbove > 80 ? "top" : "bottom";
    setPlacement(place);
    const top =
      place === "top"
        ? rect.top - GAP
        : rect.bottom + GAP;
    setCoords({
      top,
      left: rect.left + rect.width / 2,
    });
  }, []);

  const openTip = useCallback(() => {
    updatePosition();
    setOpen(true);
  }, [updatePosition]);

  const closeTip = useCallback(() => setOpen(false), []);

  useEffect(() => {
    if (!open) return;
    updatePosition();
    const onScrollOrResize = () => updatePosition();
    window.addEventListener("scroll", onScrollOrResize, true);
    window.addEventListener("resize", onScrollOrResize);
    return () => {
      window.removeEventListener("scroll", onScrollOrResize, true);
      window.removeEventListener("resize", onScrollOrResize);
    };
  }, [open, updatePosition]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeTip();
    };
    const onPointerDown = (e: PointerEvent) => {
      const target = e.target as Node;
      if (triggerRef.current?.contains(target)) return;
      closeTip();
    };
    document.addEventListener("keydown", onKey);
    document.addEventListener("pointerdown", onPointerDown);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("pointerdown", onPointerDown);
    };
  }, [open, closeTip]);

  const handleClick = () => {
    if (open) closeTip();
    else openTip();
  };

  const balloon =
    open && typeof document !== "undefined"
      ? createPortal(
          <div
            id={id}
            role="tooltip"
            className={clsx(
              "pointer-events-none fixed z-[200] max-w-[16rem] -translate-x-1/2 rounded-xl bg-surface px-3 py-2 text-xs leading-relaxed text-foreground shadow-[var(--shadow-card-lg)] ring-1 ring-border/80",
              placement === "top" && "-translate-y-full",
            )}
            style={{ top: coords.top, left: coords.left }}
          >
            {content}
          </div>,
          document.body,
        )
      : null;

  return (
    <span className={clsx("inline-flex shrink-0 align-middle", className)}>
      <button
        ref={triggerRef}
        type="button"
        aria-label={label}
        aria-describedby={open ? id : undefined}
        aria-expanded={open}
        className="inline-flex h-4 w-4 items-center justify-center rounded-full text-muted transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40"
        onClick={handleClick}
        onMouseEnter={() => {
          if (canHover()) openTip();
        }}
        onMouseLeave={() => {
          if (canHover()) closeTip();
        }}
        onFocus={() => {
          if (canHover()) openTip();
        }}
        onBlur={() => {
          if (canHover()) closeTip();
        }}
      >
        <Info size={12} strokeWidth={2.25} aria-hidden />
      </button>
      {balloon}
    </span>
  );
}
