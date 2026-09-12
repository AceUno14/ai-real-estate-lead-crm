"use client";

export default function DashboardError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="rounded-lg border border-line bg-surface p-8 text-center shadow-xs">
      <h2 className="text-lg font-semibold text-ink">Something went wrong</h2>
      <p className="mt-2 text-sm text-muted">
        An unexpected error occurred. Please try again.
      </p>
      <button
        type="button"
        onClick={reset}
        className="mt-4 rounded-md bg-navy px-4 py-2 text-sm font-medium text-white hover:bg-navy-strong"
      >
        Try again
      </button>
    </div>
  );
}
