import clsx from "clsx"

type Props = {
  icon: React.ReactNode
  label: string
  sublabel?: string
  value: React.ReactNode
  tone?: "default" | "success" | "danger" | "warning" | "info"
}

const toneClasses: Record<NonNullable<Props["tone"]>, string> = {
  default: "text-foreground",
  success: "text-success",
  danger: "text-danger",
  warning: "text-warning",
  info: "text-info",
}

export function MetricRow({
  icon,
  label,
  sublabel,
  value,
  tone = "default",
}: Readonly<Props>) {
  return (
    <div className="flex items-center justify-between gap-3 px-4 py-3">
      <div className="flex min-w-0 items-center gap-3">
        <span
          className={clsx(
            "inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-surface-2",
            toneClasses[tone],
          )}
        >
          {icon}
        </span>
        <div className="min-w-0">
          <p className="truncate text-sm font-medium">{label}</p>
          {sublabel && <p className="truncate text-xs text-muted">{sublabel}</p>}
        </div>
      </div>
      <div className={clsx("shrink-0 text-sm font-medium num-display", toneClasses[tone])}>
        {value}
      </div>
    </div>
  )
}
