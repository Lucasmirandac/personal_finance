type Props = {
  label: string;
  value: string;
  hint?: string;
  tone?: "default" | "accent" | "warning" | "success";
};

export function KpiCard({ label, value, hint, tone = "default" }: Props) {
  const accent =
    tone === "accent"
      ? "text-[var(--accent)]"
      : tone === "warning"
        ? "text-[var(--warning)]"
        : tone === "success"
          ? "text-[var(--success)]"
          : "text-[var(--foreground)]";
  return (
    <div className="card p-4 flex flex-col gap-1">
      <div className="text-xs uppercase tracking-wide subtle">{label}</div>
      <div className={`text-2xl font-semibold ${accent}`}>{value}</div>
      {hint && <div className="text-xs subtle">{hint}</div>}
    </div>
  );
}
