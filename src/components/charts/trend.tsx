import { useEffect, useState } from "react";
import { compact, niceMax, shortDay, VIZ_1, VIZ_2 } from "./scale";
import { ScrollTable } from "./ScrollTable";
import { LineChart } from "./lines";

export interface TrendPoint {
  day: string;
  pageviews: number;
  clicks: number;
}

const SERIES = [
  { key: "pageviews" as const, label: "Pageviews", color: VIZ_1 },
  { key: "clicks" as const, label: "Clicks", color: VIZ_2 },
];

/**
 * Two-series daily line chart on a single shared axis (both series are event
 * counts, so they belong on one scale — never a second y-axis).
 */
export function TrendChart({ data }: { data: TrendPoint[] }) {
  return <LineChart data={data} series={SERIES} label="Daily pageviews and clicks" />;
}

/** The chart/table twin for {@link TrendChart}. */
export function TrendTable({ data }: { data: TrendPoint[] }) {
  return (
    <ScrollTable
      head={["Day", "Pageviews", "Clicks"]}
      rows={data.map((d) => [shortDay(d.day), d.pageviews.toLocaleString(), d.clicks.toLocaleString()])}
      numericFrom={1}
    />
  );
}
/**
 * The Overview traffic column chart — the mockup's bar block, but scaled and
 * labelled rather than decorative.
 */
export function MiniColumns({ data }: { data: TrendPoint[] }) {
  const peak = Math.max(0, ...data.map((d) => d.pageviews));
  const max = niceMax(peak);
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  return (
    <div className="flex flex-1 flex-col justify-end">
      <div className="flex min-h-[150px] flex-1 items-end gap-[6px]">
        {data.map((d, i) => (
          <div
            key={d.day}
            title={`${shortDay(d.day)} — ${d.pageviews.toLocaleString()} pageviews`}
            className="min-w-0 flex-1 rounded-t-[5px]"
            style={{
              // A zero day still shows a 2px foot so the axis reads as a baseline.
              height: `${Math.max(1.5, (d.pageviews / max) * 100)}%`,
              background: VIZ_1,
              transformOrigin: "bottom",
              transform: mounted ? "scaleY(1)" : "scaleY(0)",
              transition: `transform .5s cubic-bezier(.22,1,.36,1) ${(i * 0.03).toFixed(2)}s`,
            }}
          />
        ))}
      </div>
      <div
        className="font-mono mt-2 flex justify-between text-label text-faint"
      >
        <span>{data.length ? shortDay(data[0].day) : ""}</span>
        <span>peak {compact(peak)}</span>
        <span>{data.length ? shortDay(data[data.length - 1].day) : ""}</span>
      </div>
    </div>
  );
}
