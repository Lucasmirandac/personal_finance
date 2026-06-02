import { LabelWithInfo } from "@/components/ui/LabelWithInfo";
import { g, type GlossaryKey } from "@/lib/glossary";

/** Column header label with optional glossary tooltip (for data tables). */
export function TableHeaderLabel({
  children,
  infoKey,
}: {
  children: string;
  infoKey?: GlossaryKey;
}) {
  return (
    <LabelWithInfo
      labelClassName="inline normal-case tracking-wide font-semibold text-[11px]"
      info={infoKey ? g(infoKey) : undefined}
      ariaTopic={children}
    >
      {children}
    </LabelWithInfo>
  );
}
