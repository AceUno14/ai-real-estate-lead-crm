export default function DashboardLoading() {
  return (
    <div>
      <div className="mb-6">
        <div className="h-8 w-48 animate-pulse rounded bg-slate-200" />
        <div className="mt-2 h-4 w-72 animate-pulse rounded bg-slate-100" />
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, index) => (
          <div
            key={index}
            className="h-28 animate-pulse rounded-lg border border-slate-200 bg-white"
          />
        ))}
      </div>
    </div>
  );
}
