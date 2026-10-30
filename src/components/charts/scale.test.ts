import { describe, expect, it } from "vitest";
import { compact, niceMax, shortDay } from "./scale";

describe("compact", () => {
  it("abbreviates from ten thousand up, dropping a trailing .0", () => {
    expect(compact(12_900)).toBe("12.9K");
    expect(compact(20_000)).toBe("20K");
    expect(compact(3_400_000)).toBe("3.4M");
    expect(compact(-15_000)).toBe("-15K");
  });

  it("shows a dash for a non-finite value", () => {
    expect(compact(Number.NaN)).toBe("—");
    expect(compact(Number.POSITIVE_INFINITY)).toBe("—");
  });
});

describe("niceMax", () => {
  it.each([
    [230, 250],
    [1, 1],
    [7, 8],
    [11, 12],
    [999, 1000],
    [0.3, 0.3],
  ])("rounds a peak of %d up to %d", (peak, expected) => {
    expect(niceMax(peak)).toBeCloseTo(expected);
  });

  it("gives an empty chart a small default axis", () => {
    expect(niceMax(0)).toBe(4);
    expect(niceMax(-5)).toBe(4);
  });
});

describe("shortDay", () => {
  it("returns an unparseable day unchanged", () => {
    expect(shortDay("not-a-day")).toBe("not-a-day");
  });

  it("formats a valid ISO day without the year", () => {
    expect(shortDay("2026-03-07")).toMatch(/7/);
    expect(shortDay("2026-03-07")).not.toMatch(/2026/);
  });
});
