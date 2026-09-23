import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { Card, PanelHead } from "@/components/ui";

/* ---------------------------------------------------------------------------
 * Chart primitives for the Analytics screen.
 *
 * Colour: two slots only — `--viz-1` (views) and `--viz-2` (clicks) — declared
 * per theme in styles.css and validated with the dataviz skill's checker
 * against both panel surfaces. Colour follows the *metric*, so a bar list of
 * page views and the pageviews line are the same hue on every card.
 *
 * Every chart carries a table view, so no value is reachable only by hovering.
 * ------------------------------------------------------------------------- */

export const VIZ_1 = "var(--viz-1)";
export const VIZ_2 = "var(--viz-2)";

/** 1,284 / 12.9K / 3.4M — compact but never lossy below 10,000. */
export function compact(n: number): string {
  if (!Number.isFinite(n)) return "—";
  if (Math.abs(n) < 10_000) return n.toLocaleString();
  if (Math.abs(n) < 1_000_000) return `${(n / 1_000).toFixed(1).replace(/\.0$/, "")}K`;
  return `${(n / 1_000_000).toFixed(1).replace(/\.0$/, "")}M`;
}

/**
 * Rounds an axis maximum up to a clean number that still halves cleanly (the
 * chart draws a mid gridline). A coarse 1/2/5 ladder would round a peak of 230
 * to 500 and leave half the plot empty, so the ladder is finer than that.
 */
const NICE_STEPS = [1, 1.2, 1.5, 2, 2.5, 3, 4, 5, 6, 8, 10];
function niceMax(value: number): number {
  if (value <= 0) return 4;
  const base = Math.pow(10, Math.floor(Math.log10(value)));
  const frac = value / base;
  const step = NICE_STEPS.find((s) => frac <= s + 1e-9) ?? 10;
  return step * base;
}

/** Tracks a block's own width so marks are laid out in real pixels (no squashed
 * strokes from a stretched viewBox). */
function useWidth<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const [width, setWidth] = useState(0);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => setWidth(entry.contentRect.width));
    ro.observe(el);
    setWidth(el.clientWidth);
    return () => ro.disconnect();
  }, []);
  return [ref, width] as const;
}

/** Panel wrapper with the mockup's 17px heading and a view switch (chart/table). */
export function ChartCard({
  title,
  subtitle,
  chart,
  table,
}: {
  title: string;
  subtitle?: string;
  chart: React.ReactNode;
  table: React.ReactNode;
}) {
  const [view, setView] = useState<"chart" | "table">("chart");
  return (
    <Card>
      <div className="mb-[18px] flex items-start justify-between gap-4">
        <div className="min-w-0">
          <h2 className="font-display text-section font-semibold tracking-[-.01em]">{title}</h2>
          {subtitle ? (
            <p className="mt-[5px] text-ui text-muted">
              {subtitle}
            </p>
          ) : null}
        </div>
        <div
          className="flex shrink-0 overflow-hidden rounded-control border border-line"
        >
          {(["chart", "table"] as const).map((v) => (
            <button
              key={v}
              type="button"
              onClick={() => setView(v)}
              aria-pressed={view === v}
              className="font-mono px-2.5 py-1.5 text-label uppercase tracking-[.08em]"
              style={{
                background: view === v ? "var(--hover)" : "transparent",
                color: view === v ? "var(--text)" : "var(--text3)",
              }}
            >
              {v}
            </button>
          ))}
        </div>
      </div>
      {view === "chart" ? chart : table}
    </Card>
  );
}

export interface TrendPoint {
  day: string;
  pageviews: number;
  clicks: number;
}

const SERIES = [
  { key: "pageviews" as const, label: "Pageviews", color: VIZ_1 },
  { key: "clicks" as const, label: "Clicks", color: VIZ_2 },
];

function shortDay(iso: string): string {
  const d = new Date(`${iso}T00:00:00`);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString(undefined, { day: "numeric", month: "short" });
}

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

export interface RankRow {
  label: string;
  value: number;
  /** Optional monospace treatment for paths and control ids. */
  mono?: boolean;
}

/**
 * Ranked horizontal bars: one series, one hue, value direct-labelled at the tip.
 * Bars are capped at 14px so the row keeps its air, and the track is a lighter
 * step of the same surface rather than a competing colour.
 */
