import clsx from "clsx"

type Props = React.HTMLAttributes<HTMLDivElement>

export function Panel({ className, ...props }: Props) {
  return (
    <div
      className={clsx(
        "bg-surface border border-border rounded-lg",
        className,
      )}
      {...props}
    />
  )
}

export const Card = Panel
