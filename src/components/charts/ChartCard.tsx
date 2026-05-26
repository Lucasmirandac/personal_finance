type Props = {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  right?: React.ReactNode;
};

export function ChartCard({ title, subtitle, children, right }: Props) {
  return (
    <div className="card p-4 flex flex-col gap-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="font-semibold">{title}</div>
          {subtitle && <div className="text-xs subtle">{subtitle}</div>}
        </div>
        {right}
      </div>
      <div className="w-full h-72">{children}</div>
    </div>
  );
}
