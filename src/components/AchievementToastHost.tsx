"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { Trophy } from "lucide-react"
import { getAchievementDefinition } from "@/lib/achievements"
import { useAppStore } from "@/lib/store"
import type { AchievementId } from "@/lib/types"

const TOAST_MS = 8000

export function AchievementToastHost() {
  const { settings, pendingAchievementToasts, dismissAchievementToast } =
    useAppStore()
  const [visibleId, setVisibleId] = useState<AchievementId | null>(null)

  const showAchievements = settings.showAchievements !== false

  useEffect(() => {
    if (!showAchievements) return
    if (visibleId !== null) return
    const next = pendingAchievementToasts[0]
    if (next) setVisibleId(next)
  }, [pendingAchievementToasts, visibleId, showAchievements])

  useEffect(() => {
    if (!visibleId) return
    const t = window.setTimeout(() => {
      dismissAchievementToast()
      setVisibleId(null)
    }, TOAST_MS)
    return () => window.clearTimeout(t)
  }, [visibleId, dismissAchievementToast])

  if (!showAchievements || !visibleId) return null

  const def = getAchievementDefinition(visibleId)
  if (!def) return null

  return (
    <div
      className="fixed bottom-20 left-1/2 z-40 w-[min(100%,22rem)] -translate-x-1/2 px-4 sm:bottom-6 sm:left-auto sm:right-6 sm:translate-x-0"
      role="status"
      aria-live="polite"
    >
      <div className="flex flex-col gap-1 rounded-2xl bg-surface ring-1 ring-border/60 shadow-[var(--shadow-card-lg)] px-4 py-3 text-sm">
        <div className="flex items-center gap-2 text-foreground">
          <Trophy size={16} className="shrink-0 text-[var(--system-yellow)]" />
          <span>
            Conquista nova: <strong>{def.title}</strong>
          </span>
        </div>
        <Link
          href="/config?tab=conquistas"
          className="text-xs text-muted underline pl-6"
          onClick={() => {
            dismissAchievementToast()
            setVisibleId(null)
          }}
        >
          Ver
        </Link>
      </div>
    </div>
  )
}
