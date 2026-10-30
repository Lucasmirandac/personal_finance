"use client"

import { useEffect, useRef, useState } from "react"
import Link from "next/link"
import clsx from "clsx"
import {
  AlertTriangle,
  Bell,
  Calendar,
  CheckCircle2,
  ChevronRight,
  CircleDollarSign,
  Cloud,
  PiggyBank,
  Repeat,
  Wrench,
} from "lucide-react"
import { Panel } from "@/components/ui/Panel"
import { useAppAlerts } from "@/lib/useAppAlerts"
import type { PainelAlert, PainelAlertAccent } from "@/lib/alerts"

const iconMap = {
  alert: AlertTriangle,
  calendar: Calendar,
  wallet: CircleDollarSign,
  wrench: Wrench,
  piggybank: PiggyBank,
  income: CircleDollarSign,
  repeat: Repeat,
  cloud: Cloud,
}

const accentMap: Record<PainelAlertAccent, string> = {
  red: "text-[var(--system-red)] bg-[color-mix(in_oklab,var(--system-red)_14%,transparent)]",
  orange:
    "text-[var(--system-orange)] bg-[color-mix(in_oklab,var(--system-orange)_14%,transparent)]",
  yellow:
    "text-[var(--system-yellow)] bg-[color-mix(in_oklab,var(--system-yellow)_14%,transparent)]",
  green:
    "text-[var(--system-green)] bg-[color-mix(in_oklab,var(--system-green)_14%,transparent)]",
  blue: "text-[var(--system-blue)] bg-[color-mix(in_oklab,var(--system-blue)_14%,transparent)]",
  indigo:
    "text-[var(--system-indigo)] bg-[color-mix(in_oklab,var(--system-indigo)_14%,transparent)]",
}

