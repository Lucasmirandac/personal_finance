import clsx from "clsx"
import { Num } from "@/components/ui/Num"

type Props = {
  label: string
  value: string
  hint?: string
  delta?: string
  tone?: "default" | "success" | "danger" | "warning" | "info"
}

const toneClasses: Record<NonNullable<Props["tone"]>, string> = {
  default: "text-foreground",
  success: "text-success",
  danger: "text-danger",
  warning: "text-warning",
  info: "text-info",
}

export function StatTile({
  label,
  value,
  hint,
  delta,
  tone = "default",
}: Readonly<Props>) {
  return (
    <div className="rounded-2xl bg-surface p-4 ring-1 ring-border/60 shadow-[var(--shadow-card)]">
      <p className="text-[10px] uppercase tracking-wider text-muted">{label}</p>
      <Num className={clsx("mt-2 block text-2xl font-semibold tracking-tight num-display", toneClasses[tone])}>
        {value}
      </Num>
      {(hint || delta) && (
        <div className="mt-1 flex items-center justify-between gap-2">
          <span className="text-xs text-muted">{hint}</span>
          {delta && <span className="text-xs text-muted">{delta}</span>}
        </div>
      )}
    </div>
  )
}
