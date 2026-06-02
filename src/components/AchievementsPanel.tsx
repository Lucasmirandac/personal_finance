"use client"

import clsx from "clsx"
import {
  ACHIEVEMENT_CATALOG,
  getAchievementDefinition,
} from "@/lib/achievements"
import { useAppStore } from "@/lib/store"
import { formatDateBR } from "@/lib/format"
import {
  Calendar,
  Coins,
  Heart,
  Sparkles,
  Trophy,
  type LucideIcon,
} from "lucide-react"

const ICONS: Record<string, LucideIcon> = {
  "primeiro-passo": Sparkles,
  "semana-viva": Calendar,
  "mes-fiel": Calendar,
  "volta-certeira": Heart,
  "mes-positivo": Coins,
  "trio-positivo": Trophy,
  "cofrinho-calmo": Coins,
  "mes-revisado": Calendar,
}

export function AchievementsPanel() {
  const { achievements, settings, updateSettings } = useAppStore()
  const unlockedById = new Map(
    achievements.unlocked.map((a) => [a.id, a.unlockedAt]),
  )
  const total = ACHIEVEMENT_CATALOG.length
  const count = achievements.unlocked.length
  const showAchievements = settings.showAchievements !== false

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <p className="text-[11px] uppercase tracking-wider text-muted">
            Conquistas
          </p>
          <p className="text-sm text-muted mt-0.5">
            {count} de {total} desbloqueadas. Marcos permanentes calculados só
            neste aparelho.
          </p>
        </div>
        <label className="flex items-center gap-2 text-sm cursor-pointer">
          <input
            type="checkbox"
            checked={showAchievements}
            onChange={(e) =>
              void updateSettings({
                ...settings,
                showAchievements: e.target.checked,
              })
            }
          />
          Mostrar conquistas no app
        </label>
      </div>

      <ul className="rounded-2xl bg-surface ring-1 ring-border/60 shadow-[var(--shadow-card)] overflow-hidden divide-y divide-border/60">
        {ACHIEVEMENT_CATALOG.map((def) => {
          const unlockedAt = unlockedById.get(def.id)
          const Icon = ICONS[def.id] ?? Trophy
          return (
            <li
              key={def.id}
              className={clsx(
                "flex items-start gap-3 px-4 py-3",
                !unlockedAt && "opacity-70",
              )}
            >
              <span
                className={clsx(
                  "mt-0.5 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl",
                  unlockedAt
                    ? "text-[var(--system-yellow)] bg-[color-mix(in_oklab,var(--system-yellow)_12%,transparent)]"
                    : "text-muted bg-surface-2",
                )}
              >
                <Icon size={16} />
              </span>
              <div className="min-w-0 flex-1">
                <p className="font-medium text-sm">{def.title}</p>
                <p className="text-xs text-muted mt-0.5">{def.description}</p>
                <p className="text-xs text-muted mt-1">
                  {unlockedAt
                    ? `Desbloqueada em ${formatDateBR(unlockedAt.slice(0, 10))}`
                    : "Ainda não"}
                </p>
              </div>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
