export default function Loading() {
  return (
    <div className="page-width py-16" role="status" aria-label="Loading page">
      <div aria-hidden="true" className="grid gap-8 md:grid-cols-2">
        <div className="space-y-5 py-6">
          <div className="h-3 w-32 rounded bg-line" />
          <div className="h-14 w-4/5 rounded bg-line" />
          <div className="h-14 w-3/5 rounded bg-line" />
          <div className="h-4 w-full rounded bg-line/60" />
        </div>
        <div className="min-h-56 rounded-xl border border-line bg-line/50" />
      </div>
    </div>
  );
}
