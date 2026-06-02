import clsx from "clsx"
import { InfoTip } from "@/components/ui/InfoTip"
import { Num } from "@/components/ui/Num"

type Props = {
  label: string
  value: string
  hint?: string
  delta?: string
  tone?: "default" | "success" | "danger" | "warning" | "info"
  info?: React.ReactNode
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
  info,
}: Readonly<Props>) {
  return (
    <div className="rounded-2xl bg-surface p-4 ring-1 ring-border/60 shadow-[var(--shadow-card)] overflow-hidden">
      <div className="flex items-center gap-1">
        <p className="text-[10px] uppercase tracking-wider text-muted">{label}</p>
        {info != null && (
          <InfoTip content={info} label={`Mais informações: ${label}`} />
        )}
      </div>
      <Num className={clsx("mt-2 block text-lg font-semibold tracking-tight num-display sm:text-xl", toneClasses[tone])}>
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
