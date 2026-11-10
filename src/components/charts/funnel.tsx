import { VIZ_1 } from "./scale";
import { ScrollTable } from "./ScrollTable";

export interface FunnelStep {
  label: string;
  value: number;
}

const pct = (n: number, d: number) => (d > 0 ? Math.round((n / d) * 1000) / 10 : 0);

/** Step-to-step rates: of the people at step i-1, how many reached step i. */
export function funnelRates(steps: FunnelStep[]) {
  return steps.map((s, i) => ({
    ...s,
    ofTotal: pct(s.value, steps[0]?.value ?? 0),
    fromPrev: i === 0 ? 100 : pct(s.value, steps[i - 1].value),
    dropped: i === 0 ? 0 : Math.max(0, steps[i - 1].value - s.value),
  }));
}

/**
 * A funnel: one bar per step, centred and scaled to the first step, with the
 * step-to-step conversion and the drop-off written between the bars — the
 * number that tells you where people are lost.
 */
export function FunnelChart({ steps }: { steps: FunnelStep[] }) {
  if (!steps.length || steps[0].value <= 0) {
    return <p className="py-6 text-center text-ui text-faint">No visitors recorded in this range.</p>;
  }
  const rows = funnelRates(steps);
  return (
    <ol className="flex flex-col">
      {rows.map((r, i) => (
        <li key={r.label}>
          {i > 0 ? (
            <div className="flex items-center justify-center gap-2 py-1.5 text-caption">
              <span aria-hidden="true" className="text-faint">↓</span>
              <span className="font-mono text-ink">{r.fromPrev}%</span>
              <span className="text-muted">continued</span>
              {r.dropped > 0 ? <span className="font-mono text-faint">· {r.dropped.toLocaleString()} dropped</span> : null}
            </div>
          ) : null}
          <div title={`${r.label} — ${r.value.toLocaleString()} people (${r.ofTotal}% of visitors)`}>
            <div className="mb-1.5 flex items-baseline justify-between gap-3">
              <span className="min-w-0 truncate text-ui text-ink">
                <span className="font-mono mr-2 text-caption text-faint">{i + 1}</span>
                {r.label}
              </span>
              <span className="font-mono shrink-0 text-caption" style={{ color: "var(--text2)", fontVariantNumeric: "tabular-nums" }}>
                {r.value.toLocaleString()} · {r.ofTotal}%
              </span>
            </div>
            <div className="flex h-[22px] w-full justify-center rounded-[6px]" style={{ background: "var(--viz-track)" }}>
              <div
                className="h-full rounded-[6px]"
                style={{ width: `${Math.max(1.5, r.ofTotal)}%`, background: VIZ_1 }}
              />
            </div>
          </div>
        </li>
      ))}
    </ol>
  );
}

export function FunnelTable({ steps }: { steps: FunnelStep[] }) {
  return (
    <ScrollTable
      head={["Step", "People", "Of visitors", "From previous step"]}
      rows={funnelRates(steps).map((r, i) => [r.label, r.value.toLocaleString(), `${r.ofTotal}%`, i === 0 ? "—" : `${r.fromPrev}%`])}
      numericFrom={1}
    />
  );
}
