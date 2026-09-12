export default function DashboardLoading() {
  return (
    <div>
      <div className="mb-6">
        <div className="h-8 w-48 animate-pulse rounded bg-line" />
        <div className="mt-2 h-4 w-72 animate-pulse rounded bg-line" />
      </div>
      <div className="grid gap-4 sm:grid-cols-3">
        {Array.from({ length: 3 }).map((_, index) => (
          <div
            key={index}
            className="h-32 animate-pulse rounded-lg border border-line bg-surface"
          />
        ))}
      </div>
      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 3 }).map((_, index) => (
          <div
            key={index}
            className="h-24 animate-pulse rounded-lg border border-line bg-surface"
          />
        ))}
      </div>
    </div>
  );
}
