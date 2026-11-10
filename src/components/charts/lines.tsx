import { useState } from "react";
import { compact, niceMax, shortDay } from "./scale";
import { useWidth } from "./use-width";

export interface LineSeries<K extends string> {
  key: K;
  label: string;
  color: string;
  /** SVG dash pattern — secondary encoding for a pair that colour alone can't separate (CVD). */
  dash?: string;
}

export type LineRow<K extends string> = { day: string } & Record<K, number>;

/**
 * Daily multi-series line chart on ONE shared axis (every series must be the
 * same unit — never a second y-axis). Legend always on for 2+ series, a
 * crosshair + tooltip on hover/touch, and day labels laid out from the
 * measured width so they never collide on a narrow card.
 */
export function LineChart<K extends string>({
  data,
  series,
  height: plotH = 168,
  label,
  unit,
}: {
  data: LineRow<K>[];
  series: LineSeries<K>[];
  height?: number;
  label: string;
  unit?: string;
}) {
  const [ref, width] = useWidth<HTMLDivElement>();
  const [hover, setHover] = useState<number | null>(null);

  const PAD = { top: 12, right: 14, bottom: 26, left: 40 };
  const height = plotH + PAD.top + PAD.bottom;
  const innerW = Math.max(0, width - PAD.left - PAD.right);

  const peak = Math.max(0, ...data.flatMap((d) => series.map((s) => d[s.key])));
  const max = niceMax(peak);
  const ticks = [0, max / 2, max];

  const x = (i: number) => (data.length <= 1 ? PAD.left + innerW / 2 : PAD.left + (i * innerW) / (data.length - 1));
  const y = (v: number) => PAD.top + plotH - (v / max) * plotH;

  const slots = Math.max(2, Math.min(7, Math.floor(innerW / 66)));
  const step = Math.max(1, Math.round((data.length - 1) / (slots - 1)));
  const tickIndexes = new Set<number>();
  for (let i = 0; i < data.length - 1; i += step) tickIndexes.add(i);
  for (const i of [...tickIndexes]) if (data.length - 1 - i < step * 0.7) tickIndexes.delete(i);
  if (data.length) tickIndexes.add(data.length - 1);

  const active = hover != null ? data[hover] : null;
  const pick = (clientX: number, rect: DOMRect) => {
    if (!data.length) return;
    const i = data.length <= 1 ? 0 : Math.round(((clientX - rect.left - PAD.left) / innerW) * (data.length - 1));
    setHover(Math.min(data.length - 1, Math.max(0, i)));
  };

  return (
    <div>
      {series.length > 1 ? (
        <div className="mb-3 flex flex-wrap gap-x-4 gap-y-1.5">
          {series.map((s) => (
            <span key={s.key} className="flex items-center gap-2 text-caption text-muted">
              <svg width="16" height="4" aria-hidden="true">
                <line x1="1" x2="15" y1="2" y2="2" stroke={s.color} strokeWidth="2.5" strokeDasharray={s.dash} strokeLinecap="round" />
              </svg>
              {s.label}
            </span>
          ))}
        </div>
      ) : null}

      <div ref={ref} className="relative touch-pan-y">
        {width > 0 ? (
          <svg
            width={width}
            height={height}
            role="img"
            aria-label={label}
            onMouseLeave={() => setHover(null)}
            onMouseMove={(e) => pick(e.clientX, e.currentTarget.getBoundingClientRect())}
            onTouchStart={(e) => pick(e.touches[0].clientX, e.currentTarget.getBoundingClientRect())}
            onTouchMove={(e) => pick(e.touches[0].clientX, e.currentTarget.getBoundingClientRect())}
          >
            {ticks.map((t) => (
              <g key={t}>
                <line x1={PAD.left} x2={width - PAD.right} y1={y(t)} y2={y(t)} stroke="var(--viz-grid)" strokeWidth={1} />
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
              <line x1={x(hover)} x2={x(hover)} y1={PAD.top} y2={PAD.top + plotH} stroke="var(--bstrong)" strokeWidth={1} />
            ) : null}

            {series.map((s) => (
              <polyline
                key={s.key}
                points={data.map((d, i) => `${x(i)},${y(d[s.key])}`).join(" ")}
                fill="none"
                stroke={s.color}
                strokeWidth={2}
                strokeDasharray={s.dash}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            ))}

            {data.length === 1
              ? series.map((s) => <circle key={s.key} cx={x(0)} cy={y(data[0][s.key])} r={4} fill={s.color} />)
              : null}

            {hover != null && active
              ? series.map((s) => (
                  <circle key={s.key} cx={x(hover)} cy={y(active[s.key])} r={4.5} fill={s.color} stroke="var(--panel)" strokeWidth={2} />
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
              left: Math.min(Math.max(x(hover) - 80, 0), Math.max(0, width - 176)),
              minWidth: 160,
            }}
          >
            <div className="font-mono mb-1 text-label tracking-[.06em] text-faint">
              {shortDay(active.day).toUpperCase()}
              {unit ? ` · ${unit}` : ""}
            </div>
            {series.map((s) => (
              <div key={s.key} className="flex items-center justify-between gap-4">
                <span className="flex items-center gap-2 text-muted">
                  <span className="h-[3px] w-[10px] rounded-full" style={{ background: s.color }} />
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
    </div>
  );
}

/**
 * A tiny one-series trend for a KPI tile. No axes (the tile's number is the
 * headline); hovering or touching reads the day's value out in place of the
 * caption, so the line is never decoration-only.
 */
export function Sparkline({
  values,
  days,
  color,
  onHover,
}: {
  values: number[];
  days: string[];
  color: string;
  onHover?: (text: string | null) => void;
}) {
  const [ref, width] = useWidth<HTMLDivElement>();
  const [hover, setHover] = useState<number | null>(null);
  const H = 30;
  const max = Math.max(1, ...values);
  const x = (i: number) => (values.length <= 1 ? width / 2 : 2 + (i * (width - 4)) / (values.length - 1));
  const y = (v: number) => 3 + (H - 6) - (v / max) * (H - 6);
  const set = (i: number | null) => {
    setHover(i);
    onHover?.(i == null ? null : `${shortDay(days[i])}: ${values[i].toLocaleString()}`);
  };
  const pick = (clientX: number, rect: DOMRect) => {
    if (!values.length || width <= 0) return;
    const i = Math.round(((clientX - rect.left - 2) / (width - 4)) * (values.length - 1));
    set(Math.min(values.length - 1, Math.max(0, i)));
  };
  return (
    <div ref={ref} className="mt-3 touch-pan-y" style={{ height: H }}>
      {width > 0 && values.length ? (
        <svg
          width={width}
          height={H}
          aria-hidden="true"
          onMouseMove={(e) => pick(e.clientX, e.currentTarget.getBoundingClientRect())}
          onMouseLeave={() => set(null)}
          onTouchStart={(e) => pick(e.touches[0].clientX, e.currentTarget.getBoundingClientRect())}
          onTouchEnd={() => set(null)}
        >
          <polyline
            points={values.map((v, i) => `${x(i)},${y(v)}`).join(" ")}
            fill="none"
            stroke={color}
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          {hover != null ? (
            <>
              <line x1={x(hover)} x2={x(hover)} y1={0} y2={H} stroke="var(--bstrong)" strokeWidth={1} />
              <circle cx={x(hover)} cy={y(values[hover])} r={3.5} fill={color} stroke="var(--panel)" strokeWidth={2} />
            </>
          ) : null}
        </svg>
      ) : null}
    </div>
  );
}
