import clsx from "clsx"

export type BadgeVariant =
  | "default"
  | "pay"
  | "est"
  | "fixa"
  | "receita"
  | "gasto"

type Props = React.HTMLAttributes<HTMLSpanElement> & {
  variant?: BadgeVariant
  dot?: boolean
}

const variantClasses: Record<BadgeVariant, string> = {
  default: "text-muted",
  pay: "text-warning border-[var(--border-warning-soft)]",
  est: "text-success border-[var(--border-success-soft)]",
  fixa: "text-warning border-[var(--border-warning-soft)]",
  receita: "text-success border-[var(--border-success-soft)]",
  gasto: "text-muted",
}

export function Badge({
  variant = "default",
  dot = false,
  className,
  children,
  ...props
}: Props) {
  return (
    <span
      className={clsx(
        "inline-flex items-center gap-1.5 px-1.5 py-0.5 rounded-sm text-[11px] font-medium bg-surface-2 border border-border",
        dot && "before:content-[''] before:w-1.5 before:h-1.5 before:rounded-full before:bg-current before:shrink-0",
        variantClasses[variant],
        className,
      )}
      {...props}
    >
      {children}
    </span>
  )
}
