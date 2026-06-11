"use client"

import { Circle, CircleCheck } from "lucide-react"
import { Badge, type BadgeVariant } from "@/components/ui/Badge"
import { Button } from "@/components/ui/Button"
import { g } from "@/lib/glossary"
import {
  derivePaymentState,
  isPayablePlanned,
  nextPaymentStatus,
  type DerivedPaymentState,
} from "@/lib/paymentStatus"
import { PaymentStatusState, TransactionNormalized } from "@/lib/types"

const badgeConfig: Record<
  Exclude<DerivedPaymentState, "none" | "previsto">,
  { label: string; variant: BadgeVariant; infoKey: "pago" | "aPagar" | "vencida" | "aConfirmar" }
> = {
  pago: { label: "pago", variant: "est", infoKey: "pago" },
  a_pagar: { label: "a pagar", variant: "pay", infoKey: "aPagar" },
  vencida: { label: "vencida", variant: "danger", infoKey: "vencida" },
  a_confirmar: { label: "a confirmar", variant: "default", infoKey: "aConfirmar" },
}

export function PaymentStatusBadge({
  state,
}: Readonly<{ state: DerivedPaymentState }>) {
  if (state === "none" || state === "previsto") return null
  const config = badgeConfig[state]
  return (
    <Badge className="text-[10px]" variant={config.variant} info={g(config.infoKey)}>
      {config.label}
    </Badge>
  )
}

export function PaymentStatusToggle({
  tx,
  paymentStatus,
  onToggle,
}: Readonly<{
  tx: TransactionNormalized
  paymentStatus: PaymentStatusState
  onToggle: (rawId: string, status: "pago" | "a_pagar") => void
}>) {
  if (!isPayablePlanned(tx)) return null

  const state = derivePaymentState(tx, paymentStatus)
  const isPaid = state === "pago"

  return (
    <Button
      variant="ghost"
      size="sm"
      aria-label={isPaid ? "Marcar como a pagar" : "Marcar como pago"}
      title={isPaid ? "Marcar como a pagar" : "Marcar como pago"}
      onClick={() => onToggle(tx.id, nextPaymentStatus(state))}
    >
      {isPaid ? (
        <CircleCheck size={15} className="text-success" />
      ) : (
        <Circle size={15} className="text-muted" />
      )}
    </Button>
  )
}
