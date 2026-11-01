import { useEffect, useState } from "react";
import { compact, niceMax, shortDay, VIZ_1, VIZ_2 } from "./scale";
import { ScrollTable } from "./ScrollTable";
import { useWidth } from "./use-width";

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
  const [ref, width] = useWidth<HTMLDivElement>();
  const [hover, setHover] = useState<number | null>(null);

  const PAD = { top: 12, right: 14, bottom: 26, left: 44 };
  const PLOT_H = 168;
  const height = PLOT_H + PAD.top + PAD.bottom;
  const innerW = Math.max(0, width - PAD.left - PAD.right);

  const peak = Math.max(0, ...data.flatMap((d) => [d.pageviews, d.clicks]));
  const max = niceMax(peak);
  const ticks = [0, max / 2, max];

  const x = (i: number) => (data.length <= 1 ? PAD.left + innerW / 2 : PAD.left + (i * innerW) / (data.length - 1));
  const y = (v: number) => PAD.top + PLOT_H - (v / max) * PLOT_H;

  // Pick tick positions from the *measured* width, not the point count, so the
  // date labels never collide on a narrow card. ~66px per label, always the
  // first and last day, and drop any middle tick that crowds the last one.
  const slots = Math.max(2, Math.min(7, Math.floor(innerW / 66)));
  const step = Math.max(1, Math.round((data.length - 1) / (slots - 1)));
  const tickIndexes = new Set<number>();
  for (let i = 0; i < data.length - 1; i += step) tickIndexes.add(i);
  for (const i of [...tickIndexes]) {
    if (data.length - 1 - i < step * 0.7) tickIndexes.delete(i);
  }
  if (data.length) tickIndexes.add(data.length - 1);

  const active = hover != null ? data[hover] : null;

  return (
    <div>
      {/* A legend is always present for two series. */}
      <div className="mb-3 flex flex-wrap gap-4">
        {SERIES.map((s) => (
          <span key={s.key} className="flex items-center gap-2 text-caption text-muted">
            <span className="h-[3px] w-[14px] rounded-full" style={{ background: s.color }} />
            {s.label}
          </span>
        ))}
      </div>

      <div ref={ref} className="relative">
        {width > 0 ? (
          <svg
            width={width}
            height={height}
            role="img"
            aria-label="Daily pageviews and clicks"
            onMouseLeave={() => setHover(null)}
            onMouseMove={(e) => {
              if (!data.length) return;
              const rect = e.currentTarget.getBoundingClientRect();
              const px = e.clientX - rect.left;
              const i = data.length <= 1
                ? 0
                : Math.round(((px - PAD.left) / innerW) * (data.length - 1));
              setHover(Math.min(data.length - 1, Math.max(0, i)));
            }}
          >
            {/* Solid hairline grid, one step off the surface. */}
            {ticks.map((t) => (
              <g key={t}>
                <line
                  x1={PAD.left}
                  x2={width - PAD.right}
                  y1={y(t)}
                  y2={y(t)}
                  stroke="var(--viz-grid)"
                  strokeWidth={1}
                />
                <text
                  x={PAD.left - 8}
                  y={y(t) + 4}
                  textAnchor="end"
                  className="font-mono"
                  style={{ fontSize: 10, fill: "var(--text3)", fontVariantNumeric: "tabular-nums" }}
                >
                  {compact(t)}
                </text>
              </g>
            ))}

            {data.map((d, i) =>
              tickIndexes.has(i) ? (
                <text
                  key={d.day}
                  x={x(i)}
                  y={height - 8}
                  textAnchor={i === data.length - 1 ? "end" : i === 0 ? "start" : "middle"}
                  className="font-mono"
                  style={{ fontSize: 10, fill: "var(--text3)" }}
                >
                  {shortDay(d.day)}
                </text>
              ) : null,
            )}

            {hover != null ? (
              <line
                x1={x(hover)}
                x2={x(hover)}
                y1={PAD.top}
                y2={PAD.top + PLOT_H}
                stroke="var(--bstrong)"
                strokeWidth={1}
              />
            ) : null}

            {SERIES.map((s) => (
              <polyline
                key={s.key}
                points={data.map((d, i) => `${x(i)},${y(d[s.key])}`).join(" ")}
                fill="none"
                stroke={s.color}
                strokeWidth={2}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            ))}

            {/* A single day would otherwise draw nothing — give it a marker. */}
            {data.length === 1
              ? SERIES.map((s) => (
                  <circle key={s.key} cx={x(0)} cy={y(data[0][s.key])} r={4} fill={s.color} />
                ))
              : null}

            {/* 2px surface ring keeps the hovered markers legible where they overlap. */}
            {hover != null && active
              ? SERIES.map((s) => (
                  <circle
                    key={s.key}
                    cx={x(hover)}
                    cy={y(active[s.key])}
                    r={4.5}
                    fill={s.color}
                    stroke="var(--panel)"
                    strokeWidth={2}
                  />
                ))
              : null}
          </svg>
        ) : (
          <div style={{ height }} />
        )}

        {hover != null && active && width > 0 ? (
          <div
            className="pointer-events-none absolute z-10 rounded-control border px-3 py-2 text-caption"
            style={{
              borderColor: "var(--border)",
              background: "var(--panel2)",
              boxShadow: "0 18px 40px -22px rgba(0,0,0,.8)",
              top: 4,
              left: Math.min(Math.max(x(hover) - 70, 0), Math.max(0, width - 150)),
              minWidth: 140,
            }}
          >
            <div className="font-mono mb-1 text-label tracking-[.06em] text-faint">
              {shortDay(active.day).toUpperCase()}
            </div>
            {SERIES.map((s) => (
              <div key={s.key} className="flex items-center justify-between gap-4">
                <span className="flex items-center gap-2 text-muted">
                  <span className="h-[3px] w-[10px] rounded-full" style={{ background: s.color }} />
                  {s.label}
                </span>
                <span className="font-mono" style={{ fontVariantNumeric: "tabular-nums" }}>
                  {active[s.key].toLocaleString()}
                </span>
              </div>
            ))}
          </div>
        ) : null}
      </div>
    </div>
  );
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
