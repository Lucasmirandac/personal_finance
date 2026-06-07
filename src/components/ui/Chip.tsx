import clsx from "clsx"

type Props = React.HTMLAttributes<HTMLSpanElement>

export function Chip({ className, ...props }: Props) {
  return (
    <span
      className={clsx(
        "inline-flex items-center px-2 py-0.5 rounded-sm text-caption font-mono bg-surface-2 border border-border text-muted",
        className,
      )}
      {...props}
    />
  )
}
