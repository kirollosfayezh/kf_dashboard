import { useState } from "react";
import { compact, niceMax, shortDay } from "./scale";
import { useWidth } from "./use-width";

export interface StackSeries<K extends string> {
  key: K;
  label: string;
  color: string;
}

export type StackRow<K extends string> = { day: string } & Record<K, number>;

/**
 * Sums days into weeks (keyed by each week's first day) once a range is too
 * long for one column per day to stay readable.
 */
export function bucketRows<K extends string>(rows: StackRow<K>[], keys: K[], maxColumns = 45): { rows: StackRow<K>[]; weekly: boolean } {
  if (rows.length <= maxColumns) return { rows, weekly: false };
  const out: StackRow<K>[] = [];
  for (let i = 0; i < rows.length; i += 7) {
    const chunk = rows.slice(i, i + 7);
    const r = { day: chunk[0].day } as StackRow<K>;
    for (const k of keys) (r as Record<K, number>)[k] = chunk.reduce<number>((a, c) => a + (c[k] as number), 0);
    out.push(r);
  }
  return { rows: out, weekly: true };
}

/**
 * Stacked columns: composition over time with the total as the column height.
 * Segments keep a 2px surface gap, the data end is rounded, colour follows the
 * series key (fixed order), and hovering a column lists every segment.
 */
export function StackedColumns<K extends string>({
  data,
  series,
  label,
  unit,
}: {
  data: StackRow<K>[];
  series: StackSeries<K>[];
  label: string;
  unit: string;
}) {
  const [ref, width] = useWidth<HTMLDivElement>();
  const [hover, setHover] = useState<number | null>(null);
  const { rows, weekly } = bucketRows(data, series.map((s) => s.key));

  const PAD = { top: 12, right: 8, bottom: 26, left: 36 };
  const PLOT_H = 168;
  const height = PLOT_H + PAD.top + PAD.bottom;
  const innerW = Math.max(0, width - PAD.left - PAD.right);
  const totals = rows.map((r) => series.reduce((a, s) => a + r[s.key], 0));
  const max = niceMax(Math.max(0, ...totals));
  const slot = rows.length ? innerW / rows.length : 0;
  const barW = Math.max(2, Math.min(28, slot - Math.max(2, slot * 0.28)));
  const y = (v: number) => (v / max) * PLOT_H;

  const labelEvery = Math.max(1, Math.ceil(rows.length / Math.max(2, Math.floor(innerW / 66))));
  const active = hover != null ? rows[hover] : null;

  return (
    <div>
      <div className="mb-3 flex flex-wrap gap-x-4 gap-y-1.5">
        {series.map((s) => (
          <span key={s.key} className="flex items-center gap-2 text-caption text-muted">
            <span className="h-[9px] w-[9px] rounded-[2px]" style={{ background: s.color }} />
            {s.label}
          </span>
        ))}
      </div>
      <div ref={ref} className="relative touch-pan-y">
        {width > 0 ? (
          <svg
            width={width}
            height={height}
            role="img"
            aria-label={label}
            onMouseLeave={() => setHover(null)}
            onMouseMove={(e) => {
              const i = Math.floor((e.clientX - e.currentTarget.getBoundingClientRect().left - PAD.left) / slot);
              setHover(i >= 0 && i < rows.length ? i : null);
            }}
            onTouchStart={(e) => {
              const i = Math.floor((e.touches[0].clientX - e.currentTarget.getBoundingClientRect().left - PAD.left) / slot);
              setHover(i >= 0 && i < rows.length ? i : null);
            }}
          >
            {[0, max / 2, max].map((t) => (
              <g key={t}>
                <line x1={PAD.left} x2={width - PAD.right} y1={PAD.top + PLOT_H - y(t)} y2={PAD.top + PLOT_H - y(t)} stroke="var(--viz-grid)" />
                <text
                  x={PAD.left - 8}
                  y={PAD.top + PLOT_H - y(t) + 4}
                  textAnchor="end"
                  className="font-mono"
                  style={{ fontSize: 10, fill: "var(--text3)", fontVariantNumeric: "tabular-nums" }}
                >
                  {compact(t)}
                </text>
              </g>
            ))}
            {rows.map((r, i) => {
              const cx = PAD.left + slot * i + slot / 2;
              let base = PAD.top + PLOT_H;
              const segs = series.filter((s) => r[s.key] > 0);
              return (
                <g key={r.day} opacity={hover == null || hover === i ? 1 : 0.45}>
                  {segs.map((s, si) => {
                    const h = y(r[s.key]);
                    const top = base - h;
                    const isTop = si === segs.length - 1;
                    // A 2px surface gap above every segment that has another on top of it.
                    const el = (
                      <rect
                        key={s.key}
                        x={cx - barW / 2}
                        y={isTop ? top : top + 2}
                        width={barW}
                        height={Math.max(isTop ? 1 : 0, isTop ? h : h - 2)}
                        rx={isTop ? Math.min(4, barW / 2) : 0}
                        fill={s.color}
                      />
                    );
                    base = top;
                    return el;
                  })}
                </g>
              );
            })}
            {rows.map((r, i) =>
              i % labelEvery === 0 || i === rows.length - 1 ? (
                i !== rows.length - 1 && rows.length - 1 - i < labelEvery * 0.7 ? null : (
                  <text
                    key={r.day}
                    x={i === 0 ? PAD.left : i === rows.length - 1 ? PAD.left + slot * rows.length : PAD.left + slot * i + slot / 2}
                    y={height - 8}
                    textAnchor={i === 0 ? "start" : i === rows.length - 1 ? "end" : "middle"}
                    className="font-mono"
                    style={{ fontSize: 10, fill: "var(--text3)" }}
                  >
                    {shortDay(r.day)}
                  </text>
                )
              ) : null,
            )}
          </svg>
        ) : (
          <div style={{ height }} />
        )}
        {active && hover != null && width > 0 ? (
          <div
            className="pointer-events-none absolute z-10 rounded-control border px-3 py-2 text-caption"
            style={{
              borderColor: "var(--border)",
              background: "var(--panel2)",
              boxShadow: "0 18px 40px -22px rgba(0,0,0,.8)",
              top: 4,
              left: Math.min(Math.max(PAD.left + slot * hover + slot / 2 - 85, 0), Math.max(0, width - 180)),
              minWidth: 170,
            }}
          >
            <div className="font-mono mb-1 text-label tracking-[.06em] text-faint">
              {weekly ? "WEEK OF " : ""}
              {shortDay(active.day).toUpperCase()} · {totals[hover].toLocaleString()} {unit}
            </div>
            {[...series].reverse().map((s) => (
              <div key={s.key} className="flex items-center justify-between gap-4">
                <span className="flex items-center gap-2 text-muted">
                  <span className="h-[8px] w-[8px] rounded-[2px]" style={{ background: s.color }} />
                  {s.label}
                </span>
                <span className="font-mono text-ink" style={{ fontVariantNumeric: "tabular-nums" }}>
                  {active[s.key].toLocaleString()}
                </span>
              </div>
            ))}
          </div>
        ) : null}
      </div>
      {weekly ? <p className="font-mono mt-1 text-label text-faint">Grouped by week for this range.</p> : null}
    </div>
  );
}
