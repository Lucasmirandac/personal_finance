import clsx from "clsx"
import { InfoTip } from "@/components/ui/InfoTip"

type Props = React.HTMLAttributes<HTMLSpanElement> & {
  info?: React.ReactNode
}

export function SectionTitle({ className, info, children, ...props }: Props) {
  return (
    <span className={clsx("inline-flex items-center gap-1", className)}>
      <span
        className="text-caption font-semibold tracking-wider uppercase text-muted"
        {...props}
      >
        {children}
      </span>
      {info != null && (
        <InfoTip
          content={info}
          label={
            typeof children === "string"
              ? `Mais informações: ${children}`
              : "Mais informações"
          }
        />
      )}
    </span>
  )
}
