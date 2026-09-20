import { api } from "./http";

/** Shape of `GET /api/admin/analytics/summary?days=` — mirrors the backend contract. */
export interface AnalyticsSummary {
  range: { from: string; to: string; days: number };
  totals: { pageviews: number; clicks: number; visitors: number; leads: number };
  daily: { day: string; pageviews: number; clicks: number }[];
  topPages: { path: string; views: number }[];
  topClicks: { label: string; clicks: number }[];
  topReferrers: { referrer: string; count: number }[];
  devices: { device: string; count: number }[];
}

export type AnalyticsRange = 7 | 30 | 90;

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
