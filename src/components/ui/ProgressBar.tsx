import clsx from "clsx"

type Props = {
  value: number
  className?: string
}

export function ProgressBar({ value, className }: Props) {
  const clamped = Math.min(100, Math.max(0, value))

  return (
    <div
      className={clsx(
        "h-1 bg-surface-2 rounded-sm overflow-hidden min-w-12",
        className,
      )}
    >
      <div
        className="h-full bg-foreground rounded-sm transition-[width] duration-200"
        style={{ width: `${clamped}%` }}
      />
    </div>
  )
}
