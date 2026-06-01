import clsx from "clsx"

type Props = React.HTMLAttributes<HTMLSpanElement>

export function Num({ className, ...props }: Props) {
  return (
    <span
      className={clsx("tabular-nums whitespace-nowrap", className)}
      {...props}
    />
  )
}
