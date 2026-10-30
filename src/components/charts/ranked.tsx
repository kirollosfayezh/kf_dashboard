import { VIZ_1 } from "./scale";
import { ScrollTable } from "./ScrollTable";

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
