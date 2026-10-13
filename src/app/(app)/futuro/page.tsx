"use client"

import { EmptyState } from "@/components/EmptyState"
import { FuturoPageContent } from "@/components/FuturoPageContent"
import { useAppStore } from "@/lib/store"

export default function FuturoPage() {
  const { loaded, hasAnalysis } = useAppStore()

  if (!loaded) return <div className="text-muted">Carregando…</div>
  if (!hasAnalysis) {
    return (
      <EmptyState
        title="Configure seus dados"
        description="Lance o mês na grade. Depois cadastre a renda no Divisor para projetar o futuro."
      />
    )
  }

  return <FuturoPageContent />
}
