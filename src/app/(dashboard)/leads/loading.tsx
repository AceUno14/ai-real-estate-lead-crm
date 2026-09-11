export default function LeadsLoading() {
  return (
    <div>
      <div className="mb-6">
        <div className="h-8 w-40 animate-pulse rounded bg-slate-200" />
        <div className="mt-2 h-4 w-64 animate-pulse rounded bg-slate-100" />
      </div>
      <div className="space-y-3">
        {Array.from({ length: 5 }).map((_, index) => (
          <div
            key={index}
            className="h-16 animate-pulse rounded-md border border-slate-200 bg-white"
          />
        ))}
      </div>
    </div>
  );
}