export function RankedBars({
  rows,
  color = VIZ_1,
  emptyLabel,
  unit,
}: {
  rows: RankRow[];
  color?: string;
  emptyLabel: string;
  unit: string;
}) {
  if (!rows.length) {
    return (
      <p className="py-6 text-center text-ui text-faint">
        {emptyLabel}
      </p>
    );
  }
  const max = Math.max(...rows.map((r) => r.value), 1);
  return (
    <div className="flex flex-col gap-[13px]">
      {rows.map((r) => (
        <div key={r.label} title={`${r.label} — ${r.value.toLocaleString()} ${unit}`}>
          <div className="mb-1.5 flex items-baseline justify-between gap-3">
            <span
              className={`min-w-0 truncate text-ui text-ink ${r.mono ? "font-mono text-caption" : ""}`}
            >
              {r.label}
            </span>
            <span
              className="font-mono shrink-0 text-caption"
              style={{ color: "var(--text2)", fontVariantNumeric: "tabular-nums" }}
            >
              {r.value.toLocaleString()}
            </span>
          </div>
          <div className="h-[7px] w-full rounded-full" style={{ background: "var(--viz-track)" }}>
            <div
              className="h-full rounded-full"
              style={{ width: `${Math.max(2, (r.value / max) * 100)}%`, background: color }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

/** The chart/table twin for {@link RankedBars}. */
export function RankTable({ rows, head }: { rows: RankRow[]; head: [string, string] }) {
  return (
    <ScrollTable
      head={head}
      rows={rows.map((r) => [r.label, r.value.toLocaleString()])}
      numericFrom={1}
    />
  );
}

/** Plain two/three column table used for every chart's table view. */
export function ScrollTable({
  head,
  rows,
  numericFrom = 99,
}: {
  head: string[];
  rows: string[][];
  numericFrom?: number;
}) {
  if (!rows.length) {
    return (
      <p className="py-6 text-center text-ui text-faint">
        Nothing recorded in this range yet.
      </p>
    );
  }
  return (
    <div className="kf-tw max-h-[260px] overflow-y-auto">
      <table className="w-full border-collapse text-ui">
        <thead>
          <tr>
            {head.map((h, i) => (
              <th
                key={h}
                className="font-mono sticky top-0 border-b px-2 py-2 text-label tracking-[.08em]"
                style={{
                  borderColor: "var(--border)",
                  background: "var(--panel)",
                  color: "var(--text3)",
                  textAlign: i >= numericFrom ? "right" : "left",
                }}
              >
                {h.toUpperCase()}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, ri) => (
            <tr key={ri}>
              {r.map((c, ci) => (
                <td
                  key={ci}
                  className={ci >= numericFrom ? "font-mono px-2 py-2 text-right" : "px-2 py-2"}
                  style={{
                    borderBottom: "1px solid var(--border)",
                    color: ci >= numericFrom ? "var(--text)" : "var(--text2)",
                    fontVariantNumeric: ci >= numericFrom ? "tabular-nums" : undefined,
                  }}
                >
                  {c}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
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

export interface SourceRow {
  label: string;
  events: number;
  share: number;
  color: string;
}

/**
 * Traffic sources as share-of-total bars, one fixed hue per channel.
 *
 * This is the design export's signature analytics card. Unlike {@link RankedBars}
 * — one series, one hue, ranked by magnitude — each row here is a distinct
 * *category*, so colour carries identity and the assignment is fixed by channel
 * rather than by rank: filtering the list must never repaint the survivors.
 *
 * Every row is direct-labelled with its channel name and share, so identity is
 * never colour-alone, and the table view carries the raw counts.
 */
export function SourceShareBars({ rows }: { rows: SourceRow[] }) {
  if (!rows.length) {
    return (
      <p className="py-6 text-center text-ui text-faint">
        No traffic sources recorded in this range.
      </p>
    );
  }
  return (
    <div className="flex flex-col gap-[14px]">
      {rows.map((r) => (
        <div key={r.label} title={`${r.label} — ${r.events.toLocaleString()} events (${r.share}%)`}>
          <div className="mb-1.5 flex items-baseline justify-between gap-3 text-ui">
            <span className="flex min-w-0 items-center gap-2">
              <span
                className="h-[9px] w-[9px] shrink-0 rounded-full"
                style={{ background: r.color }}
                aria-hidden="true"
              />
              <span className="truncate">{r.label}</span>
            </span>
            <span
              className="font-mono shrink-0 text-caption"
              style={{ color: "var(--text2)", fontVariantNumeric: "tabular-nums" }}
            >
              {r.share}%
            </span>
          </div>
          <div className="h-[7px] w-full rounded-full" style={{ background: "var(--viz-track)" }}>
            <div
              className="h-full rounded-full"
              style={{ width: `${Math.max(2, r.share)}%`, background: r.color }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

/** The chart/table twin for {@link SourceShareBars}. */
export function SourceShareTable({ rows }: { rows: SourceRow[] }) {
  return (
    <ScrollTable
      head={["Source", "Events", "Share"]}
      rows={rows.map((r) => [r.label, r.events.toLocaleString(), `${r.share}%`])}
      numericFrom={1}
    />
  );
}
