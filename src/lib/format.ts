/**
 * Date formatting helpers (UI Phase 2).
 *
 * Small, dependency-free presentation utilities shared by the lead detail
 * panels. Formatting only — no business logic.
 */

/** "Sep 12, 2026, 3:24 PM" — used for exact timestamps. */
export function formatDateTime(date: Date): string {
  return new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

/** "Sep 12" / "Sep 12, 2025" — year shown only when it is not the current year. */
export function formatShortDate(date: Date): string {
  const now = new Date();
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    ...(date.getFullYear() === now.getFullYear() ? {} : { year: "numeric" }),
  }).format(date);
}

/**
 * Relative time ("3h ago", "in 2h", "yesterday") with an absolute fallback
 * for anything older than ~7 days. Used by the activity timeline.
 */
export function formatRelativeTime(date: Date, now = new Date()): string {
  const diffMs = date.getTime() - now.getTime();
  const diffMinutes = Math.round(diffMs / 60000);
  const absMinutes = Math.abs(diffMinutes);

  const rtf = new Intl.RelativeTimeFormat("en", { numeric: "auto" });

  if (absMinutes < 1) return "just now";
  if (absMinutes < 60) return rtf.format(-diffMinutes, "minute");
  if (absMinutes < 60 * 24) return rtf.format(-Math.round(diffMinutes / 60), "hour");
  if (absMinutes < 60 * 24 * 7) {
    return rtf.format(-Math.round(diffMinutes / (60 * 24)), "day");
  }
  return formatDateTime(date);
}

/**
 * Timeline timestamp: relative time for recent events, short date for
 * older ones — scannable without losing precision.
 */
export function formatActivityTimestamp(date: Date): string {
  const absMinutes = Math.abs((date.getTime() - Date.now()) / 60000);
  return absMinutes < 60 * 24 * 7
    ? formatRelativeTime(date)
    : formatShortDate(date);
}

/**
 * Due-date label for follow-up tasks: "Today at 3:00 PM", "Tomorrow at
 * 9:00 AM", otherwise the medium datetime. Overdue awareness is handled
 * by the caller for styling.
 */
export function formatDueLabel(date: Date, now = new Date()): string {
  const startOf = (d: Date) =>
    new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  const dayDiff = Math.round((startOf(date) - startOf(now)) / 86400000);

  const time = new Intl.DateTimeFormat("en", { timeStyle: "short" }).format(date);
  if (dayDiff === 0) return `Today at ${time}`;
  if (dayDiff === 1) return `Tomorrow at ${time}`;
  if (dayDiff === -1) return `Yesterday at ${time}`;
  return formatDateTime(date);
}

/** Currency range for budget display: "$250k – $400k", "$250k+", "up to $400k", "—". */
export function formatBudgetRange(
  min: number | null,
  max: number | null,
): string {
  const fmt = (value: number) =>
    value >= 1000 ? `$${Math.round(value / 100) / 10}k` : `$${value}`;

  if (min !== null && max !== null) return `${fmt(min)} – ${fmt(max)}`;
  if (min !== null) return `${fmt(min)}+`;
  if (max !== null) return `up to ${fmt(max)}`;
  return "—";
}
