"use client"

import Link from "next/link"
import { Trophy } from "lucide-react"
import { ACHIEVEMENT_CATALOG, getAchievementDefinition } from "@/lib/achievements"
import { useAppStore } from "@/lib/store"
import { formatDateBR } from "@/lib/format"
import { Panel } from "@/components/ui/Panel"

export function AchievementsCard() {
  const { achievements, settings } = useAppStore()

  if (settings.showAchievements === false) return null

  const unlocked = [...achievements.unlocked].sort(
    (a, b) => b.unlockedAt.localeCompare(a.unlockedAt),
  )
  const recent = unlocked.slice(0, 3)
  const extra = unlocked.length - recent.length
  const total = ACHIEVEMENT_CATALOG.length

  if (unlocked.length === 0) {
    return (
      <Panel className="rounded-2xl p-4 shadow-[var(--shadow-card)] ring-1 ring-border/60">
        <p className="text-caption uppercase tracking-wider text-muted">
          Conquistas
        </p>
        <p className="mt-2 text-sm text-muted">
          Registre gastos e feche meses com sobra para desbloquear marcos
          discretos — só no seu aparelho.
        </p>
        <Link
          href="/config?tab=conquistas"
          className="mt-3 inline-block text-xs font-medium underline"
        >
          Ver catálogo
        </Link>
      </Panel>
    )
  }

  return (
    <Panel className="rounded-2xl p-4 shadow-[var(--shadow-card)] ring-1 ring-border/60">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <p className="text-caption uppercase tracking-wider text-muted">
          Conquistas
        </p>
        <span className="text-xs text-muted">
          {unlocked.length} de {total}
        </span>
      </div>
      <ul className="mt-3 flex flex-wrap gap-2">
        {recent.map((a) => {
          const def = getAchievementDefinition(a.id)
          const label = def?.title ?? a.id
          const date = a.unlockedAt.slice(0, 10)
          return (
            <li key={a.id}>
              <span
                className="inline-flex items-center gap-1.5 rounded-full bg-surface-2/80 px-3 py-1 text-xs ring-1 ring-border/60"
                aria-label={`${label}, desbloqueada em ${formatDateBR(date)}`}
              >
                <Trophy size={12} className="text-[var(--system-yellow)]" />
                {label}
              </span>
            </li>
          )
        })}
        {extra > 0 && (
          <li>
            <span className="inline-flex items-center rounded-full px-3 py-1 text-xs text-muted ring-1 ring-border/60">
              +{extra}
            </span>
          </li>
        )}
      </ul>
      <Link
        href="/config?tab=conquistas"
        className="mt-3 inline-block text-xs font-medium underline"
      >
        Ver todas
      </Link>
    </Panel>
  )
}
