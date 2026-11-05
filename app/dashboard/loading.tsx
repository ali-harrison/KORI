// Shown instantly on navigation while the next page's data loads. Static
// placeholders rather than a pulse — the design system keeps animation to
// modals and the slide-over.
const block = "bg-[#111412] border border-[#1f2420] rounded-[10px]";

export default function DashboardLoading() {
  return (
    <div aria-busy="true" aria-label="Loading">
      <div className="h-6 w-44 rounded-[6px] bg-[#151a16] mb-2" />
      <div className="h-4 w-64 max-w-full rounded-[6px] bg-[#111412] mb-[22px]" />
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className={`${block} h-[106px]`} />
        ))}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-[1.5fr_1fr] gap-3 mt-3">
        <div className={`${block} h-72`} />
        <div className={`${block} h-72`} />
      </div>
    </div>
  );
}
