import { useState } from "react";
import { ScrollTable } from "./ScrollTable";

export interface HeatCell {
  /** 1 = Sunday … 7 = Saturday (MongoDB's $dayOfWeek). */
  day: number;
  hour: number;
  pageviews: number;
}

export const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const HOURS = Array.from({ length: 24 }, (_, h) => h);
const hh = (h: number) => `${String(h % 24).padStart(2, "0")}:00`;

/**
 * Sequential ramp: ONE hue (the brand orange) stepped light→strong by mixing
 * it into the panel surface, so lightness is monotonic in both themes. Five
 * bins plus an empty step; zero is the track colour, never a hue.
 */
const RAMP = [18, 34, 52, 72, 100];
function binColor(v: number, max: number): string {
  if (v <= 0 || max <= 0) return "var(--viz-track)";
  const bin = Math.min(RAMP.length - 1, Math.floor((v / max) * RAMP.length - 1e-9));
  return `color-mix(in oklab, var(--viz-1) ${RAMP[bin]}%, var(--panel))`;
}

/** Grid lookup: grid[day-1][hour]. */
export function heatGrid(cells: HeatCell[]): number[][] {
  const g = Array.from({ length: 7 }, () => Array<number>(24).fill(0));
  for (const c of cells) if (c.day >= 1 && c.day <= 7 && c.hour >= 0 && c.hour < 24) g[c.day - 1][c.hour] += c.pageviews;
  return g;
}

/**
 * The busiest run of `span` consecutive hours on one weekday — the one-line
 * answer to "when should the ads run / who should be on chat?". Null when empty.
 */
export function busiestWindow(cells: HeatCell[], span = 2): { day: number; hour: number; pageviews: number } | null {
  const g = heatGrid(cells);
  let best: { day: number; hour: number; pageviews: number } | null = null;
  for (let d = 0; d < 7; d++) {
    for (let h = 0; h + span <= 24; h++) {
      let sum = 0;
      for (let k = 0; k < span; k++) sum += g[d][h + k];
      if (sum > 0 && (!best || sum > best.pageviews)) best = { day: d + 1, hour: h, pageviews: sum };
    }
  }
  return best;
}

export function describeWindow(w: { day: number; hour: number } | null, span = 2): string {
  return w ? `${WEEKDAYS[w.day - 1]} ${hh(w.hour)}–${hh(w.hour + span)}` : "—";
}

/** Weekday × hour heatmap (Cairo time) with a per-cell tooltip and a less→more key. */
export function WeekHeatmap({ cells }: { cells: HeatCell[] }) {
  const [hover, setHover] = useState<{ d: number; h: number } | null>(null);
  const g = heatGrid(cells);
  const max = Math.max(0, ...g.flat());
  if (max === 0) {
    return <p className="py-6 text-center text-ui text-faint">No pageviews recorded in this range.</p>;
  }
  const v = hover ? g[hover.d][hover.h] : 0;
  return (
    <div>
      <div className="relative">
        <div className="grid items-center gap-[3px]" style={{ gridTemplateColumns: "30px repeat(24, minmax(0, 1fr))" }}>
          {WEEKDAYS.map((name, d) => (
            <div key={name} className="contents">
              <span className="font-mono text-label text-faint">{name}</span>
              {HOURS.map((h) => (
                <div
                  key={h}
                  role="img"
                  aria-label={`${name} ${hh(h)}: ${g[d][h]} pageviews`}
                  onMouseEnter={() => setHover({ d, h })}
                  onMouseLeave={() => setHover(null)}
                  onClick={() => setHover({ d, h })}
                  className="aspect-square min-h-[9px] rounded-[3px]"
                  style={{
                    background: binColor(g[d][h], max),
                    outline: hover && hover.d === d && hover.h === h ? "2px solid var(--text)" : undefined,
                    outlineOffset: 1,
                  }}
                />
              ))}
            </div>
          ))}
          <span />
          {HOURS.map((h) => (
            <span key={h} className="font-mono text-center text-label text-faint" style={{ visibility: h % 6 === 0 ? "visible" : "hidden" }}>
              {String(h).padStart(2, "0")}
            </span>
          ))}
        </div>
      </div>
      <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
        <div className="font-mono min-h-[18px] text-caption text-muted" aria-live="polite">
          {hover ? (
            <>
              {WEEKDAYS[hover.d]} {hh(hover.h)}–{hh(hover.h + 1)} · <span className="text-ink">{v.toLocaleString()}</span> pageviews
            </>
          ) : (
            "Hover or tap a square for its count."
          )}
        </div>
        <div className="flex items-center gap-1.5 text-label text-faint">
          Less
          {[0, ...RAMP].map((p, i) => (
            <span
              key={p}
              className="h-[10px] w-[10px] rounded-[2px]"
              style={{ background: i === 0 ? "var(--viz-track)" : `color-mix(in oklab, var(--viz-1) ${p}%, var(--panel))` }}
            />
          ))}
          More
        </div>
      </div>
    </div>
  );
}

/** Table twin: every weekday row, hour columns. */
export function WeekHeatmapTable({ cells }: { cells: HeatCell[] }) {
  const g = heatGrid(cells);
  return (
    <ScrollTable
      head={["Day", ...HOURS.map((h) => String(h).padStart(2, "0")), "Total"]}
      rows={WEEKDAYS.map((name, d) => [name, ...g[d].map(String), g[d].reduce((a, b) => a + b, 0).toLocaleString()])}
      numericFrom={1}
    />
  );
}
