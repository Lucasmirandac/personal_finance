import clsx from "clsx"

type Props = React.HTMLAttributes<HTMLSpanElement>

export function SectionTitle({ className, ...props }: Props) {
  return (
    <span
      className={clsx(
        "text-[11px] font-semibold tracking-wider uppercase text-muted",
        className,
      )}
      {...props}
    />
  )
}
