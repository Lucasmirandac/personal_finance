import clsx from "clsx"

type Variant = "default" | "primary" | "ghost" | "danger"
type Size = "default" | "sm"

type Props = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant
  size?: Size
}

const variantClasses: Record<Variant, string> = {
  default:
    "border-border bg-surface text-foreground hover:bg-surface-2 hover:border-border-strong",
  primary: "border-foreground bg-foreground text-surface hover:opacity-90",
  ghost:
    "border-transparent bg-transparent hover:bg-surface-2 hover:border-border",
  danger:
    "border-[var(--border-danger-soft)] text-danger bg-transparent hover:bg-[var(--bg-danger-soft)]",
}

const sizeClasses: Record<Size, string> = {
  default: "text-[13px] px-3 py-1.5",
  sm: "text-xs px-2 py-1",
}

export function Button({
  variant = "default",
  size = "default",
  className,
  type = "button",
  ...props
}: Props) {
  return (
    <button
      type={type}
      className={clsx(
        "inline-flex items-center justify-center gap-1.5 font-medium rounded-md border transition-[background,border-color] whitespace-nowrap",
        variantClasses[variant],
        sizeClasses[size],
        className,
      )}
      {...props}
    />
  )
}
