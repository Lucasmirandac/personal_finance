import clsx from "clsx"

type Option<T extends string> = {
  value: T
  label: string
}

type Props<T extends string> = {
  options: Option<T>[]
  value: T
  onChange: (value: T) => void
  className?: string
  size?: "sm" | "md"
}

export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
  className,
  size = "md",
}: Readonly<Props<T>>) {
  return (
    <div
      className={clsx(
        "inline-flex items-center rounded-full bg-surface-2 p-1",
        className,
      )}
      role="tablist"
      aria-label="Alternar visualização"
    >
      {options.map((option) => {
        const active = option.value === value
        return (
          <button
            key={option.value}
            type="button"
            role="tab"
            aria-selected={active}
            className={clsx(
              "rounded-full px-3 transition-[background,transform,color] duration-200 ease-out",
              size === "sm" ? "text-xs py-1.5" : "text-sm py-2",
              active
                ? "bg-surface text-foreground shadow-sm"
                : "text-muted hover:text-foreground",
            )}
            onClick={() => onChange(option.value)}
          >
            {option.label}
          </button>
        )
      })}
    </div>
  )
}
