"use client"

import Link from "next/link"
import { Pencil, RotateCcw, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/Button"
import { TransactionNormalized } from "@/lib/types"

type Props = {
  tx: TransactionNormalized
  canEdit: boolean
  canRevert: boolean
  onEdit: (tx: TransactionNormalized) => void
  onDelete?: (tx: TransactionNormalized) => void
  onRevert?: (tx: TransactionNormalized) => void
  showRuleLink?: boolean
}

export function TransactionActions({
  tx,
  canEdit,
  canRevert,
  onEdit,
  onDelete,
  onRevert,
  showRuleLink = false,
}: Readonly<Props>) {
  if (!canEdit && !showRuleLink) {
    return <span className="text-caption text-muted">—</span>
  }

  return (
    <span className="inline-flex items-center gap-0.5">
      {canEdit && (
        <Button
          variant="ghost"
          size="sm"
          aria-label="Ajustar"
          title="Ajustar"
          onClick={() => onEdit(tx)}
        >
          <Pencil size={13} />
        </Button>
      )}
      {showRuleLink && !canEdit && (
        <Link
          href="/recorrentes"
          className="rounded-full border border-border bg-surface px-2 py-1 text-caption text-muted hover:bg-surface-2"
        >
          Recorrente
        </Link>
      )}
      {canRevert && onRevert && (
        <Button
          variant="ghost"
          size="sm"
          aria-label="Reverter edição"
          title="Reverter edição"
          onClick={() => onRevert(tx)}
        >
          <RotateCcw size={13} />
        </Button>
      )}
      {onDelete && (
        <Button
          variant="ghost"
          size="sm"
          aria-label="Excluir transação"
          title="Excluir"
          onClick={() => onDelete(tx)}
        >
          <Trash2 size={13} />
        </Button>
      )}
    </span>
  )
}
