export function MetricCard({
  label,
  value,
  hint,
  tone = "neutral",
}: {
  label: string;
  value: string | number;
  hint?: string;
  tone?: "neutral" | "success" | "warning" | "danger";
}) {
  const toneClasses = {
    neutral: "text-ink",
    success: "text-success",
    warning: "text-warning",
    danger: "text-danger",
  } as const;

  const accentBarClasses = {
    neutral: "bg-line-strong",
    success: "bg-success",
    warning: "bg-warning",
    danger: "bg-danger",
  } as const;

  return (
    <div className="relative overflow-hidden rounded-lg border border-line bg-surface p-5 shadow-xs">
      <span
        aria-hidden="true"
        className={`absolute inset-x-0 top-0 h-0.5 ${accentBarClasses[tone]}`}
      />
      <p className="text-xs font-medium uppercase tracking-wide text-muted">
        {label}
      </p>
      <p className={`mt-2 text-2xl font-semibold tabular-nums ${toneClasses[tone]}`}>
        {value}
      </p>
      {hint ? <p className="mt-1 text-xs text-muted">{hint}</p> : null}
    </div>
  );
}
