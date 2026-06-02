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
}

export function TransactionActions({
  tx,
  canEdit,
  canRevert,
  onEdit,
  onDelete,
  onRevert,
}: Readonly<Props>) {
  if (!canEdit) {
    return (
      <Link
        href="/recorrentes"
        className="rounded-full border border-border bg-surface px-2 py-1 text-[11px] text-muted hover:bg-surface-2"
      >
        Recorrente
      </Link>
    )
  }

  return (
    <span className="inline-flex items-center gap-0.5">
      <Button
        variant="ghost"
        size="sm"
        aria-label="Editar transação"
        title="Editar"
        onClick={() => onEdit(tx)}
      >
        <Pencil size={13} />
      </Button>
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
