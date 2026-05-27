"use client"

import Link from "next/link"
import { useMemo, useState } from "react"
import { AlertTriangle, Calendar, CircleDollarSign, PiggyBank, Repeat, Wrench } from "lucide-react"
import clsx from "clsx"
import { PainelAlert } from "@/lib/alerts"

type Props = {
  alerts: PainelAlert[]
}

const iconMap = {
  alert: AlertTriangle,
  calendar: Calendar,
  wallet: CircleDollarSign,
  wrench: Wrench,
  piggybank: PiggyBank,
  income: CircleDollarSign,
  repeat: Repeat,
}

const accentClassMap = {
  red: "text-[var(--system-red)] bg-[color-mix(in_oklab,var(--system-red)_12%,transparent)]",
  orange:
    "text-[var(--system-orange)] bg-[color-mix(in_oklab,var(--system-orange)_12%,transparent)]",
  yellow:
    "text-[var(--system-yellow)] bg-[color-mix(in_oklab,var(--system-yellow)_12%,transparent)]",
  green:
    "text-[var(--system-green)] bg-[color-mix(in_oklab,var(--system-green)_12%,transparent)]",
  blue: "text-[var(--system-blue)] bg-[color-mix(in_oklab,var(--system-blue)_12%,transparent)]",
  indigo:
    "text-[var(--system-indigo)] bg-[color-mix(in_oklab,var(--system-indigo)_12%,transparent)]",
}

export function AlertsBar({ alerts }: Props) {
  const [expanded, setExpanded] = useState(false)
  const visible = useMemo(() => (expanded ? alerts : alerts.slice(0, 3)), [alerts, expanded])

  if (alerts.length === 0) {
    return (
      <p className="rounded-2xl bg-[color-mix(in_oklab,var(--system-green)_10%,transparent)] px-4 py-3 text-xs text-muted">
        Tudo tranquilo por aqui
      </p>
    )
  }

  return (
    <section className="space-y-2">
      {visible.map((alert) => {
        const Icon = iconMap[alert.icon]
        const content = (
          <>
            <span
              className={clsx(
                "inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl",
                accentClassMap[alert.accent],
              )}
            >
              <Icon size={16} />
            </span>
            <span className="min-w-0">
              <span className="block truncate text-sm font-medium">{alert.title}</span>
              <span className="block truncate text-xs text-muted">{alert.detail}</span>
            </span>
          </>
        )
        if (!alert.href) {
          return (
            <div key={alert.id} className="flex items-center gap-3 rounded-2xl bg-surface px-4 py-3 ring-1 ring-border/60">
              {content}
            </div>
          )
        }
        return (
          <Link
            key={alert.id}
            href={alert.href}
            className="flex items-center gap-3 rounded-2xl bg-surface px-4 py-3 ring-1 ring-border/60 transition-colors hover:bg-surface-2"
          >
            {content}
          </Link>
        )
      })}
      {alerts.length > 3 && (
        <button
          type="button"
          className="text-xs text-muted hover:text-foreground"
          onClick={() => setExpanded((state) => !state)}
        >
          {expanded ? "Ver menos" : `Ver mais ${alerts.length - 3}`}
        </button>
      )}
    </section>
  )
}
