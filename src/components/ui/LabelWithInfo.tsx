import clsx from "clsx";
import { InfoTip } from "@/components/ui/InfoTip";

type Props = {
  children?: React.ReactNode;
  info?: React.ReactNode;
  className?: string;
  labelClassName?: string;
  ariaTopic?: string;
};

/** Metric/section label with optional InfoTip (for non-StatTile layouts). */
export function LabelWithInfo({
  children,
  info,
  className,
  labelClassName,
  ariaTopic,
}: Props) {
  return (
    <span className={clsx("inline-flex items-center gap-1", className)}>
      {children != null && <span className={labelClassName}>{children}</span>}
      {info != null && (
        <InfoTip
          content={info}
          label={
            ariaTopic
              ? `Mais informações: ${ariaTopic}`
              : "Mais informações"
          }
        />
      )}
    </span>
  );
}