export function NotificationBell() {
  const [open, setOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const { alerts, criticalCount, warningCount, hasAlerts } = useAppAlerts()

  // Close on outside click and Escape
  useEffect(() => {
    if (!open) return

    function onDocClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }

    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false)
    }

    document.addEventListener("mousedown", onDocClick)
    document.addEventListener("keydown", onKey)
    return () => {
      document.removeEventListener("mousedown", onDocClick)
      document.removeEventListener("keydown", onKey)
    }
  }, [open])

  const badgeColor =
    criticalCount > 0
      ? "bg-[var(--system-red)] text-white"
      : warningCount > 0
        ? "bg-[var(--system-orange)] text-white"
        : "bg-foreground text-surface"

  return (
    <div className="relative inline-flex items-center" ref={containerRef}>
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className={clsx(
          "relative flex h-8 w-8 items-center justify-center rounded-full border transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-foreground/20",
          open
            ? "border-border-strong bg-surface-2 text-foreground shadow-sm"
            : "border-border/80 bg-surface/80 text-muted shadow-sm hover:border-border-strong hover:bg-surface-2 hover:text-foreground",
        )}
        aria-label={
          hasAlerts
            ? `${alerts.length} alerta${alerts.length === 1 ? "" : "s"} - Ver notificações`
            : "Notificações - Sem novos alertas"
        }
        aria-expanded={open}
        aria-haspopup="dialog"
      >
        <Bell size={15} />

        {hasAlerts && (
          <span
            className={clsx(
              "absolute -right-1 -top-1 flex h-[18px] min-w-[18px] items-center justify-center rounded-full px-1 text-[10px] font-bold leading-none shadow-sm ring-2 ring-[var(--surface)]",
              badgeColor,
            )}
          >
            {alerts.length > 9 ? "9+" : alerts.length}
          </span>
        )}
      </button>

      {open && (
        <Panel
          role="dialog"
          aria-label="Alertas e Notificações"
          className="absolute right-0 top-full z-50 mt-2.5 w-[min(calc(100vw-2rem),24rem)] overflow-hidden rounded-3xl border border-border/80 bg-surface/95 p-0 shadow-[var(--shadow-card-lg)] backdrop-blur-2xl"
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b border-border/60 bg-surface/40 px-4 py-3">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wider text-muted">
                Plano de ação
              </p>
              <h3 className="text-sm font-semibold tracking-tight text-foreground">
                O que merece sua atenção
              </h3>
            </div>
            {hasAlerts ? (
              <span
                className={clsx(
                  "rounded-full px-2.5 py-0.5 text-xs font-medium",
                  criticalCount > 0
                    ? "bg-[var(--system-red)]/15 text-[var(--system-red)]"
                    : "bg-surface-2 text-muted ring-1 ring-border/60",
                )}
              >
                {alerts.length} alerta{alerts.length === 1 ? "" : "s"}
              </span>
            ) : (
              <span className="rounded-full bg-[var(--system-green)]/15 px-2.5 py-0.5 text-xs font-medium text-[var(--system-green)]">
                Tudo em dia
              </span>
            )}
          </div>

          {/* Lista de alertas */}
          <div className="no-scrollbar max-h-[min(26rem,calc(100vh-140px))] overflow-y-auto p-2">
            {!hasAlerts ? (
              <div className="px-4 py-8 text-center">
                <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-2xl bg-[color-mix(in_oklab,var(--system-green)_14%,transparent)] text-[var(--system-green)]">
                  <CheckCircle2 size={20} />
                </div>
                <p className="text-sm font-medium text-foreground">Tudo tranquilo por aqui</p>
                <p className="mx-auto mt-1 max-w-[220px] text-xs leading-relaxed text-muted">
                  Nenhum risco de saldo negativo, estouro de orçamento ou pendência crítica.
                </p>
              </div>
            ) : (
              <div className="space-y-1">
                {alerts.map((alert) => (
                  <AlertItem
                    key={alert.id}
                    alert={alert}
                    onNavigate={() => setOpen(false)}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Footer com atalhos */}
          <div className="flex items-center justify-between border-t border-border/60 bg-surface/30 px-4 py-2.5 text-[11px] text-muted">
            <span>Atualizado com sua projeção</span>
            <Link
              href="/config"
              onClick={() => setOpen(false)}
              className="font-medium text-foreground hover:underline"
            >
              Configurações
            </Link>
          </div>
        </Panel>
      )}
    </div>
  )
}

function AlertItem({
  alert,
  onNavigate,
}: Readonly<{
  alert: PainelAlert
  onNavigate: () => void
}>) {
  const Icon = iconMap[alert.icon] ?? AlertTriangle
  const accentClass = accentMap[alert.accent] ?? accentMap.orange

  const content = (
    <>
      <span
        className={clsx(
          "inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl transition-transform group-hover:scale-105",
          accentClass,
        )}
      >
        <Icon size={16} />
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-2">
          <span className="truncate text-xs font-semibold text-foreground">
            {alert.title}
          </span>
          {alert.severity === "critical" && (
            <span className="shrink-0 rounded-full bg-[var(--system-red)]/15 px-1.5 py-0.5 text-[9px] font-medium uppercase tracking-wide text-[var(--system-red)]">
              crítico
            </span>
          )}
        </div>
        <p className="mt-0.5 line-clamp-2 text-xs leading-relaxed text-muted">
          {alert.detail}
        </p>
      </div>
      {alert.href && (
        <ChevronRight
          size={14}
          className="mt-1 shrink-0 text-muted/40 transition-transform group-hover:translate-x-0.5 group-hover:text-foreground"
        />
      )}
    </>
  )

  if (!alert.href) {
    return (
      <div className="group flex items-start gap-3 rounded-2xl p-2.5 transition-colors hover:bg-surface-2/60">
        {content}
      </div>
    )
  }

  return (
    <Link
      href={alert.href}
      onClick={onNavigate}
      className="group flex items-start gap-3 rounded-2xl p-2.5 transition-colors hover:bg-surface-2"
    >
      {content}
    </Link>
  )
}
