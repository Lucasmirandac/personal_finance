import clsx from "clsx"

type BackdropProps = React.HTMLAttributes<HTMLDivElement>

export function DrawerBackdrop({ className, ...props }: BackdropProps) {
  return (
    <div
      className={clsx("fixed inset-0 bg-black/35 z-40", className)}
      {...props}
    />
  )
}

type PanelProps = React.HTMLAttributes<HTMLElement>

export function DrawerPanel({ className, ...props }: PanelProps) {
  return (
    <aside
      className={clsx(
        "fixed top-0 right-0 bottom-0 w-[min(100%,20rem)] bg-surface border-l border-border z-50 flex flex-col overflow-hidden",
        className,
      )}
      {...props}
    />
  )
}
