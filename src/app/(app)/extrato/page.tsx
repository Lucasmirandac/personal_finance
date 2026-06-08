"use client"

import { EmptyState } from "@/components/EmptyState"
import { ExtratoPageContent } from "@/components/ExtratoPageContent"
import { useAppStore } from "@/lib/store"

export default function ExtratoPage() {
  const { loaded, hasAnalysis } = useAppStore()

  if (!loaded) return <div className="text-muted">Carregando...</div>
  if (!hasAnalysis) {
    return (
      <EmptyState
        title="Configure seus dados"
        description="Importe um CSV ou cadastre lançamentos para editar o extrato."
      />
    )
  }

  return <ExtratoPageContent />
}
