import clsx from "clsx"
import { forwardRef } from "react"

type TabListProps = React.HTMLAttributes<HTMLDivElement>

export const TabList = forwardRef<HTMLDivElement, TabListProps>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={clsx(
        "flex border-b border-border overflow-x-auto",
        className,
      )}
      {...props}
    />
  ),
)
TabList.displayName = "TabList"

type TabTriggerProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  active?: boolean
}

export function TabTrigger({
  active = false,
  className,
  type = "button",
  ...props
}: TabTriggerProps) {
  return (
    <button
      type={type}
      data-active={active}
      className={clsx(
        "px-4 py-2 text-[13px] font-medium text-muted border-b-2 border-transparent -mb-px whitespace-nowrap bg-transparent hover:text-foreground data-[active=true]:text-foreground data-[active=true]:border-b-foreground",
        className,
      )}
      {...props}
    />
  )
}
