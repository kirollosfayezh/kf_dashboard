import { ScrollTable } from "./ScrollTable";

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
