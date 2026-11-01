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
export function niceMax(value: number): number {
  if (value <= 0) return 4;
  const base = Math.pow(10, Math.floor(Math.log10(value)));
  const frac = value / base;
  const step = NICE_STEPS.find((s) => frac <= s + 1e-9) ?? 10;
  return step * base;
}

/** "3 Mar" from an ISO day; an unparseable value is shown as-is. */
export function shortDay(iso: string): string {
  const d = new Date(`${iso}T00:00:00`);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString(undefined, { day: "numeric", month: "short" });
}
