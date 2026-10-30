import { describe, expect, it } from "vitest";
import { classifySources, delta, fillDaily, summaryToCsv, type AnalyticsSummary } from "./analytics";

describe("fillDaily", () => {
  it("pads missing days with zeros so the chart axis is continuous", () => {
    const out = fillDaily({ from: "2026-03-01", to: "2026-03-04", days: 4 }, [
      { day: "2026-03-02", pageviews: 5, clicks: 1 },
    ]);
    expect(out).toEqual([
      { day: "2026-03-01", pageviews: 0, clicks: 0 },
      { day: "2026-03-02", pageviews: 5, clicks: 1 },
      { day: "2026-03-03", pageviews: 0, clicks: 0 },
      { day: "2026-03-04", pageviews: 0, clicks: 0 },
    ]);
  });

  it("crosses month boundaries", () => {
    const out = fillDaily({ from: "2026-02-27", to: "2026-03-01", days: 3 }, []);
    expect(out.map((d) => d.day)).toEqual(["2026-02-27", "2026-02-28", "2026-03-01"]);
  });

  it("returns the input unchanged for an unparseable range", () => {
    const daily = [{ day: "x", pageviews: 1, clicks: 0 }];
    expect(fillDaily({ from: "nope", to: "2026-03-01", days: 1 }, daily)).toBe(daily);
  });

  it("caps a nonsense range instead of looping for years", () => {
    expect(fillDaily({ from: "2000-01-01", to: "2026-01-01", days: 0 }, [])).toHaveLength(400);
  });
});

describe("delta", () => {
  it("reports a rounded percentage change", () => {
    expect(delta(150, 100)).toEqual({ pct: 50, direction: "up", label: "+50% vs previous" });
    expect(delta(2, 3)).toEqual({ pct: -33.3, direction: "down", label: "-33.3% vs previous" });
  });

  it("calls a tiny change no change", () => {
    expect(delta(10000, 10001)).toEqual({ pct: 0, direction: "flat", label: "no change" });
  });

  it("gives no percentage against a zero baseline", () => {
    expect(delta(5, 0)).toEqual({ pct: null, direction: "up", label: "new this period" });
    expect(delta(0, 0)).toEqual({ pct: null, direction: "flat", label: "no prior data" });
  });
});

describe("classifySources", () => {
  it("buckets referrers into channels and infers Direct from the remainder", () => {
    const out = classifySources(
      [
        { referrer: "https://www.google.com/search?q=kf", count: 30 },
        { referrer: "www.linkedin.com", count: 10 },
        { referrer: "https://blog.example.org/post", count: 10 },
      ],
      100,
    );
    expect(out.map(({ label, events, share }) => ({ label, events, share }))).toEqual([
      { label: "Direct", events: 50, share: 50 },
      { label: "Organic search", events: 30, share: 30 },
      { label: "Social", events: 10, share: 10 },
      { label: "Referral", events: 10, share: 10 },
    ]);
  });

  it("omits empty buckets and never reports negative direct traffic", () => {
    const out = classifySources([{ referrer: "https://duckduckgo.com/", count: 8 }], 5);
    expect(out).toEqual([{ label: "Organic search", events: 8, share: 100, color: "var(--viz-1)" }]);
  });

  it("returns nothing when there is no traffic", () => {
    expect(classifySources([], 0)).toEqual([]);
  });
});

describe("summaryToCsv", () => {
  const summary: AnalyticsSummary = {
    range: { from: "2026-03-01", to: "2026-03-02", days: 2 },
    totals: { pageviews: 10, clicks: 2, visitors: 4, leads: 1 },
    previous: { pageviews: 5, clicks: 1, visitors: 2, leads: 0 },
    daily: [{ day: "2026-03-01", pageviews: 10, clicks: 2 }],
    topPages: [{ path: "/services", views: 6 }],
    topClicks: [{ label: 'Say "hi", now', clicks: 2 }],
    topReferrers: [],
    devices: [{ device: "mobile", count: 7 }],
  };

  it("writes one titled section per table", () => {
    const csv = summaryToCsv(summary);
    expect(csv).toContain("Totals\nmetric,current,previous\npageviews,10,5\nclicks,2,1\nvisitors,4,2\nleads,1,0\n");
    expect(csv).toContain("Top pages\npath,views\n/services,6\n");
    expect(csv).toContain("Referrers\nreferrer,events\n\n");
  });

  it("quotes fields containing commas or quotes", () => {
    expect(summaryToCsv(summary)).toContain('"Say ""hi"", now",2');
  });
});
