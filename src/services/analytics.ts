import { api } from "./http";

/** Shape of `GET /api/admin/analytics/summary?days=` — mirrors the backend contract. */
export interface AnalyticsTotals {
  pageviews: number;
  clicks: number;
  visitors: number;
  leads: number;
}

export interface AnalyticsSummary {
  range: { from: string; to: string; days: number };
  totals: AnalyticsTotals;
  /** Same totals for the window immediately before this one. */
  previous: AnalyticsTotals;
  daily: { day: string; pageviews: number; clicks: number }[];
  topPages: { path: string; views: number }[];
  topClicks: { label: string; clicks: number }[];
  topReferrers: { referrer: string; count: number }[];
  devices: { device: string; count: number }[];
}

export type AnalyticsRange = 7 | 30 | 90 | 365;

export function fetchSummary(days: AnalyticsRange | number) {
  return api.get<AnalyticsSummary>(`/admin/analytics/summary?days=${days}`);
}

/** ISO `YYYY-MM-DD` for a date, in local terms (the backend's day keys are local days). */
function isoDay(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/**
 * The API omits days with no events (and returns `daily: []` on a brand-new
 * install). Charts need a continuous axis, so pad the range out to one point per
 * day with explicit zeros — an empty range then renders a real dated axis with a
 * flat line on the baseline rather than an empty box.
 */
export function fillDaily(
  range: { from: string; to: string; days: number },
  daily: { day: string; pageviews: number; clicks: number }[],
): { day: string; pageviews: number; clicks: number }[] {
  const byDay = new Map(daily.map((d) => [d.day, d]));
  const start = new Date(`${range.from}T00:00:00`);
  const end = new Date(`${range.to}T00:00:00`);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return daily;

  const out: { day: string; pageviews: number; clicks: number }[] = [];
  // Cap the loop so a nonsense range can never spin.
  for (let d = new Date(start), guard = 0; d <= end && guard < 400; d.setDate(d.getDate() + 1), guard++) {
    const key = isoDay(d);
    out.push(byDay.get(key) ?? { day: key, pageviews: 0, clicks: 0 });
  }
  return out;
}


/* ------------------------------------------------------- derived reporting */

export interface Delta {
  /** Percent change vs the previous window, or null when there is no baseline. */
  pct: number | null;
  direction: "up" | "down" | "flat";
  label: string;
}

/**
 * Period-over-period change. A zero baseline yields no percentage rather than
 * "+100%" or Infinity — going from 0 to 5 is not a percentage story, so the
 * caption says so in words instead.
 */
export function delta(current: number, previous: number): Delta {
  if (previous <= 0) {
    if (current <= 0) return { pct: null, direction: "flat", label: "no prior data" };
    return { pct: null, direction: "up", label: "new this period" };
  }
  const pct = ((current - previous) / previous) * 100;
  const rounded = Math.round(pct * 10) / 10;
  if (Math.abs(rounded) < 0.1) return { pct: 0, direction: "flat", label: "no change" };
  return {
    pct: rounded,
    direction: rounded > 0 ? "up" : "down",
    label: `${rounded > 0 ? "+" : ""}${rounded}% vs previous`,
  };
}

export interface TrafficSource {
  label: string;
  events: number;
  share: number;
  color: string;
}

/**
 * Groups raw referrer hosts into the channel buckets the design export shows,
 * so the card answers "where does traffic come from?" rather than listing every
 * host. `Direct` is inferred: the API only returns events that carried a
 * referrer, so anything unaccounted for arrived without one.
 */
const SEARCH = /(^|\.)(google|bing|duckduckgo|yahoo|yandex|ecosia|baidu)\./i;
const SOCIAL = /(^|\.)(facebook|linkedin|t\.co|twitter|x|instagram|tiktok|youtube|pinterest|reddit|snapchat)\./i;

export function classifySources(
  referrers: { referrer: string; count: number }[],
  pageviews: number,
): TrafficSource[] {
  const buckets = new Map<string, number>([
    ["Organic search", 0],
    ["Social", 0],
    ["Referral", 0],
  ]);

  let attributed = 0;
  for (const r of referrers) {
    let host = r.referrer;
    try {
      host = new URL(r.referrer).host;
    } catch {
      /* already a bare host */
    }
    const key = SEARCH.test(host) ? "Organic search" : SOCIAL.test(host) ? "Social" : "Referral";
    buckets.set(key, (buckets.get(key) ?? 0) + r.count);
    attributed += r.count;
  }

  buckets.set("Direct", Math.max(0, pageviews - attributed));

  const colors: Record<string, string> = {
    "Organic search": "var(--viz-1)",
    Social: "var(--viz-2)",
    Direct: "var(--viz-3)",
    Referral: "var(--viz-4)",
  };

  const total = [...buckets.values()].reduce((a, b) => a + b, 0) || 1;
  return [...buckets.entries()]
    .filter(([, v]) => v > 0)
    .sort((a, b) => b[1] - a[1])
    .map(([label, events]) => ({
      label,
      events,
      share: Math.round((events / total) * 1000) / 10,
      color: colors[label] ?? "var(--text3)",
    }));
}

/** Escapes a CSV field — quotes, commas and newlines all need wrapping. */
function csvField(value: string | number): string {
  const s = String(value);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

/**
 * Builds a single CSV of everything on screen. Exporting the *rendered* slice
 * (rather than re-querying) guarantees the file matches what was reviewed.
 */
export function summaryToCsv(data: AnalyticsSummary): string {
  const lines: string[] = [];
  const section = (title: string, head: string[], rows: (string | number)[][]) => {
    lines.push(title, head.join(","));
    rows.forEach((r) => lines.push(r.map(csvField).join(",")));
    lines.push("");
  };

  section("Range", ["from", "to", "days"], [[data.range.from, data.range.to, data.range.days]]);
  section(
    "Totals",
    ["metric", "current", "previous"],
    (["pageviews", "clicks", "visitors", "leads"] as const).map((k) => [
      k,
      data.totals[k],
      data.previous[k],
    ]),
  );
  section("Daily", ["day", "pageviews", "clicks"], data.daily.map((d) => [d.day, d.pageviews, d.clicks]));
  section("Top pages", ["path", "views"], data.topPages.map((p) => [p.path, p.views]));
  section("Top controls", ["label", "clicks"], data.topClicks.map((c) => [c.label, c.clicks]));
  section("Referrers", ["referrer", "events"], data.topReferrers.map((r) => [r.referrer, r.count]));
  section("Devices", ["device", "events"], data.devices.map((d) => [d.device, d.count]));
  return lines.join("\n");
}
