import { MANDATE_STATE_LABEL } from "@/utils";
import type { MandateBadgeState, MandateSummary } from "@/types";

const ORDER: MandateBadgeState[] = ["active", "pending", "cancelling", "on_hold", "cancelled", "none"];

// One thin bar per state rather than six colours in a stacked strip: the count
// is what matters, and length reads it without a legend to decode.
export function MandateBreakdown({ summary }: { summary: MandateSummary }) {
  const total = summary.total || 1;

  return (
    <ul className="px-4 py-3">
      {ORDER.map((state) => (
        <li key={state} className="py-2">
          <div className="flex items-baseline justify-between gap-3 text-[13px]">
            <span className="text-fg-2">{MANDATE_STATE_LABEL[state]}</span>
            <span className="tabular-nums">{summary[state]}</span>
          </div>
          <div aria-hidden className="h-0.5 mt-1.5 bg-line">
            <div className="h-full bg-chart-line" style={{ width: `${(summary[state] / total) * 100}%` }} />
          </div>
        </li>
      ))}
    </ul>
  );
}
