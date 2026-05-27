"use client"

import Link from "next/link"
import { getGreeting, formatLongDate } from "@/lib/format"
import { todayIso } from "@/lib/dates"
import { Button } from "@/components/ui/Button"
import { Plus, SlidersHorizontal, Settings } from "lucide-react"

type Props = {
  onAdjustBalance: () => void
  onConfig: () => void
}

export function GreetingHeader({ onAdjustBalance, onConfig }: Props) {
  return (
    <div className="flex items-start justify-between gap-3 flex-wrap">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{getGreeting()}</h1>
        <p className="text-sm text-muted capitalize">{formatLongDate(todayIso())}</p>
      </div>

      <div className="flex items-center gap-2">
        <Link
          href="/recorrentes"
          className="inline-flex items-center justify-center gap-1.5 rounded-full border border-border bg-surface px-3 py-1.5 text-xs font-medium hover:bg-surface-2"
        >
          <Plus size={13} />
          Adicionar
        </Link>
        <Button size="sm" className="rounded-full" onClick={onAdjustBalance}>
          <SlidersHorizontal size={13} />
          Ajustar saldo
        </Button>
        <Button size="sm" className="rounded-full" onClick={onConfig}>
          <Settings size={13} />
          Configurar
        </Button>
      </div>
    </div>
  )
}
