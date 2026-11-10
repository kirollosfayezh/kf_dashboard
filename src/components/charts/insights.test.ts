import { describe, expect, it } from "vitest";
import { busiestWindow, describeWindow, heatGrid } from "./heatmap";
import { funnelRates } from "./funnel";
import { timeOnSite } from "@/components/analytics-insights";

describe("heatmap helpers", () => {
  it("places cells by weekday (1 = Sunday) and hour", () => {
    const g = heatGrid([{ day: 3, hour: 20, pageviews: 5 }, { day: 9, hour: 1, pageviews: 99 }]);
    expect(g[2][20]).toBe(5);
    expect(g.flat().reduce((a, b) => a + b, 0)).toBe(5); // out-of-range day ignored
  });

  it("finds the busiest two-hour run on one day", () => {
    const best = busiestWindow([
      { day: 3, hour: 20, pageviews: 5 },
      { day: 3, hour: 21, pageviews: 6 },
      { day: 5, hour: 9, pageviews: 10 },
    ]);
    expect(best).toEqual({ day: 3, hour: 20, pageviews: 11 });
    expect(describeWindow(best)).toBe("Tue 20:00–22:00");
  });

  it("returns null and a dash when there is nothing", () => {
    expect(busiestWindow([])).toBeNull();
    expect(describeWindow(null)).toBe("—");
  });
});

describe("funnelRates", () => {
  it("gives share of total and step-to-step continuation", () => {
    const r = funnelRates([
      { label: "a", value: 200 },
      { label: "b", value: 100 },
      { label: "c", value: 25 },
      { label: "d", value: 0 },
    ]);
    expect(r.map((s) => s.ofTotal)).toEqual([100, 50, 12.5, 0]);
    expect(r.map((s) => s.fromPrev)).toEqual([100, 50, 25, 0]);
    expect(r.map((s) => s.dropped)).toEqual([0, 100, 75, 25]);
  });

  it("does not divide by zero", () => {
    expect(funnelRates([{ label: "a", value: 0 }, { label: "b", value: 0 }])[1].fromPrev).toBe(0);
  });
});

describe("timeOnSite", () => {
  it("reads like a sentence", () => {
    expect(timeOnSite(2, 1)).toBe("one quick look");
    expect(timeOnSite(42, 1)).toBe("42s on site");
    expect(timeOnSite(250, 1)).toBe("4m 10s on site");
    expect(timeOnSite(4000, 1)).toBe("1h 6m on site");
    expect(timeOnSite(90000, 3)).toBe("active on 3 days");
  });
});
