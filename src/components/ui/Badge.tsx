import clsx from "clsx"
import { InfoTip } from "@/components/ui/InfoTip"

export type BadgeVariant =
  | "default"
  | "pay"
  | "est"
  | "fixa"
  | "receita"
  | "gasto"
  | "danger"

type Props = React.HTMLAttributes<HTMLSpanElement> & {
  variant?: BadgeVariant
  dot?: boolean
  info?: React.ReactNode
}

const variantClasses: Record<BadgeVariant, string> = {
  default: "text-muted",
  pay: "text-warning border-[var(--border-warning-soft)]",
  est: "text-success border-[var(--border-success-soft)]",
  fixa: "text-warning border-[var(--border-warning-soft)]",
  receita: "text-success border-[var(--border-success-soft)]",
  gasto: "text-muted",
  danger: "text-danger border-[var(--border-danger-soft)]",
}

export function Badge({
  variant = "default",
  dot = false,
  className,
  children,
  info,
  ...props
}: Props) {
  return (
    <span
      className={clsx(
        "inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-sm text-caption font-medium bg-surface-2 border border-border",
        dot && "before:content-[''] before:w-1.5 before:h-1.5 before:rounded-full before:bg-current before:shrink-0",
        variantClasses[variant],
        className,
      )}
      {...props}
    >
      {children}
      {info != null && (
        <InfoTip
          content={info}
          label={
            typeof children === "string"
              ? `Mais informações: ${children}`
              : "Mais informações"
          }
          className="-mr-0.5"
        />
      )}
    </span>
  )
}
