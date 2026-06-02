"use client"

import { useState } from "react"
import { Sparkles, Plus } from "lucide-react"
import { Button } from "@/components/ui/Button"
import { BudgetSuggestionsDrawer } from "@/components/BudgetSuggestionsDrawer"
import { canShowBudgetSuggestions } from "@/lib/budgets"
import { useAppStore } from "@/lib/store"

type BudgetsEmptyStateProps = {
  variant?: "panel" | "dashboard"
  onManualCreate?: () => void
  className?: string
}

export function BudgetsEmptyState({
  variant = "panel",
  onManualCreate,
  className,
}: BudgetsEmptyStateProps) {
  const { normalized, budgets } = useAppStore()
  const [drawerOpen, setDrawerOpen] = useState(false)
  const showSuggest = canShowBudgetSuggestions(normalized, budgets)

  const copy =
    variant === "dashboard"
      ? "Nenhum orçamento ativo. Defina limites mensais para acompanhar gastos por categoria."
      : "Defina limites mensais para as categorias que você quer controlar. Sugestões usam só o histórico já importado neste aparelho."

  return (
    <>
      <div
        className={
          className ??
          "rounded-2xl bg-surface ring-1 ring-border/60 shadow-[var(--shadow-card)] p-4 space-y-3"
        }
      >
        <p className="text-sm text-muted">{copy}</p>
        <div className="flex flex-wrap gap-2">
          {showSuggest && (
            <Button
              variant="primary"
              size="sm"
              className="rounded-full"
              onClick={() => setDrawerOpen(true)}
            >
              <Sparkles size={13} />
              Sugerir com base no meu histórico
            </Button>
          )}
          {onManualCreate && (
            <Button
              variant={showSuggest ? "ghost" : "primary"}
              size="sm"
              className="rounded-full"
              onClick={onManualCreate}
            >
              <Plus size={13} />
              Novo orçamento
            </Button>
          )}
        </div>
        {!showSuggest && variant === "panel" && (
          <p className="text-xs text-muted">
            Com mais extrato importado (30+ dias), você poderá receber sugestões
            automáticas de categorias e valores.
          </p>
        )}
      </div>

      <BudgetSuggestionsDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        onManualCreate={onManualCreate}
      />
    </>
  )
}
