import type { MandateSummary, MandateBadgeState } from "@/types";
import { MANDATE_STATE_LABEL } from "@/utils";

interface MandateBarProps {
  summary: MandateSummary;
}

const SEGMENT_ORDER: MandateBadgeState[] = ["active", "pending", "failed", "cancelled", "none"];

const SEGMENT_COLOR: Record<MandateBadgeState, string> = {
  active: "#3fb389",
  pending: "#cba55e",
  failed: "#cf7263",
  cancelled: "#7d857f",
  none: "#454c47",
};

// 5 segments, not the design reference's 4 — "none" (never on direct
// debit, e.g. cash-paying members) is real data too; silently excluding it
// while implying the bar represents everyone would be misleading.
export function MandateBar({ summary }: MandateBarProps) {
  const total = summary.total || 1;

  return (
    <div>
      <div className="flex h-[7px] rounded-full overflow-hidden gap-[2px] my-3.5">
        {SEGMENT_ORDER.map(
          (state) =>
            summary[state] > 0 && (
              <div
                key={state}
                className="h-full"
                style={{ width: `${(summary[state] / total) * 100}%`, background: SEGMENT_COLOR[state] }}
              />
            )
        )}
      </div>
      <div className="flex flex-col">
        {SEGMENT_ORDER.map((state) => (
          <div key={state} className="flex items-center gap-2 py-[5px] text-[12.5px]">
            <span
              className="w-[7px] h-[7px] rounded-[2px] flex-shrink-0 inline-block"
              style={{ background: SEGMENT_COLOR[state] }}
            />
            <span className="flex-1 text-[#b9c0ba]">{MANDATE_STATE_LABEL[state]}</span>
            <span className="tabular-nums text-[#e7eae8]">{summary[state]}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
