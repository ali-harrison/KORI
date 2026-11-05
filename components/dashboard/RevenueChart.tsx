"use client";

import { useMemo, useRef, useState } from "react";
import { cn, formatCurrency } from "@/utils";
import type { RevenueSeries } from "@/types";

function niceMax(value: number): number {
  if (value <= 0) return 100;
  const magnitude = 10 ** Math.floor(Math.log10(value));
  const step = [1, 1.2, 1.5, 2, 2.5, 3, 4, 5, 6, 8, 10].find((candidate) => value <= candidate * magnitude) ?? 10;
  return step * magnitude;
}

// Money lands on charge days and stays banked, so the honest shape is a step,
// not a sloped line implying it trickled in between. It also happens to be the
// shape of a poutama.
function stepPath(values: number[], x: (day: number) => number, y: (value: number) => number): string {
  let path = `M${x(1)} ${y(values[0])}`;
  for (let day = 2; day <= values.length; day++) path += `H${x(day)}V${y(values[day - 1])}`;
  return path;
}

export function RevenueChart({ series }: { series: RevenueSeries }) {
  const { current, previous, daysInMonth, currentLabel, previousLabel } = series;
  const plotRef = useRef<HTMLDivElement>(null);
  const [hovered, setHovered] = useState<number | null>(null);

  const lastDay = Math.max(daysInMonth, previous.length);
  const today = current.length;
  const top = niceMax(Math.max(...current, ...previous, 1));

  const x = (day: number) => ((day - 1) / (lastDay - 1)) * 100;
  const y = (value: number) => 100 - (value / top) * 100;

  const paths = useMemo(() => {
    const line = stepPath(current, x, y);
    return { line, area: `${line}V100H${x(1)}Z`, prior: stepPath(previous, x, y) };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [series]);

  const ticks = [top / 2, top];
  const dayTicks = [1, 8, 15, 22, 29].filter((day) => day <= lastDay);

  function dayFromPointer(clientX: number): number {
    const rect = plotRef.current!.getBoundingClientRect();
    const ratio = Math.min(Math.max((clientX - rect.left) / rect.width, 0), 1);
    return Math.round(ratio * (lastDay - 1)) + 1;
  }

  const readout = hovered ?? today;
  const currentAt = hovered !== null && hovered > today ? null : current[readout - 1];
  const previousAt = previous[Math.min(readout, previous.length) - 1];
  const tooltipOnLeft = x(readout) > 60;

  return (
    <div className="px-4 pt-4 pb-3">
      <div className="flex flex-wrap items-center gap-x-5 gap-y-1 mb-4">
        <span className="label flex items-center gap-2 text-fg-2">
          <span aria-hidden className="w-4 h-0.5 bg-chart-line" />
          {currentLabel}
        </span>
        <span className="label flex items-center gap-2">
          <span aria-hidden className="w-4 h-0.5 bg-chart-prior" />
          {previousLabel}
        </span>
      </div>

      <div
        ref={plotRef}
        role="group"
        tabIndex={0}
        aria-label={`Money collected, ${currentLabel} against ${previousLabel}. ${formatCurrency(current[today - 1])} by day ${today}. Use the left and right arrow keys to move through the days.`}
        onPointerMove={(event) => setHovered(dayFromPointer(event.clientX))}
        onPointerLeave={() => setHovered(null)}
        onBlur={() => setHovered(null)}
        onKeyDown={(event) => {
          if (event.key === "ArrowLeft") setHovered((day) => Math.max((day ?? today) - 1, 1));
          if (event.key === "ArrowRight") setHovered((day) => Math.min((day ?? today) + 1, lastDay));
        }}
        className="relative h-56 sm:h-64 touch-pan-y cursor-crosshair"
      >
        {ticks.map((tick) => (
          <div key={tick} aria-hidden className="absolute inset-x-0 border-t border-line" style={{ top: `${y(tick)}%` }}>
            <span className="label absolute left-0 top-0.5">{formatCurrency(tick)}</span>
          </div>
        ))}
        <div aria-hidden className="absolute inset-x-0 bottom-0 border-t border-line-strong" />

        <svg aria-hidden viewBox="0 0 100 100" preserveAspectRatio="none" className="draw-in absolute inset-0 w-full h-full overflow-visible">
          <path d={paths.area} fill="var(--chart-area)" />
          <path d={paths.prior} fill="none" stroke="var(--chart-prior)" strokeWidth="1.5" vectorEffect="non-scaling-stroke" />
          <path d={paths.line} fill="none" stroke="var(--chart-line)" strokeWidth="2" vectorEffect="non-scaling-stroke" />
        </svg>

        {/* Where the month stands right now, and where last month finished. */}
        <span aria-hidden className="absolute size-2 -ml-1 -mt-1 bg-chart-line" style={{ left: `${x(today)}%`, top: `${y(current[today - 1])}%` }} />
        <span
          aria-hidden
          className={cn("absolute -translate-y-1/2 tabular-nums text-[13px] bg-bg px-1", x(today) > 82 ? "-translate-x-full -ml-2" : "ml-2")}
          style={{ left: `${x(today)}%`, top: `${y(current[today - 1])}%` }}
        >
          {formatCurrency(current[today - 1])}
        </span>
        <span aria-hidden className="absolute right-0 -translate-y-full -mt-1 tabular-nums text-xs text-fg-3" style={{ top: `${y(previous[previous.length - 1])}%` }}>
          {formatCurrency(previous[previous.length - 1])}
        </span>

        {hovered !== null && (
          <>
            <div aria-hidden className="absolute inset-y-0 border-l border-line-strong pointer-events-none" style={{ left: `${x(hovered)}%` }} />
            <div
              className={cn("absolute top-2 z-10 pointer-events-none bg-raised border border-line-strong px-3 py-2 min-w-36", tooltipOnLeft ? "-translate-x-full -ml-2" : "ml-2")}
              style={{ left: `${x(hovered)}%` }}
              role="status"
            >
              <p className="label mb-1.5">Day {hovered}</p>
              {currentAt !== null && (
                <p className="flex items-center justify-between gap-4">
                  <span className="tabular-nums">{formatCurrency(currentAt)}</span>
                  <span className="label">{currentLabel}</span>
                </p>
              )}
              {previousAt !== undefined && (
                <p className="flex items-center justify-between gap-4">
                  <span className="tabular-nums text-fg-2">{formatCurrency(previousAt)}</span>
                  <span className="label">{previousLabel}</span>
                </p>
              )}
            </div>
          </>
        )}
      </div>

      <div aria-hidden className="relative h-6 mt-1">
        {dayTicks.map((day) => (
          <span key={day} className="label absolute -translate-x-1/2 first:translate-x-0" style={{ left: `${x(day)}%` }}>{day}</span>
        ))}
      </div>

      <table className="sr-only">
        <caption>Cumulative money collected by day</caption>
        <thead>
          <tr>
            <th scope="col">Day</th>
            <th scope="col">{currentLabel}</th>
            <th scope="col">{previousLabel}</th>
          </tr>
        </thead>
        <tbody>
          {current.map((value, index) => (
            <tr key={index}>
              <td>{index + 1}</td>
              <td>{formatCurrency(value)}</td>
              <td>{previous[index] !== undefined ? formatCurrency(previous[index]) : "—"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
