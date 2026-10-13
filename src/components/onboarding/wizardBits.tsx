import clsx from "clsx";
import { Info } from "lucide-react";

export function StepIntro({
  icon,
  iconClassName,
  title,
  subtitle,
}: Readonly<{
  icon: React.ReactNode;
  iconClassName: string;
  title: string;
  subtitle: string;
}>) {
  return (
    <div>
      <span
        className={clsx(
          "flex h-12 w-12 items-center justify-center rounded-2xl",
          iconClassName,
        )}
      >
        {icon}
      </span>
      <h2 className="mt-5 text-lg font-semibold tracking-tight">{title}</h2>
      <p className="mt-1 text-sm text-muted">{subtitle}</p>
    </div>
  );
}

export function RequiredNote({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <div className="rounded-2xl border border-border bg-surface-2/60 p-4">
      <p className="flex items-center gap-2 text-sm font-medium">
        <Info size={15} className="text-warning" />
        Obrigatório
      </p>
      <p className="mt-2 text-sm text-muted">{children}</p>
    </div>
  );
}
