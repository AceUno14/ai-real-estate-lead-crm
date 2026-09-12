import type { ReactNode } from "react";

/**
 * Shared lead-detail section primitive (UI Phase 2).
 *
 * A crisp white card with a consistent header pattern (small uppercase
 * section title + optional side content). Purely presentational — all data
 * and actions are passed in by the page.
 */
export function DetailSection({
  id,
  title,
  aside,
  children,
}: {
  id: string;
  title: string;
  aside?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section
      id={id}
      aria-labelledby={id}
      className="rounded-lg border border-line bg-surface shadow-xs"
    >
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 border-b border-line px-4 py-3 sm:px-6">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-muted">
          {title}
        </h2>
        {aside ? <div className="min-w-0">{aside}</div> : null}
      </div>
      <div className="px-4 py-4 sm:px-6 sm:py-5">{children}</div>
    </section>
  );
}

/**
 * A single label/value row used across contact/inquiry and qualification
 * metadata. `emphasis` bumps the value weight for sales-critical fields
 * (budget, timeline, financing, location).
 */
export function MetaItem({
  label,
  value,
  emphasis = false,
}: {
  label: string;
  value: ReactNode;
  emphasis?: boolean;
}) {
  return (
    <div>
      <dt className="text-[11px] font-medium uppercase tracking-wide text-faint">
        {label}
      </dt>
      <dd
        className={`mt-0.5 break-words text-sm ${
          emphasis ? "font-medium text-ink" : "text-ink-secondary"
        }`}
      >
        {value}
      </dd>
    </div>
  );
}

/** Placeholder for optional fields with no value. */
export function NoValue() {
  return <span className="text-faint">—</span>;
}

/**
 * Small header for a titled sub-block inside a section card
 * (e.g. "Inquiry message", "AI draft reply").
 */
export function SubHeading({ children }: { children: ReactNode }) {
  return (
    <h3 className="text-[11px] font-medium uppercase tracking-wide text-faint">
      {children}
    </h3>
  );
}
