"use client"

import { useMemo, useState } from "react"
import clsx from "clsx"
import { useAppStore } from "@/lib/store"
import { formatBRL, formatDateBR } from "@/lib/format"
import {
  detectSubscriptions,
  suggestionToRecurring,
} from "@/lib/subscriptions"
import { Button } from "@/components/ui/Button"
import { Chip } from "@/components/ui/Chip"
import { Num } from "@/components/ui/Num"
import { CheckCircle2, Sparkles } from "lucide-react"

const PAGE_SIZE = 8

export function SubscriptionsPanel() {
  const {
    hasAnalysis,
    normalized,
    recurringRules,
    subscriptionDismissals,
    addRecurring,
    dismissSubscription,
  } = useAppStore()

  const [showAll, setShowAll] = useState(false)
  const [toast, setToast] = useState<string | null>(null)
  const [busyKey, setBusyKey] = useState<string | null>(null)

  const suggestions = useMemo(
    () =>
      detectSubscriptions(
        normalized,
        recurringRules,
        subscriptionDismissals,
      ),
    [normalized, recurringRules, subscriptionDismissals],
  )

  const visible = showAll ? suggestions : suggestions.slice(0, PAGE_SIZE)

  if (!hasAnalysis) return null

  return (
    <div className="rounded-2xl bg-surface ring-1 ring-border/60 shadow-[var(--shadow-card)] p-5 space-y-4">
      <div className="flex items-start justify-between gap-2 flex-wrap">
        <div>
          <div className="flex items-center gap-2">
            <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-[var(--system-yellow)] bg-[color-mix(in_oklab,var(--system-yellow)_12%,transparent)]">
              <Sparkles size={16} />
            </span>
            <h2 className="text-sm font-semibold">Assinaturas detectadas</h2>
            {suggestions.length > 0 && (
              <Chip>{suggestions.length}</Chip>
            )}
          </div>
          <p className="text-muted text-xs mt-1 max-w-xl pl-11">
            Gastos mensais estáveis nos últimos 6 meses. Converta em despesa fixa
            com um clique.
          </p>
        </div>
      </div>

      {toast && (
        <div
          className="flex items-center gap-2 rounded-2xl bg-[color-mix(in_oklab,var(--system-green)_12%,transparent)] px-4 py-2 text-xs text-[var(--system-green)]"
          role="status"
          aria-live="polite"
        >
          <CheckCircle2 size={14} className="shrink-0" />
          {toast}
        </div>
      )}

      {suggestions.length === 0 ? (
        <p className="text-sm text-muted">
          Nada detectado nos últimos 6 meses.
        </p>
      ) : (
        <>
          <p className="text-sm">
            Achei{" "}
            <span className="font-medium">
              {suggestions.length} assinatura
              {suggestions.length > 1 ? "s" : ""}
            </span>{" "}
            que talvez você queira virar Despesa fixa:{" "}
            <span className="text-muted">
              {suggestions
                .slice(0, 4)
                .map((s) => s.estabelecimento)
                .join(", ")}
              {suggestions.length > 4 ? "…" : ""}
            </span>
          </p>

          <ul className="space-y-3">
            {visible.map((s) => (
              <li
                key={s.key}
                className="rounded-2xl bg-surface-2/60 px-4 py-3 space-y-2"
              >
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-medium text-sm">{s.estabelecimento}</span>
                  <Chip>
                    <Num>{formatBRL(s.valorMediano)}</Num>/mês
                  </Chip>
                  <Chip className="text-[10px]">
                    ±{s.variacaoPct.toFixed(1)}%
                  </Chip>
                </div>
                <p className="text-xs text-muted">
                  Visto em {s.meses.length} meses · último em{" "}
                  {formatDateBR(s.ultimaData)} · {s.categoria}
                </p>
                <div className="flex flex-wrap gap-2">
                  <Button
                    variant="primary"
                    size="sm"
                    className={clsx("rounded-full", busyKey === s.key && "opacity-60")}
                    disabled={busyKey !== null}
                    onClick={async () => {
                      setBusyKey(s.key)
                      try {
                        await addRecurring(suggestionToRecurring(s))
                        setToast("Adicionada a Recorrentes.")
                        setTimeout(() => setToast(null), 3000)
                      } finally {
                        setBusyKey(null)
                      }
                    }}
                  >
                    Virar despesa fixa
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="rounded-full"
                    disabled={busyKey !== null}
                    onClick={() => dismissSubscription(s.key)}
                  >
                    Dispensar
                  </Button>
                </div>
              </li>
            ))}
          </ul>

          {suggestions.length > PAGE_SIZE && (
            <Button size="sm" className="rounded-full" onClick={() => setShowAll((v) => !v)}>
              {showAll ? "Mostrar menos" : `Mostrar mais (${suggestions.length - PAGE_SIZE})`}
            </Button>
          )}
        </>
      )}
    </div>
  )
}
