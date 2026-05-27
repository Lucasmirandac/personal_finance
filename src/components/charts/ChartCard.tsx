import { Panel } from "@/components/ui/Panel";
import { SectionTitle } from "@/components/ui/SectionTitle";

type Props = {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  right?: React.ReactNode;
};

export function ChartCard({ title, subtitle, children, right }: Props) {
  return (
    <Panel className="p-3 flex flex-col gap-2">
      <div className="flex items-start justify-between gap-2">
        <div>
          <SectionTitle>{title}</SectionTitle>
          {subtitle && <div className="text-[11px] text-muted mt-0.5">{subtitle}</div>}
        </div>
        {right}
      </div>
      <div className="w-full h-56 sm:h-64">{children}</div>
    </Panel>
  );
}
