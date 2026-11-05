// Shown instantly on navigation while the next page's data loads. Same seams
// as the real page, so content lands in place rather than jumping.
export default function DashboardLoading() {
  return (
    <div aria-busy="true" aria-label="Loading">
      <div className="h-3 w-40 bg-raised mb-4" />
      <div className="h-10 w-[min(36rem,100%)] bg-raised mb-8" />
      <div className="seams grid-cols-2 lg:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="bg-bg h-28" />
        ))}
        <div className="bg-bg h-72 col-span-2 lg:col-span-4" />
      </div>
    </div>
  );
}
