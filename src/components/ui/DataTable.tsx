import clsx from "clsx"

export type DataTableRowTone = "pay" | "est" | "fixa" | "receita"

type TableProps = React.TableHTMLAttributes<HTMLTableElement>

export function DataTable({ className, ...props }: TableProps) {
  return (
    <table
      className={clsx("w-full border-collapse text-ui", className)}
      {...props}
    />
  )
}

type HeadProps = React.ThHTMLAttributes<HTMLTableCellElement> & {
  align?: "left" | "right"
}

export function DataTableHead({
  align = "left",
  className,
  ...props
}: HeadProps) {
  return (
    <th
      className={clsx(
        "sticky top-0 bg-surface text-caption font-semibold uppercase tracking-wide text-muted cursor-pointer select-none z-[1] py-2 px-2.5 border-b border-border whitespace-nowrap",
        align === "right" ? "text-right" : "text-left",
        className,
      )}
      {...props}
    />
  )
}

type CellProps = React.TdHTMLAttributes<HTMLTableCellElement> & {
  align?: "left" | "right"
}

export function DataTableCell({
  align = "left",
  className,
  ...props
}: CellProps) {
  return (
    <td
      className={clsx(
        "py-2 px-2.5 border-b border-border whitespace-nowrap",
        align === "right" ? "text-right" : "text-left",
        className,
      )}
      {...props}
    />
  )
}

type RowProps = React.HTMLAttributes<HTMLTableRowElement> & {
  tone?: DataTableRowTone
}

const rowToneClasses: Record<DataTableRowTone, string> = {
  pay: "bg-[var(--bg-warning-soft)]",
  est: "bg-[var(--bg-success-soft)]",
  fixa: "bg-[color-mix(in_oklab,var(--warning)_5%,transparent)]",
  receita: "bg-[color-mix(in_oklab,var(--success)_5%,transparent)]",
}

export function DataTableRow({ tone, className, ...props }: RowProps) {
  return (
    <tr
      className={clsx(
        "even:bg-[color-mix(in_oklab,var(--surface-2)_50%,transparent)] hover:bg-surface-2",
        tone && rowToneClasses[tone],
        className,
      )}
      {...props}
    />
  )
}
