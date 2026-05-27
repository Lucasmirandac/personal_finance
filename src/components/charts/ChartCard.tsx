import clsx from "clsx"

type Props = {
  title: string
  subtitle?: string
  children: React.ReactNode
  right?: React.ReactNode
  className?: string
}

export function ChartCard({ title, subtitle, children, right, className }: Readonly<Props>) {
  return (
    <div
      className={clsx(
        "rounded-2xl bg-surface p-4 sm:p-5 flex flex-col gap-3 ring-1 ring-border/60 shadow-[var(--shadow-card)]",
        className,
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-[11px] uppercase tracking-wider text-muted">{title}</p>
          {subtitle && <p className="text-xs text-muted mt-0.5">{subtitle}</p>}
        </div>
        {right}
      </div>
      <div className="w-full h-64 sm:h-72">{children}</div>
    </div>
  )
}
