"use client"

import { EmptyState } from "@/components/EmptyState"
import { FaturasPageContent } from "@/components/FaturasPageContent"
import { useAppStore } from "@/lib/store"

export default function FaturasPage() {
  const { loaded, hasAnalysis } = useAppStore()

  if (!loaded) return <div className="text-muted">Carregando...</div>
  if (!hasAnalysis) {
    return (
      <EmptyState
        title="Configure seus dados"
        description="Importe uma fatura ou cadastre compras no cartão para editar faturas."
      />
    )
  }

  return <FaturasPageContent />
}
